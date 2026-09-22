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

- ブックマーク連携: 「お気に入りに昇格」ボタンを押すとブックマークから削除しつつお気に入りに追加(オプション、MVPでは未実装で良い)

## メトリクス

- お気に入り追加レート
- 1ユーザーあたりの平均お気に入り数

## 関連

- ADR-0006 (ブックマークとお気に入りの2階層)
- 機能: bookmarks(類似機能)

## 実装状況

実装済み(ADR-0013)。bookmarks と同型。
- `features/favorites`(4層): `setFavorite` / `listFavoritedArticleIds`、`setFavoriteAction`、`getFavoritedArticleIds`。
- 記事カードの♥は `components/article/article-actions.tsx`。`/favorites`(`app/favorites/page.tsx`)で追加順に表示。空状態あり。
