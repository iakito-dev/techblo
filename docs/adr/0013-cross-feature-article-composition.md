# ADR-0013: 記事に対する横断機能(購読/ブックマーク/お気に入り)は app 層で合成する

- **状態**: Accepted
- **決定日**: 2026-06-02
- **関連**: ADR-0002(Feature Sliced), ADR-0010(レイヤード+ヘキサゴナル), ADR-0006(2層保存)
- **更新**: 本文中の `components/article/*` は ADR-0044 で `app/_composition/article/*` へ移動した

## 背景

ブックマーク・お気に入り・購読は本質的に「記事(feed)」を対象とする機能だが、ADR-0002 で `features/A → features/B` の直接 import は禁止されている。具体的に以下の合成が必要になる:

1. フィード/一覧で記事カードに保存ボタンを出し、保存状態(塗りつぶし)を反映する。
2. `/bookmarks`・`/favorites` で保存記事の本体(記事カード)を表示する。
3. フィードを購読 ON 企業のみに絞り込む。

`features/feed` がこれらの feature を import するのも、保存系 feature が `features/feed` を import するのも違反になる。

## 検討した選択肢

### A. app 層で合成 + feed はスロット/ID取得 API を提供(採用)

- feed は保存系を知らないまま、`ArticleCard` の `actions?: ReactNode` スロット / `FeedGrid` の `renderActions` を公開し、`getArticlesByIds(ids)` を提供。
- 各 feature は ID と Server Action のみ公開(`getBookmarkedArticleIds`、`setBookmarkAction` 等)。
- app 層(`app/page.tsx`・`app/bookmarks|favorites/page.tsx`)が auth/subscriptions/bookmarks/favorites/feed を束ね、保存状態 Set を作って注入。
- 保存ボタン本体 `components/article/article-actions.tsx`(横断 UI・client)は保存系 feature の Server Action を import(`components → features` は許容。先例: `components/layout/header.tsx → features/auth/client`)。

### B. 記事 DTO/Card を shared 化して各 feature が自前で記事を引く

- 記事表現を共有層へ移動し、各 feature が articles を直接 join。
- デメリット: 記事の表示ロジックが分散・重複し、feed の責務が薄まる。

## 決定

**A を採用**。記事に対する横断的合成は **app 層**で行い、`features/feed` は「スロット」と「ID 指定取得」を提供するだけにする。feature 間の直接 import はゼロのまま、`bun run depcruise`(`features/A→features/B` のみ禁止)を通る。

## 結果

- ✅ feed↔bookmarks/favorites/subscriptions の直接依存ゼロ。各 feature は独立してテスト/変更可能
- ✅ 記事の表示(ArticleCard)は feed に一元化したまま再利用
- ✅ depcruise 準拠(違反なし)
- ⚠️ app 層が合成の責務を負い、ページが「ID 集合の取得 → 記事取得 → 注入」をオーケストレーションする
- ⚠️ `components/` から `features/*/web/actions` を import する(横断 UI に限る。既存の header の先例に倣う)
- ❌ 保存状態の取得が feature をまたいで複数クエリになる(MVP の規模では許容)

## 関連リソース

- `app/page.tsx`(`SubscribedFeed`)・`app/bookmarks/page.tsx`・`app/favorites/page.tsx`
- `components/article/article-actions.tsx`・`saved-articles-view.tsx`
- `features/feed/web/queries.ts`(`getArticlesByIds`)・`feed-grid.tsx`/`article-card.tsx`(スロット)
