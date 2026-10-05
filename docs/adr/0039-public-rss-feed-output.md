# ADR-0039: 公開 RSS フィードを配信する

- **状態**: Accepted
- **決定日**: 2026-10-05
- **関連**: ADR-0013, ADR-0028, ADR-0030, ADR-0034

## 背景

Techblo は各社の技術ブログを集約する RSS リーダーだが、自身は RSS を配信していなかった。
RSS リーダー利用者は「Techblo の新着(または特定企業・カテゴリ)」を普段のリーダーで購読したい。
また feed の自動発見(`<link rel="alternate">`)は SEO・被リンク面でも有効。

## 検討した選択肢

### A. link を Techblo の記事ページにする

- メリット: 滞在・計測を Techblo 内に取り込める
- デメリット: 集約者が元ブログの読者を奪う形になる。リーダー利用者は元記事へ行きたい

### B. link を元記事 URL、guid を Techblo 記事ページ URL にする

- メリット: 元ブログへの送客を優先できる。guid は不変の識別子として使え、重複通知を防げる
- デメリット: Techblo の記事ページ(AI要約)への導線は guid / description 経由に限られる

### カテゴリ絞り込みの置き場

- クエリ(`/feed.xml?category=ai`): 既存 `?category=` と揃い、不正キー無視のロジックを流用できる
- パス(`/categories/[key]/feed.xml`): 静的化しやすいが、ルートが増える

## 決定

- B を採用する。Techblo は集約者であり、元ブログへの送客を優先する。`source` / `dc:creator` に企業名を入れる。
- `/feed.xml`(全体、`?category=` で絞り込み)と `/companies/[slug]/feed.xml` を Route Handler で配信する。カテゴリはクエリ形式とし、不正キーは無視して全体フィードにする(`listFeed` と同じ検証)。
- データは既存の `'use cache'` 済み `getFeed` と `getSummariesByArticleIds` を再利用する。feed は ai-summary を import できないため、合成は app 層(`app/_feed/public-feed.ts`)で行う。description は AI要約 overview を優先し、無ければ RSS 抜粋。
- XML 生成は `lib/rss/build-feed-xml.ts` の純粋関数に分離し、エスケープ・制御文字除去を unit test で担保する。
- `Cache-Control: public, s-maxage=600, stale-while-revalidate=3600`。失敗時は 500 + `logger.error`。

## 結果

- ✅ 既存リーダーで Techblo / 企業 / カテゴリを購読できる
- ✅ DB 直叩きなし。キャッシュは feed タグの無効化に乗る
- ⚠️ 件数は固定 50 件。ページネーションは提供しない
- ❌ AI要約が無い記事は RSS 抜粋(無ければ description なし)

## 関連リソース

- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
