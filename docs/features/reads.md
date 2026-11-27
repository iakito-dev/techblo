# Feature: reads(既読管理)

## 概要

記事の既読を記録し、フィードを「未読 / 既読」で絞り込めるようにする。最近読んだ記事は閲覧履歴(`/history`)で見返せる(ADR-0041)。未読バッジ等のカード装飾は出さず、**ツールバーのフィルタ**で制御する(ADR-0021)。

## ユーザーストーリー

- ソフトウェアエンジニアとして、未読の記事だけ表示したい、なぜなら何を読んだか覚えていられないから
- ソフトウェアエンジニアとして、最近読んだ記事を見返したい、なぜなら保存し忘れた記事をもう一度開きたいから

## 画面/UI

- 「すべて / 未読 / 既読」フィルタ(`?read=unread|read`、既定 all)。デスクトップ=サイドバーの「フィルタ」、モバイル=絞り込みシートの「ステータス」で切り替える。タブレット(md〜lg)は切り替え UI を持たず、適用中のときだけツールバー下に「未読のみ ✕」/「既読のみ ✕」のチップで状態を見せて解除できる(`ActiveFilterChips`)
- カードに未読バッジ・既読 dim は **付けない**(フィルタのみ)
- 既読化は**記事ページ(`/a/[id]`)に着地したタイミング**(`ArticleViewTracker`、`trackArticleView` と同所)。フィードのカードに手動トグルは無し
- 既読を外すのは閲覧履歴の「閲覧履歴から削除」(✕)だけ(ADR-0049)。履歴と既読は同じ `reads` の行なので、消した記事は未読フィルタに戻る。画面は楽観的に消し、ログイン時に失敗したら戻してトースト。Undo は無し(付け直すと `readAt` が今になり並び位置が変わるため)
- 閲覧履歴 `/history`(`ReadingHistoryView`): 最近読んだ順に直近100件。ログイン時は JST の日付ごとに「今日 / 昨日 / M月D日(曜)」の見出しを付ける。タイトル・企業名・タグでの絞り込みと、カードからの保存トグルあり。ゲストは見出し無しで最後に開いた順
  - 導線: サイドバー「ライブラリ」/ モバイルは設定メニューの「閲覧履歴」行 / キーボード `g r`
  - 0 件の空状態(「まだ読んだ記事がありません」+「フィードを見る」)・絞り込み 0 件は、保存一覧・フィードの空状態と同じ見た目(角丸タイルのアイコン + ボタン)

## データモデル

- `reads(id, userId, articleId, readAt)` + `reads_user_article_uq (userId, articleId)`(重複防止 + 絞り込み索引を兼ねる)
- `readAt` は**最後に記事ページを開いた時刻**(再閲覧で更新。ゲスト移行の `addMany` では更新しない。ADR-0041)

## 設計の要点(ADR-0021)

- **bookmark/favorite と決定的に違う点**: 既読は全記事に及びうるので、全件 ID を取得してアプリで判定する方式(ADR-0013)はスケールしない。フィルタは **feed クエリ側の `EXISTS`/`NOT EXISTS`** で行う(`ListCriteria.readFilter`)。reads feature は全件取得 API を持たない。
- **キャッシュ**: フィルタ済みフィードは `getReadFilteredFeed`(per-user、tag=`[feed, userReads(uid)]`、`cacheLife('days')`)。既読化は `markReadAction` が `revalidateTag(userReads, 'max')` で遅延無効化(開くたびの再フェッチを避ける)。
- **閲覧履歴**(ADR-0041): `ReadRepository.listRecent` で `readAt` 降順の直近 `READ_HISTORY_LIMIT`(100)件だけ返す(全件一覧は持たない方針を維持)。`getRecentReads` は `'use cache'` しない(`userReads` の無効化が stale-while-revalidate なので、キャッシュすると今読んだ記事が出ない)。
- **ゲスト**(ADR-0017 と同型): 既読は localStorage(`techblo.guest.reads`。旧名 `corpex.guest.reads` は後方互換で読み込む)。再閲覧の ID は末尾へ移すので、配列順 = 最後に開いた順(閲覧履歴に使う)。サーバーから見えないのでフィルタは `FeedList` がクライアント側 hide。ログイン時に `GuestSavesMigrator` が DB へマージ。

## API / Server Action

```ts
// features/reads/web/actions.ts
markReadAction(articleId: string): Promise<Result<{ read: boolean }, CommonError>>   // 記事ページ着地で発火。未ログインは no-op
removeReadAction(articleId: string): Promise<Result<{ removed: boolean }, CommonError>>   // 閲覧履歴から削除(ADR-0049)。未ログインは UNAUTHORIZED、UUID 以外は VALIDATION
migrateGuestReads(articleIds: string[]): Promise<Result<{ merged: number }, CommonError>>  // ログイン時マージ(ADR-0017)

// features/reads/web/queries.ts
getRecentReads(userId): Promise<ReadHistoryEntryDto[]>   // 閲覧履歴。{ articleId, readAt(ISO) } を新しい順に最大100件

// features/feed/web/queries.ts(フィルタ本体は feed 側)
getReadFilteredFeed(userId, mode, input?): Promise<FeedPage>   // reads と EXISTS/NOT EXISTS で絞る
```

## ビジネスルール

- 既読化トリガ = 記事ページを開く(`ArticleViewTracker`)。冪等。再閲覧は `readAt` を進めるだけ。既読を外すのは閲覧履歴からの削除だけ(ADR-0049)
- フィルタ unread = reads に無い記事、read = reads にある記事
- ログイン = サーバー SQL 絞り込み(正しいページネーション)、ゲスト = クライアント hide(可視件数は変動)
- ゲストのクライアント hide は、該当が少ないと番兵が画面内に残り続けて自動読み込みが全ページを取り切るまで Server Action を連発していた(既読 0 件の `?read=read` で全ページ取得 → 何も出ない白紙)。`isGuestReadFilterStalled`(`app/_composition/article/feed-infinite-scroll.ts`)で自動読み込みを止める: 既読 0 件の既読フィルタは読み込まない(「もっと読む」も出さない)、表示が増えないページが 3 連続したら自動では止めて「もっと読む」の手動に任せる。表示が 0 件で読み進める先が無い(または止めた)ときは feed の絞り込み空状態(`FeedFilteredEmptyState`)を出す
- 既読フィルタ(`?read=read`)で、localStorage の既読記事がすべて一覧に出そろったら(`areAllGuestReadsShown`。既読 0 件も含む)、自動読み込みも「もっと読む」も止める。一致しうるのは既読 ID の記事だけなので、それ以上取っても増えない。以前は既読 0 件のときしか止めず、既読が数件だと全部出たあとも空ページを取り続け(サンドボックスの既読 8 件で 6 回)、「もっと読む」を押すとフィード全体を読み進めていた。既読 ID に削除済み・非表示企業や他の絞り込みで外れる記事が含まれると出そろわないので、その場合は従来の空ページ連続の打ち切りに任せる

## 関連

- ADR-0021(既読管理は feed クエリ側で SQL 絞り込み)
- ADR-0041(閲覧履歴を readAt から提供)
- ADR-0049(閲覧履歴から削除 = 既読を外す)
- ADR-0017(ゲスト保存→ログインでマージ)、ADR-0016(user-scoped cache)
- 機能: feed(フィルタ UI とクエリの実体)
