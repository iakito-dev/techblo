# ADR-0030: 企業ページ(/companies)による SEO 集客面の追加

- **状態**: Accepted
- **決定日**: 2026-06-18
- **関連**: ADR-0028(SEO ベースライン), ADR-0013(記事合成), ADR-0010(レイヤー), ADR-0022(検索), ADR-0027(タグ絞り込み)

## 背景

ADR-0028 で robots / sitemap / 構造化データの土台は整ったが、インデックス対象は
トップ(`/`)・LP(`/lp`)・記事プレビュー(`/a/[id]`)のみだった。

本サービスは「企業の公式技術ブログを集約する」のが核であり、検索需要の中心は
「〇〇 技術ブログ」「〇〇 テックブログ」のような**企業名 × 技術ブログ**のロングテール。
ところが企業フィルタは `/?company=slug` のクエリパラメータでしか表現されておらず、

- クエリ違いは canonical 重複・クロール枠の浪費になるためインデックスさせたくない
- 結果として企業単位の安定した着地ページが1枚も存在しない

という状態で、最も太い検索導線を丸ごと取りこぼしていた。記事ページ(`/a/[id]`)は
件数こそ多いが1記事の抜粋中心で薄く、単体では順位が不安定になりやすい。

## 検討した選択肢

### A. 企業ごとの専用ページ `/companies/[slug]` + ハブ `/companies` を新設

- 企業名 + 紹介文 + その企業の記事一覧(購読スコープ非依存)を持つ公開ページ
- `/companies` を全企業へのリンク集約ハブにして内部リンク・クローラビリティを担保
- メタデータ(title「〇〇の技術ブログ記事まとめ」/ canonical / OG)、JSON-LD
  (`CollectionPage` + `BreadcrumbList`、ハブは企業 `ItemList`)、sitemap 追加
- feed feature の4層を拡張(新 feature は作らない): `CompanyRepository.findBySlug` →
  `get-company` usecase → `getCompanyBySlug` query
- メリット: 検索意図に直結。URL にキーワードが乗る。記事ページより内容が厚く安定
- デメリット: ルート・合成・ドキュメントの追加コスト

### B. `/?company=slug` をインデックス許可する

- 既存のクエリ絞り込みをそのまま canonical 化してインデックスさせる
- メリット: 実装ゼロ
- デメリット: クエリの組み合わせ(sort×period×company×tag)で URL が膨らみ重複・薄い
  ページを量産する。タイトル/説明/構造化データを企業ごとに最適化できない

## 決定

A を採用する。

- ルート: `/companies`(ハブ)と `/companies/[slug]`(企業ページ)。記事ページ `/a/[id]` の
  企業名を `/companies/[slug]` へ内部リンクし、クロール経路と内部リンクを強化する
- **購読スコープ非依存**: 企業ページは公開ランディングなので、ログインユーザーの購読設定に
  関わらずその企業の全記事を見せる。`getFeedPageData`(購読スコープを掛ける)ではなく、
  ゲスト共通でキャッシュ済みの `getFeed(companyIds=[id])` を使う専用合成
  `getCompanyArticles` を `components/article/feed-load-more.tsx` に追加する(ADR-0013 と同じ
  app 層合成点。ログイン時のみ保存状態 bm/fav を上乗せ、AI要約も合成)
- 初版は**初期 30 件を SSR する静的グリッド**(`CompanyArticleGrid`)とし、無限スクロールは
  載せない。フィードの load-more 経路(`loadMoreFeed`)は購読スコープ前提のため流用すると
  企業ページの「全記事」要件と食い違う。スクロール追従は後続で専用経路を足す余地を残す
- キャッシュ: `getCompanyBySlug` は企業マスタ更新が稀なため `companies` タグ + 記事数鮮度の
  ため `feed` タグで `'days'`。記事一覧は既存の `getFeed`('days' + 取込イベント無効化)に乗る
- 構造化データ: 企業ページは `CollectionPage`(about=発信元 Organization / mainEntity=記事
  ItemList)+ `BreadcrumbList`、ハブは `CollectionPage`(企業 ItemList)
- sitemap: `/companies` と各 `/companies/[slug]` を追加(weekly、priority 0.7〜0.8)
- robots は `/companies` を `allow: '/'` で既に許可済みのため変更しない

## 結果

- ✅ 「企業名 × 技術ブログ」のロングテール検索に対する着地ページを企業数ぶん獲得
- ✅ 記事ページ・トップへの内部リンクが増え、クロール/オーソリティの巡りが良くなる
- ✅ feed feature の4層に収め、新 feature を増やさず ADR-0010 の依存方向を維持
- ⚠️ 企業の `description` が未設定だと一般的な定型文で代替する(企業ごとに埋めると効果増)
- ⚠️ 企業ページの記事一覧は初期 30 件のみ(全件回遊はトップの企業フィルタ/sitemap に委ねる)
- ❌ 無限スクロール非対応(購読スコープと衝突しない専用 load-more は後続課題)

## 関連リソース

- [schema.org: CollectionPage / BreadcrumbList / ItemList](https://schema.org/)
- [Next.js generateMetadata / sitemap](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
