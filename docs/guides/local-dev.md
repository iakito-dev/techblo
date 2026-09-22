# ローカル開発ガイド

## 1. 前提

- macOS / Linux(Windowsは WSL2 推奨)
- Bun 1.2+
- Node.js 22+(Bunで代用可だが互換性のため入れる)
- Git
- GitHub CLI (`gh`)
- VS Code(推奨)

`.tool-versions` で asdf / mise 経由のバージョン管理を推奨。

```bash
# mise の場合
mise install
```

## 2. 初回セットアップ

```bash
# 1. clone
gh repo clone iakito-dev/techblo
cd techblo

# 2. 依存インストール
bun install

# 3. lefthook 有効化(pre-commit hooks)
bunx lefthook install

# 4. 環境変数
cp .env.example .env.local
# .env.local を編集

# 5. Supabase DB の作成
# 個人開発用 Supabase プロジェクトを作成し、Transaction Pooler(port 6543)の connection string を .env.local に
# DATABASE_URL に貼り付け

# 6. DB マイグレーション
bun drizzle-kit migrate

# 7. シード(初期データ: 6社の企業マスタ)
bun run db:seed

# 8. dev サーバー起動
bun run dev
```

## 3. 必要なサービスアカウント

各サービスで個人アカウントを作成し、APIキーを取得:

| サービス | 用途 | 取得URL |
|---|---|---|
| Supabase | Postgres DB | https://supabase.com/dashboard |
| Google Cloud | OAuth | https://console.cloud.google.com/ |
| Trigger.dev | ジョブ実行 | https://cloud.trigger.dev/ |
| Sentry | エラー監視 | https://sentry.io/ |
| PostHog | アナリティクス | https://app.posthog.com/ |
| Vercel | ホスティング | https://vercel.com/ |

## 4. よく使うコマンド

```bash
# 開発
bun run dev                # Next.js dev server (Turbopack)
bun run dev:all            # Next.js + Trigger.dev dev + Drizzle Studio

# DB
bun drizzle-kit generate   # スキーマからmigration生成
bun drizzle-kit migrate    # migration適用
bun run db:studio          # Drizzle Studio起動(GUI)
bun run db:seed            # シードデータ投入

# Lint / Format / Typecheck
bun run lint               # Biome check
bun run lint:fix           # Biome check + 自動修正
bun run format             # Biome format
bun run typecheck          # tsc --noEmit
bun run check              # lint + depcruise + typecheck + unit test(CI 相当を一括)

# テスト
bun run test               # 全テスト
bun run test:unit          # unit only
bun run test:integration   # integration only(DBが必要)
bun run test:e2e           # Playwright E2E
bun run test:watch         # watch mode

# ビルド
bun run build              # production ビルド
bun run start              # production サーバー起動(ローカル確認)

# Trigger.dev
bun run trigger:dev        # Trigger.dev dev mode(ジョブ実行を確認)
```

## 5. 開発時の典型的なフロー

```bash
# 1. 最新を取得
git checkout main && git pull

# 2. 作業ブランチ
git checkout -b feat/feed-infinite-scroll

# 3. 該当機能のdocを読む
cat docs/features/feed.md

# 4. 実装
# ...

# 5. ローカル確認
bun run dev
# → http://localhost:3000

# 6. テスト
bun run test:unit

# 7. lint / typecheck(pre-commit hookでも実行されるが、先に実行しておく)
bun run check

# 8. commit(Conventional Commits)
git add .
git commit -m "feat(feed): add infinite scroll"

# 9. push & PR
git push -u origin feat/feed-infinite-scroll
gh pr create
```

## 6. トラブルシューティング

### `bun install` が遅い

- `bun install --concurrent-scripts=10` で並列度を上げる
- グローバル cache を確認: `ls ~/.bun/install/cache`

### Drizzle migration が壊れた

- ローカル DB を `bun drizzle-kit drop` でリセット(注意: 個人開発DBのみ)
- migration を再生成 `bun drizzle-kit generate`

### Vercel preview deploy が落ちる

- 環境変数の漏れ確認(Vercel UI で Preview env)
- Next.js のCanary機能を使っている場合、本番との差分確認

### Trigger.dev のジョブが動かない

- `bun run trigger:dev` を別ターミナルで起動しているか
- Trigger.dev Dashboard でログ確認

### Better Auth で OAuth が失敗

- Google Cloud Console の redirect URI 設定確認
- `BETTER_AUTH_URL` が dev/prod で正しいか確認

## 7. VS Code 推奨拡張

`.vscode/extensions.json`(将来追加):

- `biomejs.biome` — Linter / Formatter
- `bradlc.vscode-tailwindcss` — Tailwind class補完
- `dbaeumer.vscode-eslint`(Biome併用しないなら無効化)
- `drizzle-team.vscode-drizzle-orm` — Drizzle ORM補完
- `Anthropic.claude-code`(Claude Code 連携)

## 8. パフォーマンス分析

```bash
# Bundle分析
ANALYZE=true bun run build

# Lighthouse CI(将来)
bunx unlighthouse --site http://localhost:3000
```

## 9. AI assist の活用

詳細は `docs/guides/ai-engineering.md` 参照。

```bash
# Claude Code 起動
claude

# Cursor で開く
cursor .

# Codex 等のagent runners は AGENTS.md を自動参照
```

## 10. 関連

- `docs/guides/ci-cd.md` — CI/CD
- `docs/guides/ai-engineering.md` — AI開発
- `docs/guides/adding-a-feature.md` — 機能追加手順
