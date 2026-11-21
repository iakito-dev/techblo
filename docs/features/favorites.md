# Feature: favorites(お気に入り)

## 概要

良かった記事を永続的に保存する。ブックマークと違い、消化のために削除する想定はない。

未ログインでも保存・一覧閲覧が可能で、ゲストは localStorage(article ID 配列)に保持する。ログインすると localStorage の保存が DB へマージされ永続化される(ADR-0017、bookmarks と同型)。

## ユーザーストーリー

- ログインユーザーとして、良かった記事を残しておきたい
- ログインユーザーとして、お気に入り一覧から過去の名作を読み返したい
- ログインユーザーとして、ブックマークからお気に入りに昇格させたい

## 画面/UI

- 各カードに お気に入りボタン(♥ アイコン)
- ナビ: 「お気に入り」リンク → `/favorites`
- 一覧画面: ブックマーク画面と同様のUI(並び替え・解除 Undo・空/少数状態の導線も同仕様)
- モバイル: 下部タブの「お気に入り」

## データモデル

```ts
// db/schema/favorites.ts
favorites: {
  id: uuid(PK)
  user_id: uuid(FK → users, ON DELETE CASCADE)
  article_id: uuid(FK → articles, ON DELETE CASCADE)
  created_at: timestamptz
  // UNIQUE (user_id, article_id)
}
```

(bookmarksとスキーマほぼ同一)

## API / Server Action

> シグネチャは公開 API の形を示す。実装は application 層の usecase、DB アクセスは infrastructure 層の Repository。`web/queries.ts` は composition root。

```ts
// features/favorites/web/queries.ts
listFavorites({ userId, cursor, limit }): Promise<Result<...>>
isFavorited({ userId, articleId }): Promise<boolean>

// features/favorites/web/actions.ts
addFavorite({ articleId }): Promise<Result<void, FavoriteError>>
removeFavorite({ articleId }): Promise<Result<void, FavoriteError>>
toggleFavorite({ articleId }): Promise<Result<{ added: boolean }, FavoriteError>>
```

## ビジネスルール

- ログイン必須
- 同じ記事を重複お気に入り不可(UNIQUE制約)
- ブックマークとお気に入りは独立(両方に同じ記事があってもOK)
- 並び順: お気に入り追加日時の降順

## エッジケース

- ブックマーク連携(お気に入りへの昇格): `/bookmarks` の一覧でカードのお気に入り(♥)を追加すると、トースト「お気に入りに追加しました」に「あとで読むから外す」操作を付ける(`SavedArticlesView` の `handlePromote`)。押すと通常の解除と同じくカードがフェードアウトし、「あとで読むから削除しました / 元に戻す」の Undo トーストが続く。ADR-0006 のシナリオ B(読み終えた記事のうち良かったものをお気に入りへ移し、あとで読むは消化する)を 1 画面で完結させるため
  - 自動では外さない(あとで読むにも残しておきたい人がいるため、ブックマークとお気に入りは独立のまま)。ボタンを 1 つ増やさずトーストに載せるのは、カードの保存アクションの数と位置を一覧ごとに変えないため
  - ログイン時は Server Action の成功後にトーストを出す(フィードのカードの確認トーストは楽観表示だが、ここは「外す」操作を伴うため。楽観的に出すと、保存に失敗したのに「あとで読むから外す」を押した記事がどちらの一覧にも残らない)。ゲストは localStorage の書き込み直後
  - `/favorites` 側(お気に入りの一覧であとで読むを追加)には付けない(逆向きの「降格」は使い道が無い)

## メトリクス

PostHog のイベント(一覧と規約は [observability.md §4](../architecture/observability.md)):

| イベント | プロパティ | 発火 |
|---|---|---|
| `favorite_added` / `favorite_removed` | articleId, isGuest | `ArticleActions` / `SavedArticlesView`(`app/_composition/article/track-save.ts`)。ログイン時は Server Action 成功後、ゲストは localStorage 書き込み時 |

- お気に入り追加レート
- 1ユーザーあたりの平均お気に入り数

## 関連

- ADR-0006 (ブックマークとお気に入りの2階層)
- 機能: bookmarks(類似機能)

## 実装状況

実装済み(ADR-0013)。bookmarks と同型。
- `features/favorites`(4層): `setFavorite` / `listFavoritedArticleIds`、`setFavoriteAction`、`getFavoritedArticleIds`。
- 記事カードの♥は `app/_composition/article/article-actions.tsx`。`/favorites`(`app/(app)/favorites/page.tsx`。ゲストは localStorage の保存を表示)で追加順に表示。空状態あり。

## 一覧の絞り込み・並び替え

`/bookmarks` と `/favorites`(ログイン・ゲスト共通の `SavedArticlesView`)の一覧上部に追加。状態は component state のみで URL には載せない(離脱でリセット)。

- キーワード絞り込み: タイトル・企業名・AI要約の概要/タグへの部分一致。NFKC + 小文字化で正規化し、空白(全角含む)区切りは AND。保存一覧はページングせず全件を読み込むため、絞り込みも全件が対象
- 並び替え: 保存した順(新しい順・既定)/ 公開日が新しい順 / 公開日が古い順
- 件数表示: 「N件」、絞り込み中は「N件 / 全M件」
- 絞り込み結果 0 件: 「一致する記事がありません」+「絞り込みをクリア」(保存 0 件の空状態とは別)
- 入力は lg 未満 16px(iOS の自動ズーム回避)。コントロールは 2 件以上の保存がある時に表示
- ロジックは `app/_composition/article/saved-articles-filter.ts`(純関数・unit test あり)、UI は `saved-articles-controls.tsx`
