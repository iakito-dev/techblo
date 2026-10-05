# CI/CD ガイド

## 1. 全体像

```
[PR open] ─→ [GitHub Actions]
                ├ lint (Biome)
                ├ typecheck (tsc)
                ├ test (unit + integration)
                ├ build (Next.js)
                ├ db-check (Drizzle migration整合性)
                └ audit (bun audit)
                       ↓ all green
[Vercel] ─→ Preview deploy(自動)
[Supabase] ─→ テスト用 DB(TEST_DATABASE_URL)を共用(per-PR 自動ブランチは無し)
                       ↓ approve & merge
[Vercel] ─→ Production deploy
[GitHub Actions] ─→ deploy.yml(DB migrate → seed → Trigger.dev deploy)
```

## 2. GitHub Actions ワークフロー

| ファイル | 役割 |
|---|---|
| `.github/workflows/ci.yml` | Lint / Typecheck / Test / Build / Audit |
| `.github/workflows/db-check.yml` | スキーマ変更時の整合性チェック |
| `.github/workflows/deploy.yml` | main 更新時の本番反映(DB マイグレーション / 企業マスタ / Trigger.dev) |
| `.github/actions/setup/action.yml` | 各ジョブ共通の bun セットアップ(composite action) |

### 共通セットアップ

- bun のバージョンは `.tool-versions` を唯一の真実源にする(`setup-bun` の `bun-version-file`)。ローカルの asdf / mise と CI がずれない
- `~/.bun/install/cache` を `bun.lock` のハッシュでキャッシュしてから `bun install --frozen-lockfile`
- typecheck は `tsconfig.tsbuildinfo` を、build は `.next/cache` をキャッシュ
- ワークフローの `GITHUB_TOKEN` は `contents: read` のみ

### CI で実行するチェック(必須)

| ジョブ | コマンド | 所要時間目安 |
|---|---|---|
| lint | `bun run lint && bun run depcruise`(`biome check` は format 差分も検出) | < 30s |
| typecheck | `bun run typecheck` | < 60s |
| test | `bun run test:unit && bun run test:integration` | < 3分 |
| build | `bun run build` | < 3分 |
| audit | `bun audit` | < 30s(continue-on-error) |

ローカルでは `bun run check` で lint / depcruise / typecheck / unit test をまとめて実行できる(integration と build は除く)。

### CI で実行しないもの(理由)

- **E2E (Playwright)** — テスト用 DB の用意とCI時間。手動か main merge後に実行
- **Visual regression** — 導入してから

## 3. ブランチ保護(GitHub設定)

`main` ブランチに以下を設定:

- ✅ Require pull request before merging
- ✅ Require approvals: 1(個人開発でも履歴残す)
- ✅ Require status checks: `lint`, `typecheck`, `test`, `build`
- ✅ Require branches up to date
- ✅ Require linear history(squash merge推奨)
- ✅ Do not allow bypassing the above
- ✅ Restrict pushes that create files larger than 1MB

## 4. デプロイ

### Production

- Vercel が `main` ブランチを監視
- merge 時に自動デプロイ
- Vercel が面倒を見ない本番反映は `.github/workflows/deploy.yml` が `main` への push ごとに行う。関係するファイルが変わったジョブだけが、次の順に動く
  1. **migrate**: `db/migrations/` が変わったら `bun run db:migrate`
  2. **seed**: `scripts/seed.ts` が変わったら `bun run db:seed`(企業マスタの upsert)
  3. **trigger**: docs・Markdown・テスト・`scripts/seed.ts` 以外が変わったら `bun run trigger:deploy`(DB 反映が失敗したら出さない)
- Actions タブから手動実行もできる(動かすジョブを選べる)
- 必要な Secrets が未設定のジョブは、警告を出してスキップする
- 手元から出す場合は従来どおり `bun run db:migrate` / `bun run db:seed` / `bun run trigger:deploy`(CLI は `scripts/trigger-cli.ts` が SDK と同じ版で起動する)
- Trigger.dev のタスクが使う env(`DATABASE_URL` 等)は Trigger.dev ダッシュボード側の管理で、このワークフローでは更新されない
- Vercel のデプロイとは順序を揃えていない。新しいカラムを前提にするコードは、マイグレーションより先に本番へ出ることがある

### Preview(PR毎)

- Vercel が PR毎に preview URL を生成(自動)
- DB は per-PR 自動ブランチを持たない(Neon からの移行で廃止、ADR-0033)。preview は本番とは別のテスト用 Supabase DB(`TEST_DATABASE_URL`)を共用する
- スキーマ変更を伴う PR は、テスト用 DB にマイグレーションを当ててから検証する

### Rollback

- Vercel: 過去のデプロイから「Promote to Production」で即rollback
- DB migration の場合: 別途 down migration を作成して再デプロイ

## 5. 環境変数の管理

### 環境別

| 環境 | 場所 |
|---|---|
| Local | `.env.local`(`.env.example` を参考に各自作成、gitignore) |
| Preview | Vercel Environment Variables(Preview) |
| Production | Vercel Environment Variables(Production) |

### 設定すべきシークレット

| キー | 用途 |
|---|---|
| `DATABASE_URL` | Supabase Postgres(Transaction Pooler / port 6543) |
| `BETTER_AUTH_SECRET` | Better Auth セッション暗号化 |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `TRIGGER_SECRET_KEY` | Trigger.dev API |
| `SENTRY_DSN` | Sentry |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog client |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog endpoint |

### CI用 secrets

| キー | 用途 |
|---|---|
| `TEST_DATABASE_URL` | CI / 統合テスト専用の Supabase DB |
| `TEST_BETTER_AUTH_SECRET` | テスト用ダミー |
| `PROD_DATABASE_URL` | `deploy.yml` の migrate / seed が使う本番 DB の接続文字列 |
| `TRIGGER_ACCESS_TOKEN` | `deploy.yml` の Trigger.dev デプロイ用(Personal Access Token) |
| `TRIGGER_PROJECT_REF` | 同上(Trigger.dev の project ref) |

## 6. デプロイ前チェックリスト

main merge 時(squash):

- [ ] CI 全 green
- [ ] preview deploy で目視確認
- [ ] DB migration の必要性確認
- [ ] 環境変数追加の必要性確認
- [ ] AI assist利用箇所のセルフレビュー完了

## 7. Production hotfix

緊急時:

1. `main` から直接 `hotfix/xxx` ブランチ
2. 最小限の修正のみ
3. CI 必須項目はスキップしない(`--no-verify` 禁止)
4. PR は緊急レビュー後 squash merge
5. 必要なら Vercel UI で過去デプロイにrollback

## 8. cron / バッチ

- Trigger.dev v4 がジョブ管理
- `jobs/*.ts` を編集後、自動デプロイ
- 失敗時は Sentry 通知 + Trigger.dev Dashboard で履歴確認

## 9. Renovate / Dependabot

- **Dependabot** を使用(`.github/dependabot.yml`)
- 週次PR(月曜10時 JST)
- グループ化: dev-dependencies / next / react / drizzle / better-auth / observability
- minor / patch は autoMerge を将来検討(CI all green なら)

## 10. CI失敗時の対応

| 失敗 | 対応 |
|---|---|
| lint 失敗(format 含む) | `bun run lint:fix` → push |
| typecheck 失敗 | エラー箇所修正 |
| test 失敗 | ローカルで `bun run test:unit` 再現 → 修正 |
| build 失敗 | ローカルで `bun run build` 再現 → 修正 |
| audit 失敗(continue-on-error) | 脆弱性内容確認、必要なら依存更新 |
| db-check 失敗 | `bun drizzle-kit generate` で migration 同期 |

## 11. パフォーマンスゲート(将来)

- Lighthouse CI で LCP/CLS/INP の劣化を検知
- バンドルサイズ閾値超で fail
- MVP では入れない(運用負荷)

## 12. 関連

- ADR-0007 (CI/CD 戦略)
- `docs/principles/testing.md` — テスト戦略
- `docs/guides/local-dev.md` — ローカル開発(別途作成予定)
