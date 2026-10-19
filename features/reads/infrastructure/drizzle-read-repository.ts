import { desc, eq, sql } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { reads } from '@/db/schema/reads';
import { type ArticleId, asArticleId, type UserId } from '@/shared/type-utils';
import type { ReadEntry, ReadRepository } from '../domain/read-repository';

/**
 * ReadRepository の Drizzle 実装(Driven Adapter)。
 * 既読化は冪等(reads_user_article_uq)。再閲覧は readAt だけ更新する。
 */
export class DrizzleReadRepository implements ReadRepository {
  constructor(private readonly db: Database) {}

  async markRead(userId: UserId, articleId: ArticleId): Promise<void> {
    // 閲覧履歴は「最後に開いた順」で並べたいので、既読済みでも readAt を進める(ADR-0041)。
    await this.db
      .insert(reads)
      .values({ userId, articleId })
      .onConflictDoUpdate({
        target: [reads.userId, reads.articleId],
        set: { readAt: sql`now()` },
      });
  }

  async addMany(userId: UserId, articleIds: ArticleId[]): Promise<void> {
    if (articleIds.length === 0) return;
    await this.db
      .insert(reads)
      .values(articleIds.map((articleId) => ({ userId, articleId })))
      .onConflictDoNothing();
  }

  async listRecent(userId: UserId, limit: number): Promise<ReadEntry[]> {
    const rows = await this.db
      .select({ articleId: reads.articleId, readAt: reads.readAt })
      .from(reads)
      .where(eq(reads.userId, userId))
      .orderBy(desc(reads.readAt))
      .limit(limit);
    return rows.map((r) => ({ articleId: asArticleId(r.articleId), readAt: r.readAt }));
  }
}
