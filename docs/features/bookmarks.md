# Feature: bookmarks(ブックマーク)

## 概要

「後で読む」用途で記事を一時的に保存。読了後は削除して未読リストを整理する想定。

未ログインでも保存・一覧閲覧が可能で、ゲストは localStorage(article ID 配列)に保持する。ログインすると localStorage の保存が DB へマージされ永続化される(ADR-0017)。client ストアは `components/article/use-guest-saves.ts`、移行は `guest-saves-migrator.tsx`、bulk 追加は Repository の `addMany`。

## ユーザーストーリー

- ログインユーザーとして、気になる記事を後で読むために保存したい
- ログインユーザーとして、ブックマーク一覧から記事を選んで読みたい
- ログインユーザーとして、読み終えたブックマークを削除したい

## 画面/UI

- 各カードに ブックマークボタン(🔖 アイコン)
- ナビ: 「ブックマーク」リンク → `/bookmarks`
- 一覧画面: 同じカードUI。絞り込み + 並び替え(下記「一覧の絞り込み・並び替え」)
- 解除時は即削除せずフェードアウト + トースト「ブックマークを解除しました [元に戻す]」(5秒)。Undo で元の位置に復元
- 空状態はアイコン + 説明 + 「フィードを見る」導線。1〜2件時はグリッド下に薄い補足 + 導線
- モバイル: 下部タブの「保存」

## データモデル

```ts
// db/schema/bookmarks.ts
bookmarks: {
  id: uuid(PK)
  user_id: uuid(FK → users, ON DELETE CASCADE)
  article_id: uuid(FK → articles, ON DELETE CASCADE)
  created_at: timestamptz
  // UNIQUE (user_id, article_id)
}
```

## API / Server Action

> シグネチャは公開 API の形を示す。実装は application 層の usecase、DB アクセスは infrastructure 層の Repository。`web/queries.ts` は composition root。

```ts
// features/bookmarks/web/queries.ts
listBookmarks({ userId, cursor, limit }): Promise<Result<...>>
isBookmarked({ userId, articleId }): Promise<boolean>

// features/bookmarks/web/actions.ts
addBookmark({ articleId }): Promise<Result<void, BookmarkError>>
removeBookmark({ articleId }): Promise<Result<void, BookmarkError>>
toggleBookmark({ articleId }): Promise<Result<{ added: boolean }, BookmarkError>>
```

## ビジネスルール

- ログイン必須(未ログインで操作 → ログインモーダル表示)
- 同じ記事を重複ブックマーク不可(UNIQUE制約 + ON CONFLICT DO NOTHING)
- 削除済み記事(`articles.deleted_at`)はブックマーク追加不可
- 並び順: ブックマーク追加日時の降順

## エッジケース

- 連打 → UI側で `useOptimistic` で即更新、Server Actionは冪等
- 楽観的更新の失敗 → ロールバック + トースト表示
- 元記事が削除された → 一覧から非表示(JOIN で除外)

## メトリクス

- ブックマーク追加レート(表示比)
- ブックマーク → お気に入り 昇格率
- 平均保持期間(追加から削除まで)

## 関連

- ADR-0006 (ブックマークとお気に入りの2階層)
- 機能: favorites(類似機能、UI共通化)

## 実装状況

実装済み(ADR-0013)。
- `features/bookmarks`(4層): `setBookmark` / `listBookmarkedArticleIds`、`setBookmarkAction`(セッションは `lib/auth` 直取得)、`getBookmarkedArticleIds`。`onConflictDoNothing` で冪等。
- 記事カードの🔖は横断 UI `components/article/article-actions.tsx`(client・楽観更新)。`features/feed` は保存系を import せず `ArticleCard` の `actions` スロットで受ける。
- `/bookmarks`(`app/bookmarks/page.tsx`、要 `requireSession`)が `getBookmarkedArticleIds` → `features/feed` の `getArticlesByIds` で記事本体を取得し追加順に表示。空状態あり。

## 一覧の絞り込み・並び替え

`/bookmarks` と `/favorites`(ログイン・ゲスト共通の `SavedArticlesView`)の一覧上部に追加。状態は component state のみで URL には載せない(離脱でリセット)。

- キーワード絞り込み: タイトル・企業名・AI要約の概要/タグへの部分一致。NFKC + 小文字化で正規化し、空白(全角含む)区切りは AND。保存一覧はページングせず全件を読み込むため、絞り込みも全件が対象
- 並び替え: 保存した順(新しい順・既定)/ 公開日が新しい順 / 公開日が古い順
- 件数表示: 「N件」、絞り込み中は「N件 / 全M件」
- 絞り込み結果 0 件: 「一致する記事がありません」+「絞り込みをクリア」(保存 0 件の空状態とは別)
- 入力は lg 未満 16px(iOS の自動ズーム回避)。コントロールは 2 件以上の保存がある時に表示
- ロジックは `components/article/saved-articles-filter.ts`(純関数・unit test あり)、UI は `saved-articles-controls.tsx`
