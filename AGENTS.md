# AGENTS.md

**Techblo** — 日本の企業テックブログを集約するモダンなRSSリーダー。

このファイルは全AIエージェント(Claude Code / OpenAI Codex / Cursor / Aider / Continue / Windsurf 等)が共通で参照する指示書です。ツール固有の追加指示は各ツールの専用ファイル(`CLAUDE.md`, `.cursorrules` 等)を参照してください。

---

## 0. 最初に読むべきもの

新しく作業に入る時は以下を上から順に読んでください:

| # | ファイル | 内容 |
|---|---|---|
| 1 | `AGENTS.md` (このファイル) | 全体方針 |
| 2 | `docs/README.md` | ドキュメント索引 |
| 3 | `REQUIREMENTS.md` | 要件定義 |
| 4 | `FEATURES.md` | 機能仕様 |
| 5 | `ARCHITECTURE.md` | アーキテクチャ概要 |
| 6 | `TECH_STACK.md` | 採用技術 |
| 7 | `docs/principles/*.md` | 設計原則(不変) |
| 8 | `docs/architecture/*.md` | 詳細アーキテクチャ(frontend/backend/shared) |
| 9 | `docs/adr/*.md` | 過去の意思決定 |

特定の機能に取り組むときは `docs/features/{name}.md` を、新しい機能を追加するときは `docs/guides/adding-a-feature.md` も読んでください。

フロント実装は `docs/architecture/frontend.md`、サーバー実装は `docs/architecture/backend.md`、共通ロジックは `docs/architecture/shared.md` を必ず参照。

---

## 1. プロジェクト概要

- **何**: 日本の企業テックブログ(`scripts/seed.ts` の企業マスタ)をRSSで集約、カードUIで閲覧
- **誰向け**: ソフトウェアエンジニア・AI関心層
- **MVP範囲**: 一覧 + 外部リンク + Google認証 + ブックマーク/お気に入り/購読設定
- **MVP除外(ADR-0005 時点)**: AI要約、検索、タグ、通知、海外AI企業
  - その後 AI要約(ADR-0026)・検索(ADR-0022)・タグ(ADR-0027)は実装済み。未実装は通知・海外AI企業

---

## 2. 技術スタック(要点)

- **Next.js 16** (App Router, RSC, PPR, Turbopack)
- **React 19** + React Compiler
- **TypeScript** strict
- **Tailwind CSS v4** + **shadcn/ui**
- **Drizzle ORM** + **Supabase Postgres**(postgres-js / ADR-0033)
- **Better Auth**(Google / GitHub / Discord OAuth)
- **Trigger.dev v4**(RSS取得・AI要約バッチ)
- **Bun** + **Biome**
- **PostHog**(Sentry は導入予定・未導入。現状のエラーは `lib/observability/logger` に出す)

詳細は `TECH_STACK.md` を参照。

---

## 3. コーディング規則

### TypeScript
- `strict: true` 前提
- `any` 禁止(`unknown` + 絞り込みで)
- 型は Zod スキーマから派生(`z.infer<typeof schema>`)
- Result パターン: throwせず `Result<T, E>` を返す(`shared/result.ts`)

### ファイル/フォルダ
- ファイル名: **kebab-case**(`article-card.tsx`)
- コンポーネント名: **PascalCase**
- フック: `use-xxx.ts` で `useXxx` をexport
- 1ファイル1default export禁止、named export優先
- バレル(index.ts)は使わない(import解析を遅くするため)

### モジュール境界(厳守 / ADR-0010、`bun run depcruise` で自動強制)
- 各 feature は4層に分割(`domain` / `application` / `infrastructure` / `web`)。依存方向は内向きのみ: `web / infrastructure → application → domain`
- `features/A` は `features/B` を import しない(共有は `shared/` か `components/ui/`)
- `app/` は features の `web/queries.ts` / `web/actions.ts` のみ経由(`db/`直叩き禁止)
- `db/` へアクセスしてよいのは feature の `infrastructure/` 層のみ(Repository 経由)
- `db/` のスキーマ型を上層に直接漏らさない(`domain` / `application` の型で再定義)
- `lib/` は `features/` を import しない(逆流禁止、保存処理は sink 注入)
- `components/` も `db/` を直接 import しない。`components/ui/` は features / db / lib に依存しない
- `shared/` は純粋ロジックのみ(features / lib / db / app / components を import しない)
- `app/` は最外殻。他の層から `app/` を import しない

### React/Next.js
- デフォルトはServer Component(`'use client'` は本当に必要なときだけ)
- 状態管理は最小化(Server Actions + useOptimistic で大半カバー)
- Server Action は `features/*/web/actions.ts` に集約(実装は application の usecase)
- データ取得は `features/*/web/queries.ts`(composition root)から application usecase 経由、DB アクセスは infrastructure の Repository

### コメント
- **Whatは書かない**(コードが説明する)
- **Whyのみ書く**(非自明な制約、トリッキーな最適化、過去のバグ防止策)
- TODO/FIXMEは禁止 → GitHub Issue で管理

### コミット
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
- 1コミット1論理変更
- メッセージは英語 or 日本語 統一(プロジェクト現状: 日本語)

---

## 4. ディレクトリ構造の規約

```
app/                    # Next.js routes
app/_composition/       # 複数 feature をまたぐ合成(記事 × 保存・購読・既読 / ADR-0013・0044)
features/{name}/        # 機能モジュール(4層: domain/application/infrastructure/web — ADR-0010)
  domain/               #   純粋TS(entity/VO/domain service/Repository interface)
  application/          #   ユースケース(依存は引数注入)+ dto.ts
  infrastructure/       #   Drizzle Repository 実装・mapper(db を import可)
  web/                  #   queries.ts(composition root)/actions.ts/view-models/components
components/ui/          # shadcn primitives
components/layout/      # 横断UI(Header, MobileNav)
db/schema/              # Drizzle schemas
db/migrations/          # Drizzle migrations
lib/                    # 横断的なinfrastructure(auth, rss, ogp, observability)
trigger/                # Trigger.dev tasks
shared/                 # features横断の純粋ロジック(Result型, error, カテゴリ定義, 日付)
docs/                   # 設計ドキュメント
```

新しい機能を追加する手順は `docs/guides/adding-a-feature.md` を参照。

---

## 5. 禁止事項

| 禁止 | 理由 |
|---|---|
| `db/` を `app/` から直接 import | レイヤー違反、`features/*/web/queries.ts` → infrastructure 層の Repository 経由 |
| `lib/` から `features/` を import | レイヤー逆流(ADR-0010)、保存処理は sink 注入で受け取る |
| `features/A` から `features/B` を import | モジュール独立性、共有は `shared/` |
| クライアントで秘密情報を扱う | セキュリティ |
| ORMオブジェクトを上層に漏らす | リファクタ困難化 |
| Promise を awaitせず投げっぱなし | エラー追跡不能、Sentry設定が機能しない |
| `console.log` を本番コードに残す | observabilityを汚染 |
| 商用利用想定でVercel Hobbyを使い続ける | ToS違反、Pro移行 or Cloudflare/Netlify |

---

## 6. 作業前のチェックリスト

タスクに着手する前に以下を確認:

- [ ] 該当する `docs/features/{name}.md` を読んだ
- [ ] 関連する `docs/adr/*.md` を読んだ
- [ ] 既存featureに収まる変更か、新featureが必要か判断した
- [ ] DB変更が必要なら schema migration の方針を決めた
- [ ] テスト戦略(unit/integration/e2e のどれが必要か)を決めた

---

## 7. レビュー基準

PR / 変更時の自己レビュー観点:

- [ ] レイヤー境界を守っているか(`features/A → features/B` していないか、依存方向が内向き `web/infra → application → domain` か、`bun run depcruise` が通るか)
- [ ] 型がZodから派生しているか
- [ ] Server Action は `requireSession()` 等で認証を確認しているか
- [ ] エラーは Result型で返しているか、throwしていないか
- [ ] 不要な `'use client'` がないか
- [ ] コメントは Why のみか
- [ ] テストが追加されているか(該当する場合)
- [ ] `docs/features/{name}.md` を更新したか(仕様変更時)

---

## 8. ツール別の追加指示

- **Claude Code**: `CLAUDE.md` を参照
- **GitHub Copilot**: `.github/copilot-instructions.md` を参照
- **Cursor**: `.cursorrules` を参照(なければこのファイルがdefault)

---

## 9. プロジェクトの現状

- フェーズ: MVP 実装済み・本番運用中(techblo.dev)。以降は機能追加と改善
- 進行中・今後の計画は `ROADMAP.md`、機能ごとの現状は `docs/features/*.md` を参照
- 変更前後の一括検証は `bun run check`(lint + depcruise + typecheck + unit test)

何か不明点があれば、まず `docs/` を検索してから質問してください。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
