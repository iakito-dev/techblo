# Techblo Documentation

Techblo の設計・実装に関する全ドキュメントの索引です。

AIエージェントもこのファイルから辿れるように構成されています。

---

## ルート直下のドキュメント

| ファイル | 内容 |
|---|---|
| [`/AGENTS.md`](/AGENTS.md) | 全AIエージェント共通の指示 |
| [`/CLAUDE.md`](/CLAUDE.md) | Claude Code 専用の指示 |
| [`/REQUIREMENTS.md`](/REQUIREMENTS.md) | 要件定義書 |
| [`/FEATURES.md`](/FEATURES.md) | 機能設計(MVP範囲含む) |
| [`/TECH_STACK.md`](/TECH_STACK.md) | 採用技術一覧 |
| [`/ARCHITECTURE.md`](/ARCHITECTURE.md) | アーキテクチャ概要 |

---

## docs/ 配下

### `principles/` — 設計原則(変更頻度低)

すべての判断のベースになる原則。変える時はチーム合意が必要。

- [architecture.md](./principles/architecture.md) — レイヤー分離、モジュール境界
- [code.md](./principles/code.md) — コーディング規約
- [design.md](./principles/design.md) — UI/UX設計原則(デザイントークン等)
- [data.md](./principles/data.md) — データモデル原則
- [testing.md](./principles/testing.md) — テスト戦略(ピラミッド、ツール、配置)

### `architecture/` — 詳細アーキテクチャ

各レイヤー(frontend / backend / shared)の具体構造。

- [README.md](./architecture/README.md) — 索引
- [overview.md](./architecture/overview.md) — 全体像とリクエストフロー
- [frontend.md](./architecture/frontend.md) — React Server/Client境界、UI構成、フォーム、状態管理
- [backend.md](./architecture/backend.md) — Server Actions、Queries、DB、Jobs、認可
- [shared.md](./architecture/shared.md) — Result型、Pagination、Env、横断ユーティリティ
- [data-flow.md](./architecture/data-flow.md) — 主要シナリオのデータフロー
- [error-handling.md](./architecture/error-handling.md) — エラー設計と伝播
- [observability.md](./architecture/observability.md) — Sentry/PostHog/ログ
- [security.md](./architecture/security.md) — 認証認可、入力検証、PII
- [performance.md](./architecture/performance.md) — キャッシュ、ストリーミング、最適化

### `adr/` — アーキテクチャ意思決定記録

「なぜこの選択をしたか」の歴史。あとから読み返すための記録。新規判断時は新ADRを追加(既存ADRは変更しない、Supersede関係で繋ぐ)。

- [README.md](./adr/README.md) — ADR一覧と運用ルール
- [template.md](./adr/template.md) — 新規ADR作成テンプレート
- [0001-tech-stack.md](./adr/0001-tech-stack.md)
- [0002-feature-sliced-architecture.md](./adr/0002-feature-sliced-architecture.md)
- [0003-server-first-no-separate-api.md](./adr/0003-server-first-no-separate-api.md)
- [0004-ogp-hotlinking.md](./adr/0004-ogp-hotlinking.md)
- [0005-mvp-exclusions.md](./adr/0005-mvp-exclusions.md)
- [0006-bookmark-favorite-two-layers.md](./adr/0006-bookmark-favorite-two-layers.md)
- [0007-ci-cd-strategy.md](./adr/0007-ci-cd-strategy.md)
- [0008-ai-engineering-harness.md](./adr/0008-ai-engineering-harness.md)
- [0009-data-model.md](./adr/0009-data-model.md)
- [0010-layered-hexagonal-within-features.md](./adr/0010-layered-hexagonal-within-features.md)
- [0011-base44-design-refresh.md](./adr/0011-base44-design-refresh.md)
- [0012-subscription-initialization-on-signup.md](./adr/0012-subscription-initialization-on-signup.md)
- [0013-offset-pagination-and-feed-cache.md](./adr/0013-offset-pagination-and-feed-cache.md)
- [0014-user-private-rss-feeds.md](./adr/0014-user-private-rss-feeds.md)
- [0037-related-articles-by-tag-overlap.md](./adr/0037-related-articles-by-tag-overlap.md)
- [0041-reading-history-from-reads.md](./adr/0041-reading-history-from-reads.md)
- [0042-remote-cache-for-request-time-article-data.md](./adr/0042-remote-cache-for-request-time-article-data.md)
- [0043-posthog-client-side-event-tracking.md](./adr/0043-posthog-client-side-event-tracking.md)

### `features/` — 機能仕様

機能ごとの詳細仕様。実装時に細部を書き足していく(MVP着手時はstub状態)。

- [README.md](./features/README.md) — 機能一覧と関係図
- [feed.md](./features/feed.md) — 記事フィード(トップ画面)
- [bookmarks.md](./features/bookmarks.md) — ブックマーク
- [favorites.md](./features/favorites.md) — お気に入り
- [reads.md](./features/reads.md) — 既読管理(未読/既読フィルタ・閲覧履歴)
- [subscriptions.md](./features/subscriptions.md) — 購読企業設定
- [user-feeds.md](./features/user-feeds.md) — マイフィード(ユーザー登録RSS)
- [auth.md](./features/auth.md) — 認証(Google OAuth)
- [ai-summary.md](./features/ai-summary.md) — AI記事要約(3行・ダイアログ内表示)

### `guides/` — 操作ガイド

「どうやって○○するか」の手順書。開発者/AIエージェント双方向け。

- [adding-a-feature.md](./guides/adding-a-feature.md) — 新機能の追加手順
- [adding-a-company.md](./guides/adding-a-company.md) — 新しい企業ブログの追加手順
- [ci-cd.md](./guides/ci-cd.md) — CI/CD パイプラインとブランチ保護
- [local-dev.md](./guides/local-dev.md) — ローカル開発セットアップ
- [launch-checklist.md](./guides/launch-checklist.md) — 公開(本番ローンチ)前にやるべきこと
- [ai-engineering.md](./guides/ai-engineering.md) — AI開発のベストプラクティス

---

## どこから読むか(コンテキスト別)

| あなたが今やりたいこと | まず読むべきもの |
|---|---|
| プロジェクト全体を把握したい | `/AGENTS.md` → `/REQUIREMENTS.md` → `/FEATURES.md` |
| アーキテクチャを理解したい | `/ARCHITECTURE.md` → `docs/principles/architecture.md` → `docs/architecture/` |
| フロントエンドを実装する | `docs/architecture/frontend.md` |
| バックエンドを実装する | `docs/architecture/backend.md` |
| 共通ロジックを書く | `docs/architecture/shared.md` |
| ある機能を実装したい | `docs/features/{name}.md` → `docs/guides/adding-a-feature.md` |
| 過去の判断理由を知りたい | `docs/adr/` を時系列で |
| 新しい企業ブログを追加したい | `docs/guides/adding-a-company.md` |
| 設計判断の参考にしたい | `docs/principles/` 全部 |
