import type { Database } from '@/db/client';
import { reads } from '@/db/schema/reads';
import type { ArticleId, UserId } from '@/shared/type-utils';
import type { ReadRepository } from '../domain/read-repository';

/**
 * ReadRepository の Drizzle 実装(Driven Adapter)。
 * 既読化は冪等(onConflictDoNothing / reads_user_article_uq)。
 */
export class DrizzleReadRepository implements ReadRepository {
  constructor(private readonly db: Database) {}

  async markRead(userId: UserId, articleId: ArticleId): Promise<void> {
    await this.db.insert(reads).values({ userId, articleId }).onConflictDoNothing();
  }

  async addMany(userId: UserId, articleIds: ArticleId[]): Promise<void> {
    if (articleIds.length === 0) return;
    await this.db
      .insert(reads)
      .values(articleIds.map((articleId) => ({ userId, articleId })))
      .onConflictDoNothing();
  }
}
