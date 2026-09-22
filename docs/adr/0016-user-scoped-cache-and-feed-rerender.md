# ADR-0016: フィードのユーザー単位キャッシュと再マウント回避

- **状態**: Accepted
- **決定日**: 2026-06-04
- **関連**: ADR-0013 (オフセットページネーション + フィードキャッシュ), ADR-0010 (feature 内4層)

## 背景

「ソート/期間/企業の切替時にカクつく」「初回表示・リロードが遅い」という体感の相談を起点に、計測で原因を切り分けた。

- 記事 **451件・企業15社**。人気順(時間減衰スコア)の全件 seq scan + top-N heapsort でも `EXPLAIN ANALYZE` の実行時間は **7.3ms**。
  → **DB クエリ・インデックス・スコア事前計算は現規模では効果がない**(plannerも seq scan を選ぶ)。
- 真因は2系統だった:
  1. **データフェッチの往復**: `getFeedPageData`(`components/article/feed-load-more.tsx`)が呼ぶ `getCompanies` と、ユーザー単位の `getBookmarkedArticleIds` / `getFavoritedArticleIds` / `getEnabledCompanyIds`(`getSubscriptionSettings`)が **すべて未キャッシュ**。neon-http はプール無し・各クエリ個別 fetch のため、切替・初回のたびに Neon HTTP 往復が積み上がっていた。
  2. **フロント再マウント**: `app/page.tsx` が `FeedList` に `key={sort-period-company}` を付けており、切替のたびに全カードの DOM を破棄→再生成していた。
- 加えて `setBookmarkAction` / `setFavoriteAction` が `revalidatePath('/')` を呼んでおり、**ゲスト共通の `getFeed` キャッシュまで巻き添えでパージ**していた。`toggleSubscriptionAction` は逆に `/` を無効化しておらず、**購読変更がトップフィードに反映されない**バグもあった。

ADR-0013 の積み残し(「ログインユーザー個別フィルタを入れるとキャッシュ戦略が別途必要」「無効化は時間ベース」)に正面から答える必要があった。

## 検討した選択肢

### A. DB クエリ/インデックス最適化

- スコア事前計算カラム、部分インデックス、count 近似など
- 計測上 7.3ms で**ボトルネックではない**。投資対効果ゼロ。現規模では却下(1万件級になれば ADR-0013 の keyset 回帰と併せて再検討)

### B. ユーザー単位キャッシュ + 再マウント回避(採用)

- 末端 query を `'use cache'` 化し、ユーザー単位タグで無効化
- フロントは再マウントをやめ DOM を保持、行を memo 化
- 切替先を prefetch で先読み

## 決定

**B** を採用。DB は触らない。

**キャッシュ(`'use cache'`)**

- `getCompanies` を `cacheTag(companies)` + `cacheLife('days')`(ゲスト共通・ほぼ不変)
- `getBookmarkedArticleIds` / `getFavoritedArticleIds` / `getSubscriptionSettings` を **`userId` 引数をキーに** `'use cache'` 化。ユーザー単位タグ `user-bookmarks-{uid}` / `user-favorites-{uid}` / `user-subscriptions-{uid}`(`lib/cache/tags.ts`)+ `cacheLife('minutes')`
- 各 Server Action の `revalidatePath('/')` を **`updateTag(ユーザータグ)` に置換**。`toggleSubscriptionAction` にも追加し、購読反映バグを解消。`/bookmarks` `/favorites` `/settings` 各ページの `revalidatePath` は据え置き
- `getFeedPageData`/`getFeed` は `pageSize()` が `headers()` を読むため丸ごと `'use cache'` 化できない。**キャッシュは末端 query 単位**で付ける

**フロント**

- `FeedList` の `key` を撤廃。`sort/period/company` の変化は **render 中の派生 state リセット**(React 公式「You Might Not Need an Effect」パターン)で同期し、カード DOM を保ったまま中身を差し替える
- 行を `FeedRow` として `memo` 化、`ArticleCard` も `React.memo` 化。`loadMore` の追記時に既存行を再描画しない
- `useFeedSort` / `useFeedPeriod` に `prefetch` を追加し、`SortControl` のボタンの `onMouseEnter`/`onFocus` で切替先 RSC を温める

## 結果

- ✅ 切替・初回・リロードの Neon 往復が激減(`getFeedPageData` の `Promise.all` が全ヒット化)
- ✅ bookmark/favorite トグルによる feed キャッシュの巻き添えパージを解消
- ✅ 購読 ON/OFF がトップフィードに反映されるようになった(バグ修正)
- ✅ 切替時の全カード DOM 破棄→再生成を解消
- ⚠️ ユーザー単位キャッシュはログインユーザー数ぶんエントリが増える(現規模では無害)
- ⚠️ `cacheLife('minutes')` の範囲で stale になりうる。操作直後は `updateTag` の read-your-own-writes で整合
- ⚠️ 引数なしの `getCompanies` を `'use cache'` 化すると、PPR のビルド時プリレンダで評価され**ビルド時に DB 接続を要する**(CI など DB 非到達の環境で build が落ちる)。対策として、`getFeedFilterCompanies` で `getSession()`(cookies=動的)を `getCompanies()` より**先に await** し、ビルド時プリレンダを動的境界で中断させて `getCompanies` をビルド時に評価させない。ランタイムでは通常どおりキャッシュが効く。`getFeed` 等は元から `headers()`/引数経由で動的なため影響なし
- ❌ View Transitions は React 安定版(19.2)に `unstable_ViewTransition` の型が無く(experimental チャンネル限定)、今回は見送り。React 側で安定提供されたら再検討

## 追補(2026-06-04)

保存/お気に入りページ(`/bookmarks` `/favorites`)で残っていた未キャッシュ往復を解消。ID 一覧(`getBookmarkedArticleIds` / `getFavoritedArticleIds`)はキャッシュ済みだったが、その ID から記事本体を引く `getArticlesByIds`(`features/feed/web/queries.ts`)が未キャッシュで、表示のたびに `articles innerJoin companies` を Neon に往復していた。本 ADR と同方針で `'use cache'` 化(`ids` 配列をキー、`cacheTag(feed)` + `cacheLife('minutes')`)。保存トグルで ids が変わればキーも変わり最新を引き、新規取り込みは feed タグ無効化で反映される。

## 追補: 初回スケルトンの除去(ADR-0019, 2026-06-07)

本 ADR で切替・リロードの往復は解消したが、初回ロードの `FeedGridSkeleton` は残っていた
(`SubscribedFeed` が searchParams/cookie/headers を読む動的 hole のため)。ADR-0019 で、動的
`SubscribedFeed` の **Suspense フォールバックを「スケルトン」から「既定フィードの実コンテンツ」
(`DefaultFeed`)に置換**し、初回からスケルトンを挟まない静的プリレンダにした。本 ADR が選んだ
「URL 駆動 + `startTransition` + prefetch」の切替方式はそのまま維持(遷移中は旧コンテンツを保持するので
フォールバックには戻らない)。詳細は ADR-0019。

## 関連リソース

- `features/feed/web/queries.ts`(`getCompanies` の `'use cache'`)
- `features/{bookmarks,favorites,subscriptions}/web/queries.ts` / `actions.ts`(ユーザータグ cacheTag/updateTag)
- `lib/cache/tags.ts`(ユーザータグ定義)
- `components/article/feed-list.tsx`(派生 state リセット・`FeedRow` memo)
- `features/feed/web/view-models/use-feed-sort.ts` / `use-feed-period.ts`(prefetch)
- `app/page.tsx`(`key` 撤廃)
