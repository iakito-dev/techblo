# ADR-0013: フィードはオフセットページネーション + キャッシュ

- **状態**: Accepted
- **決定日**: 2026-06-02
- **関連**: ADR-0009 (データモデル), performance.md

## 背景

公開フィードのページネーションは当初 keyset(cursor)方式で実装していた
(`performance.md` に「OFFSET は遅いので使わない」と明記)。

しかし運用上、以下の課題が出た:

- カーソルは `{publishedAt, id}` を base64 化した長い文字列で、`?pg=` の URL が読みづらく長い
- 数字ページ(1 2 3 …)を出せない(keyset は前後移動が基本)
- popular ソートは集計値が動くため安定カーソルを張れず、ページングできなかった

一方で本サービスの規模は **6社・記事数百件**程度で、OFFSET の弱点(大きな offset でのスキャン)は顕在化しない。
むしろ毎リクエストで DB に当たること(キャッシュ未導入)の方が体感速度に効いていた。

## 検討した選択肢

### A. keyset(cursor)を維持

- 大規模データで高速・安定
- URL が長い、数字ページ不可、popular 非対応
- 現規模ではメリットを活かせない

### B. オフセット(`?page=N`)+ キャッシュ(採用)

- `?page=2` と URL が短く、数字ページャーを出せる
- popular もページング可能(offset は順序を問わない)
- OFFSET の弱点は現規模では無視できる
- 公開フィードはゲスト共通なのでキャッシュが効く

## 決定

**B. オフセットページネーション + フィードキャッシュ** を採用。

- ページングは `?page=N`(1 始まり)。総件数を数えて総ページ数を算出し、範囲外は最終ページに丸める
- `count` と `list` は並列実行(直列の往復を削減)
- 公開フィード取得 `getFeed(sort, page, limit)` を `'use cache'` 化。`cacheTag('feed')` + `cacheLife('minutes')` で時間ベース再検証
- 1ページ表示数は端末別(mobile 6 / tablet 8 / desktop 12)

## 結果

- ✅ URL が短く読みやすい(`?page=2`)、数字ページUIを提供できる
- ✅ popular もページング可能になった
- ✅ キャッシュ + 並列化で体感が大きく改善(dev ウォーム ~0.5s → ~0.08s)
- ✅ `performance.md` の keyset 前提を本 ADR で更新
- ⚠️ OFFSET はデータ規模が大きくなると劣化する。1万件級になれば keyset への回帰を再検討(ADR-0009 の方針とも整合)
- ⚠️ 現状の無効化は時間ベース。RSS 取得をルート/Trigger 化したら `revalidateTag('feed')` で即時無効化する(タグは付与済み)
- ⚠️ ログインユーザー個別フィルタを入れる場合、`companyIds` がキーに入りキャッシュヒット率が下がる。別途キャッシュ戦略が必要

## 追補: ページング UI を「もっと読む」に変更

数字ページャー(`feed-pager.tsx`)は、時系列のブラウジング型フィードでは「毎回最下部まで送って番号を押す」動線が重く、ページ番号にも意味が薄かった。閲覧体験を優先し、UI を **「もっと読む」ボタン**(クリックで末尾に追記)へ変更した。

- データ取得は**オフセット(page N)のまま**。本 ADR のページ算出・キャッシュ戦略は不変
- 初期ページは RSC が SSR(SEO 維持)、続きは Server Action `loadMoreFeed` が**サーバ側で合成したカード(保存系アクション込みの RSC ペイロード)**を返し、クライアントが末尾へ追記
- 合成(feed + bookmarks/favorites + auth)は app 層の `components/article/feed-load-more.tsx`(RSC 初期表示と Server Action で再利用)。クライアント追記は `components/article/feed-list.tsx`
- 数字ページャー(`feed-pager.tsx`)は廃止
- トレードオフ: 特定ページへの深リンク(`?page=N`)は廃止(フィードでは番号共有の価値が低い)。SEO は SSR 初期ページが担保

## 追補: count(*) 廃止 → limit+1(2026-06-07)

数字ページャー廃止後、総件数(`totalPages`/`totalItems`)は **`hasMore` 判定にしか使われていなかった**。
そこで `count(*)` クエリを廃し、`list` で **`limit + 1` 件取得 → 余りの有無で `hasMore`** を判定する方式へ変更。

- `FeedPage` から `totalPages`/`totalItems` を削除し `hasMore: boolean` を追加。`ArticleRepository.count` と
  `CountCriteria` を削除(`features/feed/application/list-feed.ts` / `domain/article-repository.ts`)。
- 範囲外ページのクランプ(総数依存)は廃止。深リンク `?page=N` は既に廃止済み・`loadMore` は page=1 から
  順次なので、範囲外は空 + `hasMore=false` で十分。
- 端末別の1ページ表示数(mobile 6 / tablet 8 / desktop 12)は **固定 12** に変更(`INITIAL_PAGE_SIZE`)。
  `userAgent(headers())` 依存を外して `getFeedPageData` の動的依存を減らし、`getFeed` キャッシュの断片化も解消
  (ADR-0019 の静的プリレンダの前提)。列数の端数はレスポンシブグリッドが吸収する。

## 関連リソース

- `features/feed/application/list-feed.ts`(limit+1 で hasMore 判定)
- `features/feed/web/queries.ts`(`'use cache'` + タグ)
- `components/article/feed-load-more.tsx` / `feed-list.tsx`(「もっと読む」)
