# 公開(本番ローンチ)チェックリスト

一般公開までにやるべきことを優先度順に整理する。ROADMAP の **M6(仕上げ / 本番運用)** に対応。
チェックが付いたら PR/コミットへのリンクを添える。

> 前提スタック: Next.js 16(Vercel 東京 `hnd1`)/ Supabase Postgres(東京、postgres-js)/ Better Auth(Google / GitHub / Discord)/ Trigger.dev v4 / Sentry / PostHog(ADR-0001, ADR-0033, TECH_STACK.md)

---

## A. 必須(これが無いと動かない / 公開できない)

- [ ] **Vercel プロジェクト接続 + 環境変数**
  - `DATABASE_URL`(Supabase Transaction Pooler / port 6543)/ `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` /(任意)`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `NEXT_PUBLIC_APP_URL` / `REVALIDATE_SECRET`(cron→キャッシュ無効化)/ Sentry・PostHog・Trigger.dev のキー
- [ ] **本番DBマイグレーション + シード + 初回取り込み**
  - Supabase 本番に `bun run db:migrate`(未適用マイグレーションを忘れない)
  - `bun run db:seed`(企業マスタ)→ 初回 ingest(空フィード回避)
- [x] **独自ドメイン + URL 整合** — techblo.dev
  - 独自ドメイン取得(Vercel は Hobby でも独自ドメイン無料)
  - `NEXT_PUBLIC_APP_URL` / `metadataBase`(app/layout.tsx)/ Better Auth `baseURL` / `lib/http/fetcher.ts` の User-Agent URL を本番ドメインへ
- [ ] **Google OAuth 本番化**
  - 本番リダイレクト URI `{domain}/api/auth/callback/google` を登録
  - OAuth 同意画面を **testing → 本番** に公開(プライバシーポリシー URL が必要)
- [ ] **GitHub / Discord ログインの有効化**(任意 / コードは実装済 [lib/auth.ts:46](lib/auth.ts))
  - 各 OAuth アプリを作成し、コールバック URI `{domain}/api/auth/callback/{github,discord}` を登録
  - `GITHUB_CLIENT_ID/SECRET` / `DISCORD_CLIENT_ID/SECRET` を env に設定(未設定ならそのプロバイダは無効のまま)
- [x] **RSS 定期取得(本丸)** — [trigger/fetch-feed-articles.ts:47](trigger/fetch-feed-articles.ts)
  - Trigger.dev のスケジュールタスクで**毎時クロール**(`fetch-feed-articles` = `0 * * * *`、`fetch-user-feeds` = `15 * * * *`、AI要約 `generate-article-summaries` = `10 * * * *`)
  - 取り込み完了時に `/api/revalidate`(`REVALIDATE_SECRET` 保護)経由で feed キャッシュを無効化(cron は Next ランタイム外のため `revalidateTag` を直接呼べない)
  - 重い取り込みはリクエスト経路から外し Trigger.dev に集約済み(Vercel 関数タイムアウト対策)

## B. 公開サービスとして必要(法務・信頼)

- [x] **プライバシーポリシー / 利用規約ページ** — [app/privacy](app/privacy/page.tsx) / [app/terms](app/terms/page.tsx) / [app/about](app/about/page.tsx)(メール・ブックマーク等を保存、Google OAuth / PostHog が実質要求)
- [ ] **著作権の姿勢を明記**(他社ブログのタイトル+抜粋+元リンクを集約。フッターに出典/「本文は元サイトへ」注記。外部リンク方式は維持)
- [x] **クロールボタンの濫用対策** — 記事取得は Trigger.dev の定期タスクに集約済みで、UI から即時クロールする導線は無い

## C. 運用・品質(公開直後に効く)

- [ ] **Sentry / PostHog 有効化**(DSN・キー設定、エラー送信とイベント計測の確認)
- [ ] **RSS 失敗アラート**(`companies.consecutive_failures` / `last_error` を監視。Trigger.dev / Slack 通知)
- [ ] **E2E スモークテスト**(ADR-0007):フィード表示 / ログイン / ブックマークの最低 3 本
- [x] **robots.txt / sitemap.xml** — [app/robots.ts](app/robots.ts) / [app/sitemap.ts](app/sitemap.ts)(Next の規約ファイルで生成、ADR-0028)

## D. あると良い

- [ ] `not-found.tsx`(404)の体裁(global-error は刷新済み)
- [ ] uptime 監視(DB を叩かないヘルスチェック or 低頻度で。Supabase Free は一定期間アクセスが無いとプロジェクトが一時停止する点に注意)
- [ ] OGP / Twitter カードの実機確認(設定済み)

---

## クリティカルパス(公開前に残っている最優先)

`Trigger.dev 毎時クロール` `クロールボタン濫用対策` `プライバシーポリシー/利用規約` は完了済み。残るブロッカーは:

1. **本番環境変数の投入 + 本番DBマイグレーション/シード/初回取り込み**(A)
2. **Google OAuth 本番化**(同意画面を testing → 本番。プライバシーポリシー URL は用意済み)(A/B)

## 関連

- ROADMAP.md(M6 仕上げ / 本番運用)
- TECH_STACK.md(コスト試算・採用理由)
- docs/adr/0001-tech-stack.md / 0033-migrate-neon-to-supabase-postgres-js.md / 0007-ci-cd-strategy.md
- docs/architecture/performance.md(キャッシュ / 'use cache')
