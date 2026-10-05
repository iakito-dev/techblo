# Techblo アーキテクチャ

## 1. 設計原則

| 原則 | 内容 |
|---|---|
| **Server-first** | 静的化可能なものはRSC + PPR、動的なものは Server Actions。クライアント JS は最小化 |
| **Feature-sliced** | ディレクトリは技術別ではなく **機能別**(feed / bookmarks / favorites / subscriptions / auth) |
| **依存方向の固定** | UI → Application → Domain → Infrastructure(逆流禁止) |
| **境界はpureな型** | 各レイヤー間は型(Zodスキーマ)で繋ぐ。ORMオブジェクトを上層に漏らさない |
| **失敗を前提に設計** | RSS取得失敗・OGP取得失敗を「正常系」として扱う。リトライ可能な単位で分割 |
| **観測可能性** | すべての操作にtrace、外部呼出はSpan、エラーはSentryへ |
| **キャッシュは積極的に** | 公開フィードはedge cache、個人化データはDB単位でキャッシュ |

---

## 2. レイヤー構成

```
┌────────────────────────────────────────────────────────────────┐
│  Presentation Layer (React Server/Client Components)            │
│  - app/**/page.tsx, layout.tsx                                  │
│  - components/                                                  │
└────────────────────────────────────────────────────────────────┘
                          ↓ depends on
┌────────────────────────────────────────────────────────────────┐
│  Web Layer (Driving Adapter / RSC・Server Actions)             │
│  - features/{feed,bookmarks,...}/web/queries.ts (composition)   │
│  - features/{feed,bookmarks,...}/web/actions.ts (Server Action) │
│  - features/{...}/web/view-models, web/components               │
└────────────────────────────────────────────────────────────────┘
                          ↓ depends on
┌────────────────────────────────────────────────────────────────┐
│  Application Layer (use-cases)                                  │
│  - features/{...}/application/*.ts (ユースケース、依存は引数注入)│
│  - features/{...}/application/dto.ts (Command/Query/表示DTO)    │
└────────────────────────────────────────────────────────────────┘
                          ↓ depends on
┌────────────────────────────────────────────────────────────────┐
│  Domain Layer (型・ビジネスルール)                             │
│  - features/{...}/domain/*.ts (entity / value object)           │
│  - features/{...}/domain (domain service, Repository interface) │
└────────────────────────────────────────────────────────────────┘
                          ↓ depends on
┌────────────────────────────────────────────────────────────────┐
│  Infrastructure Layer (外部依存の実装)                          │
│  - features/{...}/infrastructure/*.ts (Drizzle Repo 実装・mapper)│
│  - db/ (Drizzle schema, client)                                 │
│  - auth/ (Better Auth)                                          │
│  - rss/ (parser, fetcher)                                       │
│  - jobs/ (Trigger.dev tasks)                                    │
│  - lib/ (ai, ogp, observability)                                │
└────────────────────────────────────────────────────────────────┘
```

**逆流禁止ルール**(ADR-0010、`bun run depcruise` で自動強制)
- 依存方向は内向きのみ: web / infrastructure → application → domain
- Domain は Infrastructure を import しない(Repository は domain の Driven Port、実装は infrastructure)
- Presentation(web)は直接 Infrastructure を呼ばず application 経由(組立は web/queries.ts の composition root)
- `db/` を import してよいのは infrastructure 層のみ
- features/A は features/B を import しない(共有は shared/ へ)
- lib は features を import しない(逆流禁止)

---

## 3. ディレクトリ構造

```
techblo/
├── app/                              # Next.js App Router
│   ├── (public)/                     # 認証不要画面
│   │   ├── page.tsx                  # トップ(フィード)
│   │   └── layout.tsx
│   ├── (auth)/                       # 認証必要画面
│   │   ├── bookmarks/page.tsx
│   │   ├── favorites/page.tsx
│   │   ├── settings/page.tsx
│   │   └── layout.tsx                # auth guard
│   ├── api/
│   │   ├── auth/[...all]/route.ts    # Better Auth handler
│   │   ├── og/[id]/route.ts          # OGPプレースホルダー画像生成
│   │   └── trigger/route.ts          # Trigger.dev webhook
│   ├── globals.css
│   └── layout.tsx
│
├── features/                         # 機能別モジュール(各 feature を4層に分割: ADR-0010)
│   ├── feed/
│   │   ├── domain/                   # 純粋TS(entity/VO/domain service/Repository interface)
│   │   ├── application/              # ユースケース(依存は引数注入)+ dto.ts
│   │   ├── infrastructure/           # Drizzle 実装(Repository)・mapper(db を import可)
│   │   └── web/                      # queries.ts(composition root)/actions.ts/view-models/components
│   ├── bookmarks/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── web/                      # web/queries.ts, web/actions.ts(add/remove/list), components
│   ├── favorites/                    # bookmarks と同形
│   ├── subscriptions/                # 購読企業ON/OFF
│   ├── health/                       # ヘルスチェック(GET /api/healthz)
│   └── auth/
│       ├── components/               # LoginButton, AuthGate
│       ├── server.ts                 # getSession等のヘルパー
│       └── client.ts                 # useSession等
│
├── components/                       # 機能横断のUI primitives
│   ├── ui/                           # shadcn/ui (Button, Card, ...)
│   └── layout/                       # Header, MobileNav, Sidebar
│
├── db/                               # Infrastructure: DB
│   ├── schema/                       # Drizzle schemas
│   │   ├── companies.ts
│   │   ├── articles.ts
│   │   ├── users.ts
│   │   ├── bookmarks.ts
│   │   ├── favorites.ts
│   │   └── subscriptions.ts
│   ├── client.ts                     # drizzle インスタンス
│   └── migrations/
│
├── lib/                              # Infrastructure: 横断
│   ├── auth.ts                       # Better Auth 設定
│   ├── rss/
│   │   ├── parser.ts                 # XML → Article[]
│   │   ├── fetcher.ts                # HTTP + retry
│   │   └── adapters/                 # 企業ごとの正規化処理
│   ├── ogp/
│   │   └── extractor.ts              # description/og:image取得
│   ├── ai/                           # 将来: AI要約
│   ├── observability/
│   │   ├── sentry.ts
│   │   └── posthog.ts
│   └── env.ts                        # @t3-oss/env-nextjs で型付け
│
├── jobs/                             # Trigger.dev タスク
│   ├── fetch-all-feeds.ts            # 毎時実行
│   ├── refresh-company-feed.ts       # 1社単位
│   └── trigger.config.ts
│
├── shared/                           # features横断の共有モジュール
│   ├── result.ts                     # Result<T, E> 型
│   └── pagination.ts
│
├── public/
├── design/                           # モックアップ(現状)
├── drizzle.config.ts
├── biome.json
├── next.config.ts
└── package.json
```

**重要な境界**
- `features/A` は `features/B` を直接 import しない(共有は `shared/` か `components/ui/`)
- `app/` は features の `web/queries.ts` / `web/actions.ts` のみ叩く(`db/`直叩き禁止)
- `db/` への直接アクセスは各 feature の `infrastructure/` 層の Repository のみ
- `db/` のスキーマ型は domain / application の型に変換して公開(ORM型を上層に漏らさない)

---

## 4. データフロー

### 読み取り(記事一覧表示)
```
[Browser]
   ↓ GET /
[app/(public)/page.tsx (RSC)]
   ↓ await
[features/feed/web/queries.ts: getArticles({ filter })] ← composition root
   ↓ (application の usecase を組立て呼出、Result を吸収)
[features/feed/infrastructure: ArticleRepository (Drizzle)]
   ↓
[db/client.ts: drizzle.select() with cache]
   ↓
[Supabase Postgres]
```
- **PPR**: shell部分(ヘッダー・サイドバー)は静的化、記事カードは動的
- **キャッシュ**: 未ログイン時のフィードは `unstable_cache` で 60秒 edge cache

### 書き込み(ブックマーク追加)
```
[Browser: クライアントコンポーネント]
   ↓ formAction
[features/bookmarks/web/actions.ts (Server Action)]
   ↓ getSession() → ユーザー確認
[features/bookmarks/application: addBookmark usecase(認可・ビジネスルール)]
   ↓
[features/bookmarks/infrastructure: BookmarkRepository → insert into bookmarks]
   ↓
[revalidatePath('/bookmarks')]
```
- **楽観更新**: `useOptimistic` で即座にUI更新
- **冪等性**: 重複INSERTは `ON CONFLICT DO NOTHING`

### バックグラウンド(RSS取得)
```
[Trigger.dev cron: 毎時]
   ↓
[jobs/fetch-all-feeds.ts]
   ↓ for each company in DB
[jobs/refresh-company-feed.ts] ← 並列実行(20まで)
   ↓
[lib/rss/fetcher.ts: HTTP + retry 3回]
   ↓
[lib/rss/parser.ts: XML → ArticleInput[]]
   ↓
[lib/ogp/extractor.ts: OGP補完]
   ↓
[db: upsert into articles (url unique)]
```
- **失敗時**: 1社の失敗が全体を止めない(Promise.allSettled)
- **観測**: 各社の last_fetched_at と last_error を companies に記録

---

## 5. キャッシュ戦略

| 対象 | 層 | 期間 | 無効化トリガー |
|---|---|---|---|
| 公開フィード(未ログイン) | Next.js Data Cache | 60秒 | RSS取得ジョブ完了時 `revalidateTag('feed')` |
| 企業マスタ | Next.js Data Cache | 1時間 | 開発者が変更時に手動 |
| 個別記事メタ | Next.js Data Cache | 5分 | クリック数更新時 |
| ユーザー個人化データ | キャッシュなし | - | - |
| OGP画像 | next/image + 元サイトCDN | 1日 | next.config 設定 |
| ビルド時静的アセット | Vercel Edge | 永続 | デプロイ毎 |

**原則**: 公開データは積極キャッシュ、個人化データはキャッシュしない

---

## 6. 認証境界

```
[Request]
   ↓
[middleware.ts]
   ↓ session cookie 検証
   ↓ /(auth)/* なら未ログイン時 → /login へリダイレクト
   ↓
[Page (RSC)]
   ↓
[features/auth/server.ts: getSession()]
   ↓ Better Auth: { user, session } | null
   ↓
[Server Action]
   ↓ ログイン必須なら null チェック → 401
```

**ガード戦略**
- ルートレベル: middleware で `/(auth)/*` を保護
- アクションレベル: 各 Server Action 冒頭で `requireSession()` ヘルパー
- ポリシーレベル: `canBookmark(user, article)` 等で詳細制御

---

## 7. エラーハンドリング

| 種別 | 扱い |
|---|---|
| **ユーザー入力エラー** | Zod parse fail → form エラー表示 |
| **認証エラー** | Server Action から `{ error: 'UNAUTHORIZED' }` 返却、UIで処理 |
| **DB制約違反** | 冪等処理で吸収(upsert / onConflictDoNothing) |
| **RSS取得失敗** | リトライ3回 → companies.last_error に記録、次回再試行 |
| **OGP取得失敗** | プレースホルダー画像生成にフォールバック |
| **ネットワークタイムアウト** | 10秒で打ち切り、Sentryに記録 |
| **予期せぬエラー** | error boundary → Sentry へ送信 |

**Resultパターン**(shared/result.ts)
```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```
Server Action / queries は Result を返し、throw は避ける(observabilityのため)

---

## 8. 観測可能性

```
[Application]
   ├→ Sentry: エラー & トランザクション
   ├→ PostHog: ユーザー行動 & Feature Flag
   └→ Vercel Logs: アクセスログ
[Trigger.dev]
   └→ Trigger.dev Dashboard: ジョブ実行履歴
```

**監視すべきメトリクス(MVPから)**
- RSS取得成功率(企業別)
- 各社の last_fetched_at 経過時間
- ログインユーザー数(日次/週次)
- ブックマーク追加レート
- ページ表示速度(Web Vitals)

---

## 9. テスト戦略

| 種別 | ツール | 対象 |
|---|---|---|
| Unit | Vitest | features/*/policies.ts、lib/rss/parser.ts |
| Integration | Vitest + Test DB | features/*/actions.ts(`TEST_DATABASE_URL` の別インスタンスで隔離) |
| E2E | Playwright | 主要シナリオ(閲覧→ログイン→ブックマーク) |
| Visual | Storybook 8 | components/ui/*、ArticleCardの状態網羅 |

**MVPでは Unit + 主要 E2E に絞る**。Integration テストは本番と別の Test DB(`TEST_DATABASE_URL`)で実行する(ADR-0033)。

---

## 10. スケール時の対応ポイント

| ボトルネック | 対応 |
|---|---|
| Neon Free 0.5GB超 | Launch($19/月)へアップグレード、古い記事のアーカイブ |
| RSS取得が60秒超過 | Trigger.dev の並列度を上げる、企業ごとに分散 |
| 認証ユーザー50K超 | Better Auth は影響なし、DBコネクション数を確認 |
| 帯域100GB超 | OGP画像をCloudflare Imagesに移行 or Vercel Pro |
| Cold start遅延 | Vercel の Fluid Compute、Neon 起動時間最適化 |
| 全文検索が必要 | Postgres `pg_trgm` → 容量超えたら Meilisearch / Typesense |
| AI要約(将来) | Trigger.dev でバッチ、`articles.ai_summary` カラム追加 |

**移行容易性のため守ること**
- Postgres標準SQLに依存(Neon固有機能は最小限)
- DBアクセスは全て各 feature の infrastructure 層 Repository 経由(`app/` からの直接 db/ は禁止、web は composition root の web/queries.ts 経由)
- 認証は features/auth 経由(将来 Clerk 等への乗換え可)
- 外部サービスは lib/ にラップ(Trigger.dev → Inngest 等)

---

## 11. 機能追加時の手順テンプレ

新機能を追加するときの判断フロー:

1. **既存featureに収まるか?** → 既存に追加
2. **新しい features/X として独立** → `bun run scaffold:feature X` で4層雛形を生成
   - `features/X/domain/`(entity / value object / domain service / Repository interface)
   - `features/X/application/`(ユースケース + `dto.ts`)
   - `features/X/infrastructure/`(Drizzle Repository 実装・mapper)
   - `features/X/web/`(`queries.ts` composition root / `actions.ts` / `view-models/` / `components/`)
3. **DBスキーマ変更** → `db/schema/X.ts` + migration
4. **バックグラウンド処理** → `jobs/X.ts`(Trigger.dev)
5. **テスト** → `features/X/*.test.ts`

---

## 12. 採用しなかった設計選択肢(参考)

| 検討 | 不採用理由 |
|---|---|
| Clean Architecture フル実装 | 個人開発には過剰、レイヤー4つで十分 |
| Repository pattern を厳密に | Drizzle は型安全で薄いラッパーで十分、過度な抽象化を避ける |
| マイクロサービス | 個人開発でMonolithが圧倒的に有利、Server Actionsで完結 |
| GraphQL | RESTもtRPCも不要、Server Actions + RSCで型安全に完結 |
| Redux / MobX | TanStack Query + Zustand で十分、React 19の機能でさらに簡略化 |
| Hexagonal (port/adapter) | RSS取得部分のみadapter方式採用、他は単純な関数で |
