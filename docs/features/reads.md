# Feature: reads(既読管理)

## 概要

記事の既読を記録し、フィードを「未読 / 既読」で絞り込めるようにする。最近読んだ記事は閲覧履歴(`/history`)で見返せる(ADR-0041)。未読バッジ等のカード装飾は出さず、**ツールバーのフィルタ**で制御する(ADR-0021)。

## ユーザーストーリー

- ソフトウェアエンジニアとして、未読の記事だけ表示したい、なぜなら何を読んだか覚えていられないから
- ソフトウェアエンジニアとして、最近読んだ記事を見返したい、なぜなら保存し忘れた記事をもう一度開きたいから

## 画面/UI

- ツールバー(デスクトップ=`FeedHeader`、モバイル=`FeedControls`)に「すべて / 未読 / 既読」フィルタ(`?read=unread|read`、既定 all)
- カードに未読バッジ・既読 dim は **付けない**(フィルタのみ)
- 既読化は**記事ページ(`/a/[id]`)に着地したタイミング**(`ArticleViewTracker`、`trackArticleView` と同所)。手動トグルは無し
- 閲覧履歴 `/history`(`ReadingHistoryView`): 最近読んだ順に直近100件。ログイン時は JST の日付ごとに「今日 / 昨日 / M月D日(曜)」の見出しを付ける。タイトル・企業名・タグでの絞り込みと、カードからの保存トグルあり。ゲストは見出し無しで最後に開いた順
  - 導線: サイドバー「ライブラリ」/ モバイルは設定メニューの「閲覧履歴」行 / キーボード `g r`

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
migrateGuestReads(articleIds: string[]): Promise<Result<{ merged: number }, CommonError>>  // ログイン時マージ(ADR-0017)

// features/reads/web/queries.ts
getRecentReads(userId): Promise<ReadHistoryEntryDto[]>   // 閲覧履歴。{ articleId, readAt(ISO) } を新しい順に最大100件

// features/feed/web/queries.ts(フィルタ本体は feed 側)
getReadFilteredFeed(userId, mode, input?): Promise<FeedPage>   // reads と EXISTS/NOT EXISTS で絞る
```

## ビジネスルール

- 既読化トリガ = 記事ページを開く(`ArticleViewTracker`)。冪等(既読を外す操作は無い)。再閲覧は `readAt` を進めるだけ
- フィルタ unread = reads に無い記事、read = reads にある記事
- ログイン = サーバー SQL 絞り込み(正しいページネーション)、ゲスト = クライアント hide(可視件数は変動)

## 関連

- ADR-0021(既読管理は feed クエリ側で SQL 絞り込み)
- ADR-0041(閲覧履歴を readAt から提供)
- ADR-0017(ゲスト保存→ログインでマージ)、ADR-0016(user-scoped cache)
- 機能: feed(フィルタ UI とクエリの実体)
