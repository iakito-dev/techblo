import type { ArticleId, UserId } from '@/shared/type-utils';

/**
 * Driven Port。お気に入りの永続化インターフェース。実装は infrastructure 層。
 */
export interface FavoriteRepository {
  /** ユーザーのお気に入り記事 id を追加日時の降順で返す。 */
  listArticleIds(userId: UserId): Promise<ArticleId[]>;
  add(userId: UserId, articleId: ArticleId): Promise<void>;
  remove(userId: UserId, articleId: ArticleId): Promise<void>;
  /** 複数記事をまとめて追加(ログイン時のゲストデータ移行用)。冪等。 */
  addMany(userId: UserId, articleIds: ArticleId[]): Promise<void>;
}
