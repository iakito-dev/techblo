# Techblo アーキテクチャ

このファイルは全体像の要約。詳細は `docs/architecture/*.md`、判断の経緯は `docs/adr/*.md` を参照。

## 1. 設計原則

| 原則 | 内容 |
|---|---|
| **Server-first** | 既定は RSC。動的な書き込みは Server Actions。クライアント JS は最小化(ADR-0003) |
| **Feature-sliced** | ディレクトリは技術別ではなく **機能別**(feed / bookmarks / favorites / subscriptions / reads / user-feeds / ai-summary / health / auth) |
| **依存方向の固定** | feature 内は `web / infrastructure → application → domain`(逆流禁止、ADR-0010) |
| **境界はpureな型** | ORM の型を上層に漏らさず、domain / application の型に変換して渡す |
| **失敗を前提に設計** | RSS 取得失敗を「正常系」として扱う。1社の失敗が全体を止めない |
| **観測可能性** | サーバーは `lib/observability/logger` の構造化ログ、ユーザー行動は PostHog(ADR-0043)。Sentry は未導入 |
| **キャッシュは積極的に** | `'use cache'` + `cacheTag` で共有データをキャッシュし、取込・保存時に `revalidateTag` で無効化(ADR-0042) |

---

## 2. レイヤー構成

```
┌────────────────────────────────────────────────────────────────┐
│  Presentation(React Server/Client Components)                 │
│  - app/**/page.tsx, layout.tsx                                  │
│  - components/(ui・layout)、app/_composition(feature 横断の合成)│
└────────────────────────────────────────────────────────────────┘
                          ↓ depends on
┌────────────────────────────────────────────────────────────────┐
│  Web(Driving Adapter / RSC・Server Actions)                   │
│  - features/*/web/queries.ts(composition root)                │
│  - features/*/web/actions.ts(Server Action)                   │
│  - features/*/web/view-models, web/components                   │
└────────────────────────────────────────────────────────────────┘
                          ↓ depends on
┌────────────────────────────────────────────────────────────────┐
│  Application(use-cases)                                       │
│  - features/*/application/*.ts(ユースケース、依存は引数注入) │
│  - features/*/application/dto.ts(Command/Query/表示DTO)       │
└────────────────────────────────────────────────────────────────┘
                          ↓ depends on
┌────────────────────────────────────────────────────────────────┐
│  Domain(型・ビジネスルール)                                   │
│  - features/*/domain/*.ts(entity / VO / domain service /       │
│    Repository interface)                                        │
└────────────────────────────────────────────────────────────────┘
                          ↑ implements
┌────────────────────────────────────────────────────────────────┐
│  Infrastructure(外部依存の実装)                               │
│  - features/*/infrastructure/*.ts(Drizzle Repository・mapper) │
│  - db/(Drizzle schema, client)                                 │
│  - lib/(auth, rss, http, hatena, ai, cache, observability)     │
│  - trigger/(Trigger.dev タスク = バッチの composition root)   │
└────────────────────────────────────────────────────────────────┘
```

**逆流禁止ルール**(ADR-0010、`bun run depcruise` で自動強制)
- 依存方向は内向きのみ: web / infrastructure → application → domain
- Domain は Infrastructure を import しない(Repository は domain の Driven Port、実装は infrastructure)
- `db/` を import してよいのは infrastructure 層のみ(`app/` からの直接 import は禁止)
- features/A は features/B を import しない(共有は `shared/` へ)
- lib は features を import しない(保存処理は sink 注入で受け取る)

---

## 3. ディレクトリ構造

```
techblo/
├── app/                              # Next.js App Router
│   ├── (app)/                        # サイドバー付きのアプリ画面(ゲストも閲覧可)
│   │   ├── page.tsx                  # トップ(フィード)
│   │   ├── a/[id]/page.tsx           # 記事ページ(ADR-0036)
│   │   ├── bookmarks/ favorites/ history/
│   │   ├── settings/                 # 設定(appearance / companies / feeds / support)
│   │   └── layout.tsx
│   ├── companies/                    # 企業一覧・企業ページ・企業別 RSS(ADR-0030 / 0039)
│   ├── tags/                         # タグ一覧(ADR-0040)
│   ├── lp/                           # ランディングページ
│   ├── login/ signup/ about/ privacy/ terms/
│   ├── feed.xml/                     # 公開 RSS(ADR-0039)
│   ├── _feed/                        # 公開 RSS の共通処理
│   ├── _composition/                 # 複数 feature をまたぐ合成(ADR-0013 / 0044)
│   │   ├── article/                  #   記事 × 保存・購読・既読の合成(Server Action・データ取得・一覧 UI)
│   │   └── sidebar.tsx               #   サイドバーの composition root
│   ├── api/
│   │   ├── auth/[...all]/route.ts    # Better Auth handler
│   │   ├── og/[id]/route.tsx         # 共有用 OG 画像(ADR-0029)
│   │   ├── revalidate/route.ts       # cron からのキャッシュ無効化(シークレット保護)
│   │   ├── healthz/route.ts          # ヘルスチェック
│   │   └── zenn-icon/route.ts
│   ├── robots.ts / sitemap.ts / manifest.ts
│   └── layout.tsx
│
├── features/                         # 機能別モジュール(4層: ADR-0010)
│   ├── feed/                         # 記事一覧・検索・タグ・カテゴリ・人気順・関連記事
│   ├── bookmarks/ favorites/         # 保存(ADR-0006)
│   ├── subscriptions/                # 購読企業 ON/OFF
│   ├── reads/                        # 既読・閲覧履歴(ADR-0021 / 0041)
│   ├── user-feeds/                   # ユーザー登録 RSS(ADR-0014)
│   ├── ai-summary/                   # AI 要約・カテゴリ分類(ADR-0026 / 0034)
│   ├── health/                       # GET /api/healthz
│   └── auth/                         # Better Auth の薄いラッパー(server.ts / client.ts / components)
│     # 各 feature: domain/ application/ infrastructure/ web/
│
├── components/
│   ├── ui/                           # shadcn/ui primitives(Radix ベース)+ CompanyFavicon
│   ├── layout/                       # Header, AppSidebar, MobileNav, BottomChrome
│   ├── seo/ legal/
│
├── db/
│   ├── schema/                       # Drizzle schemas(companies, articles, auth, bookmarks, ...)
│   ├── client.ts                     # drizzle インスタンス(postgres-js / ADR-0033)
│   └── migrations/
│
├── lib/                              # 横断 infrastructure
│   ├── auth.ts                       # Better Auth 設定
│   ├── env.ts                        # @t3-oss/env-nextjs で型付け(サーバー専用)
│   ├── rss/                          # fetcher / parser / ingest / build-feed-xml
│   ├── http/                         # timeout + retry 付き fetch、SSRF ガード
│   ├── hatena/                       # はてブ数取得(ADR-0014 / 0018)
│   ├── ai/                           # LLM クライアント
│   ├── tags/                         # タグのキュレーション(ADR-0032)
│   ├── cache/tags.ts                 # cacheTag 名の一元管理
│   └── observability/                # logger, posthog
│
├── trigger/                          # Trigger.dev v4 タスク(cron)
├── shared/                           # features 横断の純粋ロジック(Result, error, categories, date, ...)
├── scripts/                          # seed / ingest / scaffold-feature / 動作確認スクリプト
├── infra/vercel/                     # Vercel の Terraform
├── design/                           # 初期デザインモックアップ
├── docs/                             # 設計ドキュメント
├── trigger.config.ts
├── drizzle.config.ts
├── next.config.ts
└── package.json
```

**重要な境界**
- `features/A` は `features/B` を直接 import しない(共有は `shared/` か `components/ui/`)
- 記事に対する横断機能(保存・購読と記事の組み合わせ)は `app/_composition/` で合成する(ADR-0013 / 0044)。features と components からは import しない
- `app/` は features の `web/queries.ts` / `web/actions.ts` 経由でデータに触れる(`db/` 直叩き禁止)
- `db/` のスキーマ型は domain / application の型に変換して公開する

---

## 4. データフロー

### 読み取り(記事一覧表示)
```
[Browser]
   ↓ GET /
[app/(app)/page.tsx (RSC)]
   ↓ await
[features/feed/web/queries.ts] ← composition root('use cache' + cacheTag)
   ↓ application の usecase を組み立てて呼ぶ
[features/feed/infrastructure: DrizzleArticleRepository]
   ↓
[Supabase Postgres]
```

### 書き込み(ブックマーク追加)
```
[Browser: クライアントコンポーネント]
   ↓ Server Action
[features/bookmarks/web/actions.ts]
   ↓ getSession() でユーザー確認(未ログインはゲスト保存 = localStorage / ADR-0017)
[features/bookmarks/application: usecase]
   ↓
[features/bookmarks/infrastructure: Repository → insert into bookmarks]
   ↓
[updateTag(CACHE_TAGS.userBookmarks(userId)) + revalidatePath('/bookmarks')]
```
- **楽観更新**: `useOptimistic` で即座に UI 更新
- **冪等性**: 重複 INSERT は `ON CONFLICT DO NOTHING`

### バックグラウンド(RSS 取得)
```
[Trigger.dev cron: 毎時0分]
   ↓
[trigger/fetch-feed-articles.ts]
   ↓ ingestAllCompanies(sink)
[lib/rss/ingest.ts] ← enabled な全企業を Promise.allSettled で並列取得
   ↓ lib/rss/fetcher.ts(timeout 15秒 + retry)→ lib/rss/parser.ts
[features/feed/application/upsert-articles(sink として注入)]
   ↓
[db: upsert into articles] → はてブ数更新 → POST /api/revalidate
```
- 他の cron(いずれも毎時): `generate-article-summaries`(10分)、`fetch-user-feeds`(15分)、`classify-article-categories`(40分)
- **観測**: 各社の `last_fetched_at` / `consecutive_failures` を companies に記録(`docs/features/health.md`)

詳細は `docs/architecture/data-flow.md`。

---

## 5. キャッシュ戦略

- 共有データ(フィード・記事・企業)は `'use cache'`(一部 `'use cache: remote'`)+ `cacheTag` でキャッシュ(ADR-0042)
- ユーザー単位のデータもユーザー別タグでキャッシュし、保存・購読の Server Action が `updateTag` で即時無効化(ADR-0016)
- 取込 cron は Next ランタイム外なので `/api/revalidate` を叩いて無効化する
- タグ名は `lib/cache/tags.ts` の `CACHE_TAGS` で一元管理

詳細は `docs/architecture/performance.md`。

---

## 6. 認証境界

- middleware によるルート保護はしていない。アプリ画面はゲストでも開け、保存などはゲストなら localStorage に保持してログイン時にマージする(ADR-0017)
- RSC / Server Action では `features/auth/server.ts` の `getSession()`(React `cache()` でリクエスト内デデュープ)でユーザーを確認する
- ログイン必須の処理は Server Action 冒頭で session を確認し、未ログインならエラーを返す

---

## 7. エラーハンドリング

| 種別 | 扱い |
|---|---|
| **ユーザー入力エラー** | Zod parse fail → エラー表示 |
| **認証エラー** | Server Action からエラーを返し、UI で処理 |
| **DB制約違反** | 冪等処理で吸収(upsert / onConflictDoNothing) |
| **RSS取得失敗** | retry 後に companies に失敗を記録し、次の cron で再試行 |
| **予期せぬエラー** | error boundary(`app/error.tsx` / `app/global-error.tsx`)+ logger |

**Resultパターン**(`shared/result.ts`)
```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```
usecase / Repository は Result を返し、throw は避ける。詳細は `docs/architecture/error-handling.md`。

---

## 8. 観測可能性

```
[Application]
   ├→ lib/observability/logger: 構造化ログ(本番は JSON)→ Vercel Logs
   ├→ PostHog: ユーザー行動イベント(ADR-0043)
   └→ Vercel Analytics / Speed Insights: アクセス・Web Vitals
[Trigger.dev]
   └→ Trigger.dev Dashboard: ジョブ実行履歴
```

詳細は `docs/architecture/observability.md`。

---

## 9. テスト戦略

| 種別 | ツール | 現状 |
|---|---|---|
| Unit | Vitest(`*.test.ts` を実装の隣に置く) | `bun run test:unit`。domain / application / lib を中心に実装済み |
| Integration | Vitest + Test DB(`*.integration.test.ts`) | 仕組み(`vitest.integration.config.ts`)のみ。テストはまだ無い |
| E2E | Playwright | 未導入(`e2e/` は無い) |

方針は `docs/principles/testing.md`。

---

## 10. スケール時の対応ポイント

| ボトルネック | 対応 |
|---|---|
| DB 容量・接続数 | Supabase のプラン変更、古い記事のアーカイブ、Transaction Pooler の設定確認 |
| RSS取得が長時間化 | `trigger/fetch-feed-articles.ts` の `maxDuration` 見直し、企業ごとのタスクに分割 |
| 帯域 | OG 画像のキャッシュ見直し、Vercel のプラン確認 |
| 検索負荷 | `pg_trgm`(ADR-0022)→ 足りなければ Meilisearch / Typesense |

**移行容易性のため守ること**
- Postgres 標準 SQL に依存(ベンダー固有機能は最小限)
- DB アクセスは全て各 feature の infrastructure 層 Repository 経由
- 認証は features/auth 経由
- 外部サービスは lib/ にラップ

---

## 11. 機能追加時の手順テンプレ

1. **既存featureに収まるか?** → 既存に追加
2. **新しい features/X として独立** → `bun run scaffold:feature X` で4層雛形を生成
   - `features/X/domain/`(entity / value object / domain service / Repository interface)
   - `features/X/application/`(ユースケース + `dto.ts`)
   - `features/X/infrastructure/`(Drizzle Repository 実装・mapper)
   - `features/X/web/`(`queries.ts` composition root / `actions.ts` / `view-models/` / `components/`)
3. **DBスキーマ変更** → `db/schema/X.ts` + `bun run db:generate`
4. **バックグラウンド処理** → `trigger/X.ts`(Trigger.dev)
5. **テスト** → 実装の隣に `*.test.ts`

詳細は `docs/guides/adding-a-feature.md`。

---

## 12. 採用しなかった設計選択肢(参考)

| 検討 | 不採用理由 |
|---|---|
| Clean Architecture フル実装 | 個人開発には過剰。feature 内4層(ADR-0010)で十分 |
| マイクロサービス | 個人開発では Monolith が有利、Server Actions で完結 |
| GraphQL / tRPC | Server Actions + RSC で型安全に完結 |
| グローバル状態管理ライブラリ | URL 状態・Server Actions・React 19 の機能で足りる |
