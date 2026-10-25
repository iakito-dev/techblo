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
                  │ (東京 / pgbouncer)│   │ (RSS, はてブ, │
                  │                   │   │  Gemini)      │
                  └───────────────────┘   └───────────────┘
                              ↑
                  ┌───────────────────────┐
                  │  Trigger.dev v4       │
                  │  (RSS poller cron)    │
                  └───────────────────────┘
                              ↓
                  ┌───────────────────────┐
                  │ Vercel Logs + PostHog │
                  │ (Observability)       │
                  └───────────────────────┘
```

## リクエストパターン別の流れ

### 1. 公開ページ閲覧(未ログイン)

```
Browser ─GET /─→ Vercel
                     ↓
            [app/(app)/page.tsx] (RSC。middleware は無く、ゲストもそのまま閲覧できる)
                     ↓
            [features/feed/web/queries.ts: getFeed / getFeedSections] ← composition root
                     ↓ (application usecase → domain Repository(Port))
            ['use cache' + cacheTag。miss 時のみ Drizzle Repo が DB を引く]
                     ↓
            [Supabase Postgres]
                     ↓
            HTML stream (PPR: shell→static, articles→dynamic)
```

### 2. 保存一覧の閲覧(ログイン済み)

```
Browser ─GET /bookmarks─→ Vercel
                              ↓
                  [app/(app)/bookmarks/page.tsx] (RSC)
                              ↓
                  [features/auth/server.ts: getSession()]
                    ゲストなら localStorage の保存をクライアントで表示(ADR-0017)
                              ↓
                  [features/bookmarks/web/queries.ts] ← composition root
                    ('use cache' + ユーザー別タグ / ADR-0016)
                              ↓ (application usecase → infrastructure Repository)
                  [Supabase Postgres]
                              ↓
                  HTML stream
```

### 3. ミューテーション(Server Action)

```
Client ─→ [Server Action: features/bookmarks/web/actions.ts setBookmarkAction]
                              ↓
                  getSession()(未ログインならエラーを返す)
                              ↓
                  features/bookmarks/application: usecase(Repository は引数注入)
                              ↓
                  features/bookmarks/infrastructure: BookmarkRepository
                              ↓
                  updateTag(ユーザー別タグ) + revalidatePath('/bookmarks')
                              ↓
            Client で useOptimistic がコミット
            または失敗時にロールバック
```

### 4. バックグラウンドジョブ(RSS取得)

```
Cron(毎時0分) → [Trigger.dev v4]
                  ↓
        [trigger/fetch-feed-articles.ts]
                  ↓
        [lib/rss/ingest.ts: ingestAllCompanies(sink)]
                  ↓
        enabled な全企業を Promise.allSettled で並列取得:
            lib/rss/fetcher.ts (timeout 15s + retry)
                  ↓
            lib/rss/parser.ts (Zod validate)
                  ↓
            sink = features/feed/application/upsert-articles → articles に upsert
                  ↓
            companies の last_fetched_at / 失敗状態を更新
                  ↓
        はてブ数更新 → POST /api/revalidate(Next 側で revalidateTag)
                  ↓
        logger + Trigger.dev dashboard で記録
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
✗ app/ → db/ 直接 (データは必ず features/*/web/ 経由)
```

## レンダリングモード

| ルート | モード | キャッシュ |
|---|---|---|
| `/` | PPR (shell静的 + 記事動的) | `'use cache'` + `cacheTag`(取込 cron で無効化) |
| `/a/[id]` | PPR | 記事データを `'use cache: remote'`(ADR-0042) |
| `/bookmarks` `/favorites` `/history` | PPR | ユーザー別タグでキャッシュ(ADR-0016) |
| `/settings/*` | PPR | ユーザー別タグでキャッシュ |
| `/companies/*` `/tags` | PPR | `'use cache'` |
| `/lp` | Static | ビルド時生成 |
| `/login` | PPR | 静的シェル + Suspense 内でセッション判定 |
| `/api/og/[id]` | Dynamic | 1日 |
| `/api/auth/*` `/api/revalidate` | Dynamic | キャッシュなし |

## 環境別の差分

| 環境 | DB | Auth | ジョブ | 観測 |
|---|---|---|---|---|
| Local | Supabase(個人開発用プロジェクト) | Better Auth dev | Trigger.dev devモード | Console only |
| Preview | Supabase(テスト用 DB / `TEST_DATABASE_URL`) | Better Auth dev | Trigger.dev staging | Vercel Logs(PostHog キー無し = 送信しない) |
| Production | Supabase 本番(東京) | Better Auth prod | Trigger.dev production | Vercel Logs + PostHog |

> ※ Neon 時代の per-PR 自動 DB branching は廃止。テスト用は別 DB(`TEST_DATABASE_URL`)を用意する(ADR-0033)。

## 関連

- [frontend.md](./frontend.md)
- [backend.md](./backend.md)
- [shared.md](./shared.md)
