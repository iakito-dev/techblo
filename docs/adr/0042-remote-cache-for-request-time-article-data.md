# ADR-0042: 記事ページの本文を共有キャッシュ + 操作時の先読みで速くし、クライアントから zod を外す

- **状態**: Accepted
- **決定日**: 2026-10-19
- **関連**: ADR-0016, ADR-0019, ADR-0034, ADR-0036, ADR-0037

## 背景

記事ページ(`/a/[id]`)の表示が遅いという声があった。調べると次の3点が重なっていた。

1. **キャッシュがインスタンスをまたがない**。`/a/[id]` はビルドで静的シェル(枠と skeleton)だけが
   プリレンダされ、本文はリクエスト時に描画される(◐ Partial Prerender)。本文の取得
   (`loadArticle` / `getSummaryByArticleId` / `getRelatedArticles`)は `'use cache'` だが、これは
   in-memory のキャッシュで、Vercel のサーバーレスではインスタンスごとに空から始まる
   (Next.js のドキュメントも「静的シェルの外では利用率が低い」と明記している)。そのため実際には
   記事を開くたびに Supabase まで往復していた。特に関連記事は ready 要約を全件走査するクエリで、
   ADR-0037 の「キャッシュで1記事1回の走査に抑える」前提が成り立っていなかった。
2. **取得が直列**。記事 → AI要約 → 関連記事の順に、前の結果を待ってから次を引いていた
   (どれも記事 id だけで引ける)。キャッシュミス時は DB 往復が3回積み上がる。
3. **本文が先読みされていなかった**。カードのリンクは prefetch の既定(auto)で、動的ルートの
   `/a/[id]` は loading 境界(枠と skeleton)までしか先読みされない。タップしてから本文を取りに行く。
4. **zod 全体が全ページの JS に載っていた**。`shared/categories.ts` が `z.enum` でカテゴリを
   定義しており、サイドバーやフィード見出しなどクライアントコンポーネントがこのモジュールを読むため、
   zod 本体(約 285KB / gzip 65KB)がクライアントバンドルに入っていた。

## 検討した選択肢

### A. 記事ページの取得だけ 'use cache: remote' にする(採用)

- リクエスト時に描画される記事本文・AI要約・関連記事の取得を Vercel Runtime Cache に置く
- メリット: インスタンスをまたいで共有され、2回目以降は誰が開いても DB に行かない。タグ無効化
  (`revalidateTag` / `updateTag`)もそのまま効く。ローカル(`next dev` / `next start`)は
  remote ハンドラ未設定なので従来どおり in-memory で動く
- デメリット: キャッシュヒット時もネットワーク越しの参照が1回入る。Runtime Cache の使用量が増える

### B. generateStaticParams で直近の記事をビルド時にプリレンダする

- メリット: CDN から即返る
- デメリット: ビルド時に DB 接続が要る(CI はダミーの DATABASE_URL でビルドしている)。
  新着はビルド後に増えるので結局リクエスト時の経路が残る

### C. 全 'use cache' を remote にする

- デメリット: 既定フィードなど静的シェルに焼かれる取得は in-memory で十分で、remote にしても
  速くならない(ドキュメントの「静的シェルには 'use cache' で足りる」)。ユーザー単位のキャッシュは
  キー数がユーザー数に比例し、共有の利点が薄い

## 決定

- A を採用する。対象は `loadArticle`(記事ページ)・`getSummaryByArticleId`・`getRelatedArticles`。
  `getSummaryByArticleId` は「もっと読む」やブックマーク一覧など、リクエスト時に最大 24 件まとめて
  引く経路でも使われるので、そちらも同じ恩恵を受ける。
- 記事と AI要約は `Promise.all` で並列に取得し、関連記事は本文の取得前に投げておく
  (表示は従来どおり別の Suspense でストリーム)。
- 記事ページへのリンク(カード・イベント行・関連記事)に `unstable_dynamicOnHover` を付け、
  `experimental.dynamicOnHover` を有効にする。画面内に入った時点では従来どおり枠だけを先読みし、
  hover / touchstart の時点で本文まで含めた full prefetch に切り替える。`prefetch={true}` で
  画面内の全カードを full prefetch する案は、スクロールするだけでカードの数だけサーバー呼び出しが
  走るため採らない(本文は remote キャッシュなので、操作時の1件の先読みは安く返る)。
- `shared/categories.ts` を zod 非依存にし(`ARTICLE_CATEGORIES` + `isArticleCategory`)、
  Zod スキーマは `shared/category-schema.ts` に分ける。クライアントから読まれるコードは
  `isArticleCategory` を使う。

## 結果

- ✅ 記事ページの本文取得が、2人目以降・別インスタンスでも DB 往復なしになる
- ✅ hover(デスクトップ)/ タッチ開始(モバイル)からクリックまでの間に本文の取得が進み、
  多くの場合タップ直後に本文が出る
- ⚠️ `unstable_dynamicOnHover` / `experimental.dynamicOnHover` は実験的 API。Next.js の更新で
  名前や挙動が変わったら追従する(外しても既定の先読みに戻るだけで壊れない)
- ⚠️ モバイルではスクロール開始の touchstart でも先読みが走るので、触れたカードの分だけ
  サーバー呼び出しが増える
- ✅ キャッシュミス時の往復が「記事 → 要約 → 関連」の直列3段から並列1段になる
- ✅ 記事ページが読み込む JS が gzip 401KB → 337KB(-64KB、約16%減)、トップも 445KB → 381KB
- ⚠️ Runtime Cache の使用量(読み書き)が増える。Vercel の使用量ページで様子を見る
- ⚠️ remote のエントリはデプロイをまたがない(キーに buildId が入る)。デプロイ直後は初回だけ DB に行く
- ❌ キャッシュヒット時も Runtime Cache への参照が1回入る(in-memory ヒットよりは遅い)

## 関連リソース

- Next.js `'use cache: remote'`(node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-remote.md)
- Vercel Runtime Cache: https://vercel.com/docs/runtime-cache
