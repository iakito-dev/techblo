import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { bookmarks } from '@/db/schema/bookmarks';
import { type ArticleId, asArticleId, type UserId } from '@/shared/type-utils';
import type { BookmarkRepository } from '../domain/bookmark-repository';

/**
 * BookmarkRepository の Drizzle 実装(Driven Adapter)。
 * 追加は冪等(onConflictDoNothing / bookmarks_user_article_uq)。
 */
export class DrizzleBookmarkRepository implements BookmarkRepository {
  constructor(private readonly db: Database) {}

  async listArticleIds(userId: UserId): Promise<ArticleId[]> {
    const rows = await this.db
      .select({ articleId: bookmarks.articleId })
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt));
    return rows.map((r) => asArticleId(r.articleId));
  }

  async add(userId: UserId, articleId: ArticleId): Promise<void> {
    await this.db.insert(bookmarks).values({ userId, articleId }).onConflictDoNothing();
  }

  async addMany(userId: UserId, articleIds: ArticleId[]): Promise<void> {
    if (articleIds.length === 0) return;
    await this.db
      .insert(bookmarks)
      .values(articleIds.map((articleId) => ({ userId, articleId })))
      .onConflictDoNothing();
  }

  async remove(userId: UserId, articleId: ArticleId): Promise<void> {
    await this.db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.articleId, articleId)));
  }
}
