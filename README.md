# Techblo

日本の企業テックブログを集約するモダンなRSSリーダー。

## クイックスタート

```bash
# 1. 依存インストール
bun install

# 2. 環境変数(`.env.example` を参考に)
cp .env.example .env.local
$EDITOR .env.local

# 3. DB マイグレーション(Supabase Postgres の接続情報が必要)
bun run db:migrate

# 4. シード(企業マスタを投入)
bun run db:seed

# 5. 開発サーバー起動
bun run dev
```

詳細は [`docs/guides/local-dev.md`](./docs/guides/local-dev.md) を参照。

## ドキュメント

| カテゴリ | 場所 |
|---|---|
| 全体方針(AIエージェント含む) | [`AGENTS.md`](./AGENTS.md) |
| 要件・機能・技術・アーキテクチャ | ルート直下の `*.md` |
| 設計原則・ADR・機能仕様・ガイド | [`docs/`](./docs/) |
| デザインモックアップ | [`design/mockup.html`](./design/mockup.html) |

詳細索引は [`docs/README.md`](./docs/README.md)。

## 技術スタック

Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui +
Drizzle ORM + Supabase Postgres + Better Auth + Trigger.dev v4 +
PostHog + Vercel(Sentry は導入予定)。

詳細は [`TECH_STACK.md`](./TECH_STACK.md)。

## 主要コマンド

```bash
bun run dev               # 開発サーバー(Turbopack)
bun run build             # production ビルド
bun run lint              # Biome check
bun run typecheck         # TypeScript 型チェック
bun run test              # Vitest 単体テスト
bun run db:generate       # スキーマからmigration生成
bun run db:migrate        # migration適用
bun run db:studio         # Drizzle Studio
bun run db:seed           # 企業マスタ投入
bun run trigger:dev       # Trigger.dev dev mode
```

## ライセンス

Private(個人開発)。
