# Architecture Decision Records (ADR)

「なぜこの選択をしたか」を時系列で記録する場所。

## ADR 一覧

| # | タイトル | 状態 |
|---|---|---|
| [0001](./0001-tech-stack.md) | 技術スタック選定 | Accepted(DB は ADR-0033 で Supabase へ更新) |
| [0002](./0002-feature-sliced-architecture.md) | Feature-sliced アーキテクチャ | Accepted |
| [0003](./0003-server-first-no-separate-api.md) | Server-first(独立APIサーバーを持たない) | Accepted |
| [0004](./0004-ogp-hotlinking.md) | OGP画像はホットリンクで運用 | Superseded by ADR-0011 |
| [0005](./0005-mvp-exclusions.md) | MVPから除外する機能の明確化 | Accepted(全文取得除外は ADR-0026 が部分 supersede) |
| [0006](./0006-bookmark-favorite-two-layers.md) | ブックマークとお気に入りの2階層 | Accepted |
| [0007](./0007-ci-cd-strategy.md) | CI/CD戦略 | Accepted |
| [0008](./0008-ai-engineering-harness.md) | AIエンジニアリング・ハーネス整備 | Accepted |
| [0009](./0009-data-model.md) | データモデル設計 | Accepted(ドライバは ADR-0033 で postgres-js へ更新) |
| [0010](./0010-layered-hexagonal-within-features.md) | feature 内部のレイヤード + ヘキサゴナル(軽量DDD) | Accepted |
| [0011](./0011-base44-design-refresh.md) | Base44参照デザインへの刷新(インディゴ配色 + テキスト主体カード) | Accepted |
| [0012](./0012-subscription-initialization-on-signup.md) | 初回ログイン時の subscriptions 初期化を better-auth フックで行う | Accepted |
| [0013](./0013-offset-pagination-and-feed-cache.md) | フィードはオフセットページネーション + キャッシュ | Accepted |
| [0014](./0014-user-private-rss-feeds.md) | ユーザー登録RSS(プライベート)を別テーブル分離 + UNION マージ | Accepted |
| [0016](./0016-user-scoped-cache-and-feed-rerender.md) | フィードのユーザー単位キャッシュと再マウント回避 | Accepted |
| [0017](./0017-guest-saves-local-and-merge-on-login.md) | ゲスト保存は localStorage、ログインで DB へマージ | Accepted |
| [0018](./0018-popularity-velocity-trend-score.md) | 人気順を累計はてブ数から伸び速度(velocity)へ | Accepted |
| [0019](./0019-static-default-feed-prerender.md) | 既定フィードの静的プリレンダでローディングを消す | Superseded by 0024 |
| [0020](./0020-introduce-shadcn-ui-primitives-and-sidebar-layout.md) | shadcn/ui プリミティブ導入とサイドバー型レイアウトへの刷新 | Accepted |
| [0021](./0021-read-tracking-and-filter.md) | 既読管理は feed クエリ側で SQL 絞り込み(全件既読 ID を持たない) | Accepted |
| [0022](./0022-article-search-ilike-pg-trgm.md) | 記事検索は ILIKE + pg_trgm、結果はフィードキャッシュをバイパス | Accepted |
| [0023](./0023-mobile-feed-dock-bottom-chrome.md) | モバイルのフィルタ/ソートドックと bottom chrome の一体退避 | Accepted |
| [0024](./0024-revert-default-feed-fallback-to-skeleton.md) | 記事フィードのフォールバックを skeleton に戻す(0019 を supersede) | Accepted |
| [0025](./0025-per-feed-timezone-correction.md) | フィード単位のタイムゾーン補正と未来日付ガード | Accepted |
| [0026](./0026-ai-summary-transient-fulltext.md) | AI要約は本文を取込時に一時取得して生成し全文は保存しない | Accepted |
| [0027](./0027-tag-filtering-from-display-tags.md) | AI生成の表示タグを固定キュレーションのタグ絞り込みに流用する | Accepted(一部 ADR-0032 で更新) |
| [0028](./0028-seo-baseline-robots-sitemap-structured-data.md) | SEO ベースライン(robots / sitemap / 構造化データ) | Accepted |
| [0029](./0029-share-og-image-strategy.md) | 共有OGP画像は元画像があればホットリンク、無ければ自前生成(タイトル主役) | Accepted |
| [0030](./0030-company-landing-pages-for-seo.md) | SEO向けに企業ランディングページ(/companies)を新設する | Accepted |
| [0031](./0031-seo-thin-content-and-canonical-refinements.md) | SEO 薄コンテンツ対策と canonical の精緻化 | Accepted |
| [0032](./0032-tag-curation-synonym-grouping.md) | タグ絞り込みを類義語グループ化 + 人気ベースの固定キュレーションにする | Accepted |
| [0033](./0033-migrate-neon-to-supabase-postgres-js.md) | DB を Neon から Supabase(東京)へ移行・postgres-js ドライバ化 | Accepted |
| [0034](./0034-article-categories-by-function.md) | 記事カテゴリは職能軸の7種、保存済み要約から独立ステップで分類する | Accepted |
| [0035](./0035-sectioned-feed-and-editorial-cards.md) | セクション型フィードとエディトリアル(上罫)カード | Accepted |

## 運用ルール

### 新ADRを書くタイミング

- 複数の選択肢から1つを選んだ時(例: DBにNeonとSupabaseのどちらを選ぶか)
- 重要な制約や禁止事項を導入する時
- アーキテクチャに影響する判断をした時

### 書かないタイミング

- 自明な実装詳細(変数名等)
- 短期的な実装の選択(2週間で覆る可能性のあるもの)
- コーディング規約(これは `principles/code.md` へ)

### 既存ADRの扱い

- **既存ADRは絶対に変更しない**。判断時点の記録としての価値があるため
- 判断が変わったら新しいADRを書き、**Supersedes** で関連付ける
- 古いADRは状態を `Superseded by ADR-NNNN` に変更(これだけは例外的にOK)

### ADR の状態

| 状態 | 意味 |
|---|---|
| Proposed | 提案中、議論中 |
| Accepted | 採用された(現在有効) |
| Rejected | 検討したが採用しなかった |
| Deprecated | 古くなったが代替未決定 |
| Superseded by ADR-NNNN | 新しいADRに置き換えられた |

### テンプレート

新しいADRは [`template.md`](./template.md) をコピーして作成。
ファイル名: `NNNN-kebab-case-title.md`(NNNNは4桁連番)。
