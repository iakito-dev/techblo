# Architecture Overview

## 全体像

```
                      ┌───────────────────────────────────────┐
                      │            User (Browser)             │
                      └───────────────┬───────────────────────┘
                                      │ HTTP
                                      ↓
              ┌───────────────────────────────────────────────┐
              │     Vercel Edge / Next.js 16 (App Router)     │
              │                                                │
              │  ┌─────────────────────────────────────────┐  │
              │  │  Presentation (RSC + Client Components) │  │
              │  └─────────────────────────────────────────┘  │
              │              ↓                ↑               │
              │  ┌─────────────────┐ ┌─────────────────┐     │
              │  │ Server Actions  │ │ Route Handlers  │     │
              │  │ (features/X/    │ │ (app/api/*)     │     │
              │  │  web/actions.ts)│ │                 │     │
              │  └─────────────────┘ └─────────────────┘     │
              │              ↓                ↓               │
              │  ┌─────────────────────────────────────────┐  │
              │  │ Web composition root                    │  │
              │  │   (features/X/web/queries.ts)           │  │
              │  └─────────────────────────────────────────┘  │
              │              ↓                                 │
              │  ┌─────────────────────────────────────────┐  │
              │  │ Application (features/X/application:     │  │
              │  │   usecase + dto)                        │  │
              │  └─────────────────────────────────────────┘  │
              │              ↓                                 │
              │  ┌─────────────────────────────────────────┐  │
              │  │ Domain (features/X/domain:              │  │
              │  │   entity/VO/Repository interface)       │  │
              │  └─────────────────────────────────────────┘  │
              │              ↑ implements                      │
              │  ┌─────────────────────────────────────────┐  │
              │  │ Infrastructure (features/X/infrastructure│  │
              │  │   = Drizzle Repo; db, auth, rss, ai)    │  │
              │  └─────────────────────────────────────────┘  │
              └───────────────────────────────────────────────┘
                              ↓                   ↓
                  ┌───────────────────┐   ┌───────────────┐
                  │ Supabase Postgres │   │ External APIs │
                  │ (東京 / pgbouncer)│   │ (RSS, OGP)    │
                  └───────────────────┘   └───────────────┘
                              ↑
                  ┌───────────────────────┐
                  │  Trigger.dev v4       │
                  │  (RSS poller cron)    │
                  └───────────────────────┘
                              ↓
                  ┌───────────────────────┐
                  │ Sentry + PostHog      │
                  │ (Observability)       │
                  └───────────────────────┘
```

## リクエストパターン別の流れ

### 1. 公開ページ閲覧(未ログイン)

```
Browser ─GET /─→ Vercel Edge
                     ↓
            [middleware.ts] (session check, ログインなしならpublic扱い)
                     ↓
            [app/(public)/page.tsx] (RSC)
                     ↓
            [features/feed/web/queries.ts: getFeed({ sort: 'latest' })] ← composition root
                     ↓ (application usecase → domain Repository(Port))
            [getFeed は 'use cache'(tag: feed)。miss 時のみ Drizzle Repo が count/list を並列実行]
                     ↓
            [Supabase Postgres]
                     ↓
            HTML stream (PPR: shell→static, articles→dynamic)
                     ↓ ↓ ↓
                  Browser に段階表示
```

### 2. 認証必要ページ閲覧(ログイン済み)

```
Browser ─GET /bookmarks─→ Vercel Edge
                              ↓
                  [middleware.ts] session 検証
                              ↓
                  未認証なら → 302 /login
                  認証済みなら → 続行
                              ↓
                  [app/(auth)/bookmarks/page.tsx] (RSC)
                              ↓
                  [features/auth/server.ts: requireSession()]
                              ↓
                  [features/bookmarks/web/queries.ts: listBookmarks(userId)] ← composition root
                              ↓ (application usecase → infrastructure Repository)
                  [Supabase Postgres, no cache (個人化データ)]
                              ↓
                  HTML stream
```

### 3. ミューテーション(Server Action)

```
Client Form ─FormData→ [Server Action: features/bookmarks/web/actions.ts createBookmark]
                              ↓
                  Zod validate(input)
                              ↓
                  features/auth/server.ts: requireSession()
                              ↓
                  features/bookmarks/application: addBookmark usecase
                    (認可ルール・ビジネスルールは domain、Repository は引数注入)
                              ↓
                  features/bookmarks/infrastructure: BookmarkRepository.insert(...)
                              ↓
                  revalidatePath('/bookmarks')
                              ↓
                  Result<void, BookmarkError> を返却
                              ↓
            Client で useOptimistic がコミット
            または失敗時にロールバック
```

### 4. バックグラウンドジョブ(RSS取得)

```
Cron(毎時) → [Trigger.dev v4]
                  ↓
        [jobs/fetch-all-feeds.ts]
                  ↓
        SELECT companies WHERE enabled = true
                  ↓
        for each company in parallel (max 20):
            [jobs/refresh-company-feed.ts]
                  ↓
            lib/rss/fetcher.ts (timeout 10s, retry 3)
                  ↓
            lib/rss/parser.ts (Zod validate)
                  ↓
            lib/ogp/extractor.ts (description補完)
                  ↓
            db.insert(articles).onConflictDoUpdate(...)
                  ↓
            UPDATE companies SET last_fetched_at = NOW()
                  ↓
        Promise.allSettled で全社結果収集
                  ↓
        revalidateTag('feed') ← edge cache無効化
                  ↓
        Sentry + Trigger.dev dashboard で記録
```

## 依存方向(厳格)

```
┌─────────────────────────────────────────────┐
│ app/            ← Next.js routes            │
│  └→ features/{X}/web/{queries,actions}      │
├─────────────────────────────────────────────┤
│ features/{X}/   ← 機能モジュール(4層)      │
│  web/           ← composition root / UI     │
│    └→ application, domain, components/ui     │
│  infrastructure/← Drizzle Repo 実装(db可)  │
│    └→ application, domain, db/, lib/         │
│  application/   ← usecase + dto             │
│    └→ domain                                 │
│  domain/        ← 純粋TS(依存ゼロ)         │
│    └→ (next/react/drizzle/db/lib を import禁止)│
├─────────────────────────────────────────────┤
│ shared/         ← 横断pureロジック          │
│  └→ (依存なし、Pureのみ)                    │
├─────────────────────────────────────────────┤
│ db/, lib/       ← Infrastructure            │
│  └→ external (Drizzle, Better Auth, etc.)   │
└─────────────────────────────────────────────┘

依存方向は内向きのみ: web / infrastructure → application → domain
(ADR-0010、`bun run depcruise` で自動強制)

禁止される依存:
✗ features/A → features/B
✗ feature 内の逆流(domain → application/infrastructure/web, application → infrastructure/web)
✗ domain → next/react/drizzle/db/lib
✗ db 直接 import を infrastructure 以外で行う
✗ shared → features/*
✗ shared → db/, lib/
✗ db/ → features/*
✗ lib/ → features/*
✗ components/ui/ → features/*
✗ app/ → db/, lib/ 直接 (必ず features/web/ 経由)
```

## レンダリングモード

| ルート | モード | キャッシュ |
|---|---|---|
| `/` | PPR (shell静的 + 記事動的) | 公開フィード60s edge cache |
| `/bookmarks` | Dynamic SSR | キャッシュなし |
| `/favorites` | Dynamic SSR | キャッシュなし |
| `/settings` | Dynamic SSR | キャッシュなし |
| `/login` | Static | ビルド時生成 |
| `/api/og/[id]` | Dynamic | 1日 |
| `/api/auth/*` | Dynamic | キャッシュなし |
| `/api/trigger` | Dynamic | キャッシュなし |

## 環境別の差分

| 環境 | DB | Auth | ジョブ | 観測 |
|---|---|---|---|---|
| Local | Supabase(個人開発用プロジェクト) | Better Auth dev | Trigger.dev devモード | Console only |
| Preview | Supabase(テスト用 DB / `TEST_DATABASE_URL`) | Better Auth dev | Trigger.dev staging | Sentry preview |
| Production | Supabase 本番(東京) | Better Auth prod | Trigger.dev production | Sentry + PostHog |

> ※ Neon 時代の per-PR 自動 DB branching は廃止。テスト用は別 DB(`TEST_DATABASE_URL`)を用意する(ADR-0033)。

## 関連

- [frontend.md](./frontend.md)
- [backend.md](./backend.md)
- [shared.md](./shared.md)
