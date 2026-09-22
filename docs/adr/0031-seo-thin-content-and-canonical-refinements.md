# ADR-0031: SEO 改善(記事ページの薄コンテンツ対策・トップ canonical・GSC 確認)

- **状態**: Accepted
- **決定日**: 2026-06-18
- **関連**: ADR-0028(SEO ベースライン), ADR-0030(企業ページ), ADR-0026(AI要約), ADR-0022(検索)

## 背景

ADR-0028 / ADR-0030 でクロール制御・サイトマップ・企業ページが揃い、インデックスの
準備は整った。一方で、実際に検索流入を得るうえで残課題が3つあった。

1. **記事ページ `/a/[id]` が薄い**: 表示は RSS 抜粋(`article.description`)のみで、元記事の
   複製に近い。sitemap に1,000件超が載るが、独自価値が乏しくアグリゲータの薄いページとして
   低評価/インデックス除外されるリスクがある。一方で AI要約(ADR-0026)という独自テキストは
   既に生成済みなのに、記事ダイアログ内でしか使われていなかった。
2. **トップ `/` のクエリ重複**: `?sort=` `?company=` `?period=` `?tag=` `?q=` の組み合わせで
   無数の URL バリアントが生まれ得るが、canonical が無くインデックスが分散しクロール枠を浪費する。
3. **Google Search Console (GSC) 未確認**: 所有権確認の口がコード上に無かった。

## 検討した選択肢

### 記事ページの薄さ

- **A. AI要約を本文・meta description・JSON-LD に昇格**: 既存の要約を `/a/[id]` 本文に
  `SummaryView` で描画し、説明文も要約優先(無ければ抜粋)にする。追加生成コストゼロで独自性を付与
- **B. `/a/[id]` を noindex にして sitemap から外す**: 薄さを認めて検索対象から外す。流入機会を捨てる
- → A。要約は独自テキストで価値があり、流入面を残せる

### トップのクエリ重複

- **A. 自己参照 canonical `/` 固定 + `?q=` を noindex**: 全パラメータ違いを `/` の重複として
  正規化し、検索結果ページだけ明示的に除外する
- **B. robots でパラメータを Disallow**: クロール自体を止める。canonical より粗く、内部リンク評価も切る
- → A。企業/タグ別の検索面は専用ページ(/companies 等)に分離する方針と整合する

## 決定

- 記事ページ `/a/[id]`:
  - 本文に AI要約(`SummaryView`)を描画(要約がある記事のみ)
  - `meta description` と Article JSON-LD の `description` を **AI要約 `overview` 優先**(無ければ
    RSS 抜粋)にする。要約は composition root の `getSummaryByArticleId`(記事単位タグでキャッシュ)で取得
- トップ `/`:
  - `generateMetadata` で **canonical を常に `/`**(クエリ無し)に固定
  - `?q=`(検索結果)のときのみ `robots: { index: false, follow: true }`
- GSC: `app/layout.tsx` の `metadata.verification.google` を環境変数
  `GOOGLE_SITE_VERIFICATION` から読む(未設定ならタグ無し)。DNS TXT 方式なら不要

## 結果

- ✅ 記事ページが独自テキスト(AI要約)を持ち、薄コンテンツ評価のリスクが下がる
- ✅ トップのパラメータ違いが `/` に集約され、検索結果ページはインデックスされない
- ✅ GSC の HTMLメタタグ確認をコード変更なし(環境変数のみ)で有効化できる
- ⚠️ AI要約が未生成の記事は従来どおり抜粋のみ(生成の進捗に依存)
- ⚠️ canonical を `/` 固定にしたため、`?company=`/`?tag=` のフィルタ結果は単独ではインデックス
  されない(意図どおり。個別面は /companies・将来のタグページが担う)

## 関連リソース

- [Google: Consolidate duplicate URLs (canonical)](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Next.js Metadata: verification / robots / alternates](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
