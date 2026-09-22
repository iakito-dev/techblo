import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { favorites } from '@/db/schema/favorites';
import { type ArticleId, asArticleId, type UserId } from '@/shared/type-utils';
import type { FavoriteRepository } from '../domain/favorite-repository';

/**
 * FavoriteRepository の Drizzle 実装(Driven Adapter)。
 * 追加は冪等(onConflictDoNothing / favorites_user_article_uq)。
 */
export class DrizzleFavoriteRepository implements FavoriteRepository {
  constructor(private readonly db: Database) {}

  async listArticleIds(userId: UserId): Promise<ArticleId[]> {
    const rows = await this.db
      .select({ articleId: favorites.articleId })
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
    return rows.map((r) => asArticleId(r.articleId));
  }

  async add(userId: UserId, articleId: ArticleId): Promise<void> {
    await this.db.insert(favorites).values({ userId, articleId }).onConflictDoNothing();
  }

  async addMany(userId: UserId, articleIds: ArticleId[]): Promise<void> {
    if (articleIds.length === 0) return;
    await this.db
      .insert(favorites)
      .values(articleIds.map((articleId) => ({ userId, articleId })))
      .onConflictDoNothing();
  }

  async remove(userId: UserId, articleId: ArticleId): Promise<void> {
    await this.db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.articleId, articleId)));
  }
}
