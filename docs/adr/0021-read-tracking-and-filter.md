# ADR-0021: 既読管理は「表示中ID集合に絞る」ではなく feed クエリ側で SQL 絞り込み

- **状態**: Accepted
- **決定日**: 2026-06-10
- **関連**: ADR-0006(bookmark/favorite 2層), ADR-0013(横断合成), ADR-0016(user-scoped cache), ADR-0017(ゲスト保存→ログインでマージ), ADR-0019(静的プリレンダ)

## 背景

「未読の記事が分かりたい」(feed のユーザーストーリー)に応えるため、記事の既読管理を追加する。要件は:

- **既読化のトリガ**: 記事ダイアログを開いたタイミング(既存 `trackArticleView` と同所)
- **UI**: 未読バッジは出さない。代わりにツールバーの**フィルタ(すべて/未読/既読)でフィードを絞り込む**
- 手動の既読/未読トグルは無し(自動マークのみ)

既読は bookmark/favorite と同型(per-user の article 紐付け、ゲストは localStorage、ログインでマージ。ADR-0017)に見える。しかし決定的に違う点が1つある:

- bookmark/favorite は**ユーザーが明示的に保存した数十件**。`listArticleIds` で全件 ID を取得し、表示時に `Set.has` で判定できる(ADR-0013)。
- 既読は**フィードを開いただけで数百〜数千件に膨らみうる**。全件 ID をメモリに乗せて判定する方式はスケールしない。さらに今回の UI は「バッジ表示」ではなく「フィルタ(絞り込み)」なので、表示用に既読集合を持つ必要すらない。

## 検討した選択肢

### A. bookmark/favorite と完全同型(全件既読 ID を取得し、アプリ側で絞る)

- 既存パターンの単純コピーで実装は早い
- ❌ 全件既読 ID の取得・転送・メモリ保持がユーザーの閲覧量に比例して増える
- ❌ フィルタ(未読のみ表示)だと「全件取得 → アプリで除外 → ページ数不足」でページネーションが破綻する

### B. feed クエリ側で SQL 絞り込み(採用)

- 未読 = `NOT EXISTS (reads where userId, articleId)`、既読 = `EXISTS(...)` を記事一覧クエリに足す
- `reads_user_article_uq (userId, articleId)` 索引に乗る相関サブクエリ。既読集合を一切アプリに持ち込まない
- オフセットページネーションが正しく成立する(絞り込み後の N 件を DB が返す)
- ⚠️ feed のクエリ/キャッシュが per-user になる(ゲスト共通の `getFeed` とは別経路 `getReadFilteredFeed`)

### ゲストの扱い

ゲストの既読は localStorage にあり**サーバーからは見えない**ため、SQL で絞れない。

- **採用**: フィルタ時のみ FeedList が**クライアント側で hide**(localStorage の既読集合で表示を絞る)。サーバーは全件返し、クライアントが隠す。ADR-0017 のゲスト割り切り(端末ローカル・即時性は要らない)と整合。

## 決定

**B** を採用。既読フィルタは feed のクエリに `readFilter: { userId, mode }` を足し、infrastructure 層で `EXISTS`/`NOT EXISTS` を組む。

- **テーブル**: `reads(userId, articleId, readAt)` + `reads_user_article_uq (userId, articleId)`。unique 索引が重複防止と絞り込み索引を兼ねる。
- **reads feature**: mark(冪等 add)とゲストマージのみ。**一覧/全件取得 API は持たない**(バッジ非表示なので表示用クエリも不要)。
- **フィルタ済み feed**: `getReadFilteredFeed(userId, mode, input)` を per-user に `'use cache'`。タグは `[feed, userReads(userId)]` の2つで、新着取込(feed)・既読化(userReads)のどちらでも無効化される。`cacheLife('days')`。
- **既読化の無効化**: `markReadAction` は `revalidateTag(userReads, 'max')` の**遅延無効化**を使う(`updateTag` ではない)。記事を開くたびに現ルートを再フェッチさせない。未読フィルタ中に開いた記事は次のロードで落ちる(即座に消えない)が、開いた直後に消えるジャンクを避けられて UX 上もよい。
- **既読化トリガ**: `ArticleCard` に `onOpen` フックを足し(feed は reads を import しない・ADR-0002/0013)、app 層の `FeedRow` が「ログイン=`markReadAction` / ゲスト=`addGuestSave('read')`」を注入する。
- **ゲストフィルタ**: `FeedList` が `isGuest && readMode!=='all'` のとき localStorage の既読集合でクライアント hide。
- **マージ**: `GuestSavesMigrator` に reads 移行を追加(ADR-0017 同様、実在フィルタ + 冪等 addMany)。

## 結果

- ✅ 未読/既読でフィードを絞り込める。ページネーションも正しく成立(SQL 絞り込み)
- ✅ 既読集合をアプリに持ち込まないので閲覧量に対してスケールする
- ✅ ログイン=サーバー絞り込み / ゲスト=クライアント hide で、両方フィルタが効く
- ✅ ゲスト既読は localStorage に記録され、ログインで DB へ引き継がれる(ADR-0017 と同じ移行フロー)
- ⚠️ フィルタ済み feed は per-user キャッシュ(ゲスト共通 `getFeed` のウォームさは共有しない)。ただし `[feed, userReads]` タグで無効化され `'days'` でウォームに保つ
- ⚠️ 未読フィルタ中に開いた記事は即座にはリストから消えない(遅延無効化。リロード/再遷移で反映)
- ⚠️ feed の infrastructure が `reads` テーブルを参照する(横断的だが、フィルタは SQL でしか正しくできないため許容。ドメインの `ListCriteria` は `readFilter` という一般的な条件として表現)
- ❌ ゲストのクライアント hide はページの可視件数が変動する(「もっと読む」は全件追記し、表示時に隠す)

## 関連リソース

- `db/schema/reads.ts` / `features/reads/{domain,infrastructure,application,web}`
- `features/feed/infrastructure/drizzle-article-repository.ts`(EXISTS/NOT EXISTS)、`features/feed/web/queries.ts`(`getReadFilteredFeed`)
- `features/feed/web/view-models/use-feed-read.ts`、`components/layout/feed-topbar.tsx`(デスクトップ)、`features/feed/web/components/feed-controls.tsx`(モバイル)
- `components/article/{feed-list,article-card 経由の onOpen,use-guest-saves,guest-saves-migrator}.tsx`
- ADR-0017(ゲスト保存→マージ)、ADR-0016(user-scoped cache)
