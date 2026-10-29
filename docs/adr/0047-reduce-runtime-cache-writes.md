# ADR-0047: Runtime Cache の書き込みを減らすため、記事ページの remote キャッシュを記事タグ + 長い寿命にする

- **状態**: Accepted
- **決定日**: 2026-10-29
- **関連**: ADR-0016, ADR-0037, ADR-0042

## 背景

ADR-0042 で記事本文・AI要約・関連記事を `'use cache: remote'`(Vercel Runtime Cache)に置いてから
約10日で、Hobby プランの Runtime Cache Writes(月 200,000 回)の 75% に達したと Vercel から通知が来た。
remote キャッシュはエントリの作成・再検証のたびに書き込みが1回走る。書き込みを増やしていたのは次の3点。

1. **関連記事が `feed` タグを持っていた**。`feed` は `/api/revalidate` 経由で、RSS 取込(毎時 :00)・
   ユーザー RSS 取込(:15)・要約生成(:10)・分類(:40)のたびに無効化される。そのため `cacheLife('days')`
   でも、閲覧された記事の数だけ 1 時間に最大 4 回書き直されていた。
2. **要約が無い記事を `'minutes'` で持っていた**。未生成だけでなく failed(以後も null のまま)の記事も、
   フィード・公開 RSS・記事ページで参照されるたびに、ほぼ毎分書き直されていた。
3. **記事本文・要約ありの寿命が `'hours'`**。閲覧・先読み・クローラーで触れた記事ごとに毎時書き直されていた。

## 検討した選択肢

### A. タグを記事単位にし、寿命を延ばす(採用)

- 関連記事のタグを `feed` → `article(id)`、記事本文に `article(id)` タグを追加し、寿命を延ばす
- メリット: remote の利点(インスタンス間共有・DB 往復なし)を保ったまま、書き込みが閲覧記事数 × 1日1回程度に収まる
- デメリット: 関連記事に新着が入るのは寿命切れ(最長1日)の再検証時になる。RSS 側で本文が更新された記事は最長1日古い

### B. 一覧系(フィードのカード・保存一覧・公開 RSS)の要約取得を in-memory の 'use cache' に戻す

- メリット: 一覧経路の書き込みがなくなる
- デメリット: ADR-0042 が解消した「1画面最大24本の要約クエリが Supabase に飛ぶ」状態に戻る。
  A で書き込みは記事あたり1日1回程度になるので、キーを共有する remote のほうが総量も少ない

### C. Pro プランにする

- デメリット: 書き込みの大半は無駄な再検証で、払う理由にならない

## 決定

A を採用する。

- `getRelatedArticles`: `cacheTag(feed)` → `cacheTag(article(id))`(`cacheLife('days')` は据え置き)。
  関連記事の主な入力は自記事の要約タグで、要約生成・分類の cron が `article(id)` を無効化する
- `getSummaryByArticleId`: 要約ありは `'hours'` → `'days'`、null は `'minutes'` → `'hours'`。
  要約生成 cron が生成した記事のタグを無効化するので、null の寿命は無効化が届かなかったときの保険でよい
- 記事ページの `loadArticle`: `cacheTag(article(id))` を付け、`'hours'` → `'days'`

## 結果

- ✅ 記事ページ系の remote キャッシュの書き込みが、閲覧された記事あたり1日1回程度(+ cron による無効化分)になる
- ✅ `loadArticle` が分類 cron の無効化を受けるようになり、カテゴリ変更が記事ページに即反映される
- ⚠️ 関連記事に新着記事が入るのは最長1日遅れる
- ⚠️ `/api/revalidate` が届かない(`REVALIDATE_SECRET` 未設定など)場合、新着記事の要約表示が最長1時間遅れる(従来は数分)
- ❌ RSS 側でタイトル・抜粋が更新された記事は、記事ページで最長1日古いまま

## 関連リソース

- Vercel Runtime Cache: https://vercel.com/docs/runtime-cache
- Next.js `cacheLife` の既定プロファイル(node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheLife.md)
