# ADR-0028: SEO ベースライン(robots / sitemap / 構造化データ)

- **状態**: Accepted
- **決定日**: 2026-06-17
- **関連**: ADR-0004(OGP), ADR-0011(デザイン刷新), ADR-0022(検索)

## 背景

ランディングページ(`/lp`)とドメイン設定が整い、公開フェーズに入った。
これまで `app/layout.tsx` の `metadata` で title/description/OGP/canonical の土台は
あったが、検索エンジンに対するクロール制御(robots.txt)とインデックス対象の提示
(sitemap.xml)、リッチリザルト向けの構造化データ(JSON-LD)が無く、検索流入の
準備が未完だった。

加えて、Vercel のプレビューデプロイ(デプロイ毎の URL)が検索結果に出ると、本番
ドメインと重複コンテンツになりインデックスを汚す懸念がある。

## 検討した選択肢

### A. App Router のファイル規約(`robots.ts` / `sitemap.ts`)+ JSON-LD コンポーネント

- `app/robots.ts`・`app/sitemap.ts` を追加。base URL は既存の `resolveBaseUrl()` を
  `lib/site-url.ts` に切り出して共有
- sitemap の記事 URL は `infrastructure` の Repository に lean な `listForSitemap`
  を足し、`web/queries.ts` 経由で取得(ADR-0010 のレイヤー境界を守る)
- 構造化データは `components/seo/json-ld.tsx` + `lib/seo.ts`(純粋ビルダ)で生成
- メリット: フレームワーク標準。型安全。キャッシュ(`'use cache'` + feed タグ)に乗る
- デメリット: 記事取得経路を1本増やす

### B. `public/robots.txt` と外部 sitemap 生成ツール

- 静的ファイルを手置き、または next-sitemap 等の生成ツールを導入
- メリット: 追加実装が少ない
- デメリット: 環境ごとの base URL 切替・記事の動的反映ができない。依存が増える

## 決定

A を採用する。

- **robots.txt**: 本番(`VERCEL_ENV=production`)のみ公開ページを許可し、認証・
  ユーザー固有ページ(`/login` `/signup` `/settings` `/bookmarks` `/favorites`)と
  `/api/` を拒否、sitemap を参照する。**プレビュー/開発は全拒否**にして本番ドメイン
  以外のインデックスを防ぐ
- **sitemap.xml**: 静的ページ(`/`, `/lp`)+ 直近の公開記事(`/a/[id]`、`lastmod` は
  `updatedAt`)。上限 10,000 件(Google の 50,000 URL 制限に余裕)。超過分はリンク
  辿りでクロールさせる
- **構造化データ**: トップに WebSite(SearchAction で `?q=` を提示。ADR-0022)+
  Organization、`/lp` に Organization、記事ページに Article を JSON-LD で埋め込む
- プライベートページの `noindex` は各ページの `metadata.robots` で既に対応済み

## 結果

- ✅ 検索エンジンがクロール範囲とインデックス対象を明確に把握できる
- ✅ プレビューデプロイが検索結果に出ない
- ✅ base URL 解決ロジックが1箇所(`lib/site-url.ts`)に集約された
- ⚠️ canonical/sitemap の base URL は本番で `NEXT_PUBLIC_APP_URL`(未設定時は Vercel
  提供ドメイン)に依存する。独自ドメインを使う場合は `NEXT_PUBLIC_APP_URL` の設定が必要
- ⚠️ Google Search Console への登録・所有権確認は外部作業(コード外)のため本対応の
  スコープ外
- ❌ sitemap は上限 10,000 件で、超過した古い記事は sitemap には載らない(リンク辿り
  に委ねる)

## 関連リソース

- [Next.js Metadata Files: robots / sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata)
- [schema.org: WebSite / Organization / Article](https://schema.org/)
