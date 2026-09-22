# ADR-0017: ゲストの保存/お気に入りは localStorage、ログインで DB へマージ

- **状態**: Accepted
- **決定日**: 2026-06-04
- **関連**: ADR-0006(bookmark/favorite 2層), ADR-0013(横断合成), ADR-0016(user-scoped cache)

## 背景

従来、未ログインユーザーが保存/お気に入りボタンを押すと `GuestActions` がログイン誘導モーダルを出すだけで保存できず、`/bookmarks`・`/favorites` は `requireSession` で `/login` に飛んでいた。「ログイン前でも気軽に保存し、ログインしたら引き継げる」体験にしたい。

設定(購読)はフィードの表示企業フィルタ(サーバー側)に直結し、ゲスト対応するとクライアント側フィルタが必要になり影響が大きい。今回は **bookmark/favorite のみ**を対象とする(購読は現状の `requireSession` 維持)。

## 検討した選択肢

### A. ゲストもサーバーに保存(匿名セッション/Cookie)
- ログイン後の移行が不要
- 匿名ユーザー行が DB に増える、Cookie/セッション基盤の追加が必要。MVP には重い

### B. localStorage に保存し、ログイン時に DB へマージ(採用)
- サーバー変更が小さい(既存の add を bulk 化するだけ)。ゲストは即時・オフラインでも動く
- 端末間で共有されない(localStorage はブラウザ単位)。ログインすれば永続化されるので許容

## 決定

**B** を採用。

- **保存先**: localStorage に **article ID 配列**のみ(`techblo.guest.bookmarks` / `techblo.guest.favorites`。旧名 `corpex.guest.*` はリネーム時の後方互換フォールバックで読み込む)。記事は公開データで ID から引ける。client ストアは `components/article/use-guest-saves.ts`。
- **ボタン**: `ArticleActions` に一本化し `isGuest` で「ログイン=Server Action / ゲスト=localStorage」を内部分岐。`GuestActions`(ログイン誘導モーダル)は廃止。SSR/hydration 安全のため localStorage は mount 後に読む(`ready` 前は操作不可)。
- **一覧**: `/bookmarks`・`/favorites` を `requireSession`→`getSession` 分岐に。ゲストは client `GuestSavedArticles` が localStorage の ID → `getSavedArticles`(Server Action、`getArticlesByIds` ラップ)で記事取得 → 既存 `SavedArticlesView`。
- **移行**: `GuestSavesMigrator`(layout 常設)が `useSession` の未ログイン→ログイン遷移を検知し、localStorage の ID を `getSavedArticles` で**実在フィルタ**(削除済み記事 ID を除外=FK 安全)してから `migrateGuest*` Server Action で DB へ bulk マージ → localStorage クリア → `router.refresh()`。
- **bulk/冪等**: Repository に `addMany`(`onConflictDoNothing`)。`*_user_article_uq` で重複しない。二重移行は `ran`(ref)+ クリア + 冪等で防ぐ。

## 結果

- ✅ 未ログインでも保存・お気に入り・一覧閲覧ができ、ログインで DB に引き継がれる
- ✅ サーバー変更は最小(`addMany` と移行アクションのみ)。データ層スキーマは不変
- ✅ FK 安全(実在フィルタ)・冪等マージで二重登録や FK 違反を回避
- ⚠️ ゲストデータは端末/ブラウザ単位(共有されない)。localStorage 無効環境では保存不可
- ⚠️ ゲスト一覧は初回取得時点で固定(トグルで即座にリストから消えない。リロードで反映)
- ⚠️ 移行とログイン直後の手動操作が交差しても `onConflictDoNothing` + 最終 `router.refresh()` で整合(競合は一瞬で実害極小)
- ❌ 設定(購読)はゲスト非対応のまま(別途検討)

## 関連リソース

- `components/article/use-guest-saves.ts` / `guest-saved-articles.tsx` / `guest-saves-migrator.tsx` / `saved-articles-actions.ts`
- `components/article/article-actions.tsx`(isGuest 分岐)
- `features/{bookmarks,favorites}/{domain,infrastructure}`(`addMany`)、`application/merge-guest-*`、`web/actions.ts`(`migrateGuest*`)
- `app/{bookmarks,favorites}/page.tsx`(getSession 分岐)、`app/layout.tsx`(migrator 常設)
