import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { userFeedArticles } from '@/db/schema/user-feed-articles';
import { userFeeds } from '@/db/schema/user-feeds';
import { asUserFeedId, type UserFeedId, type UserId } from '@/shared/type-utils';
import type { NewUserFeed, UserFeed, UserFeedArticleDraft } from '../domain/user-feed';
import type { AddUserFeedResult, UserFeedRepository } from '../domain/user-feed-repository';

const USER_FEED_COLUMNS = {
  id: userFeeds.id,
  title: userFeeds.title,
  rssUrl: userFeeds.rssUrl,
  siteUrl: userFeeds.siteUrl,
  enabled: userFeeds.enabled,
  lastFetchedAt: userFeeds.lastFetchedAt,
  lastError: userFeeds.lastError,
};

type UserFeedRow = {
  id: string;
  title: string;
  rssUrl: string;
  siteUrl: string | null;
  enabled: boolean;
  lastFetchedAt: Date | null;
  lastError: string | null;
};

const toUserFeed = (r: UserFeedRow): UserFeed => ({
  id: asUserFeedId(r.id),
  title: r.title,
  rssUrl: r.rssUrl,
  siteUrl: r.siteUrl,
  enabled: r.enabled,
  lastFetchedAt: r.lastFetchedAt,
  lastError: r.lastError,
});

/**
 * UserFeedRepository の Drizzle 実装(Driven Adapter)。
 * userId を WHERE に含め、所有者以外の行に触れないようにする(他人のフィードの操作・参照を防ぐ)。
 */
export class DrizzleUserFeedRepository implements UserFeedRepository {
  constructor(private readonly db: Database) {}

  async listByUser(userId: UserId): Promise<UserFeed[]> {
    const rows: UserFeedRow[] = await this.db
      .select(USER_FEED_COLUMNS)
      .from(userFeeds)
      .where(eq(userFeeds.userId, userId))
      .orderBy(desc(userFeeds.createdAt));
    return rows.map(toUserFeed);
  }

  async listEnabledIds(userId: UserId): Promise<UserFeedId[]> {
    const rows = await this.db
      .select({ id: userFeeds.id })
      .from(userFeeds)
      .where(and(eq(userFeeds.userId, userId), eq(userFeeds.enabled, true)));
    return rows.map((r) => asUserFeedId(r.id));
  }

  async listFiltersByUser(
    userId: UserId,
  ): Promise<{ id: UserFeedId; title: string; siteUrl: string | null; articleCount: number }[]> {
    const rows = await this.db
      .select({
        id: userFeeds.id,
        title: userFeeds.title,
        siteUrl: userFeeds.siteUrl,
        articleCount: count(userFeedArticles.id),
      })
      .from(userFeeds)
      .leftJoin(userFeedArticles, eq(userFeedArticles.userFeedId, userFeeds.id))
      .where(and(eq(userFeeds.userId, userId), eq(userFeeds.enabled, true)))
      .groupBy(userFeeds.id, userFeeds.title, userFeeds.siteUrl, userFeeds.createdAt)
      .orderBy(desc(userFeeds.createdAt));
    return rows.map((r) => ({
      id: asUserFeedId(r.id),
      title: r.title,
      siteUrl: r.siteUrl,
      articleCount: r.articleCount,
    }));
  }

  async listAllEnabled(): Promise<{ id: UserFeedId; rssUrl: string }[]> {
    const rows = await this.db
      .select({ id: userFeeds.id, rssUrl: userFeeds.rssUrl })
      .from(userFeeds)
      .where(eq(userFeeds.enabled, true));
    return rows.map((r) => ({ id: asUserFeedId(r.id), rssUrl: r.rssUrl }));
  }

  async countByUser(userId: UserId): Promise<number> {
    const rows = await this.db
      .select({ c: count() })
      .from(userFeeds)
      .where(eq(userFeeds.userId, userId));
    return rows[0]?.c ?? 0;
  }

  async existsByUrl(userId: UserId, rssUrl: string): Promise<boolean> {
    const rows = await this.db
      .select({ one: sql`1` })
      .from(userFeeds)
      .where(and(eq(userFeeds.userId, userId), eq(userFeeds.rssUrl, rssUrl)))
      .limit(1);
    return rows.length > 0;
  }

  async add(userId: UserId, feed: NewUserFeed): Promise<AddUserFeedResult> {
    const rows = await this.db
      .insert(userFeeds)
      .values({ userId, rssUrl: feed.rssUrl, title: feed.title, siteUrl: feed.siteUrl })
      .returning({ id: userFeeds.id });
    const row = rows[0];
    if (!row) throw new Error('failed to insert user feed');
    return { id: asUserFeedId(row.id) };
  }

  async setEnabled(userId: UserId, id: UserFeedId, enabled: boolean): Promise<void> {
    await this.db
      .update(userFeeds)
      .set({ enabled, updatedAt: new Date() })
      .where(and(eq(userFeeds.userId, userId), eq(userFeeds.id, id)));
  }

  async remove(userId: UserId, id: UserFeedId): Promise<void> {
    await this.db.delete(userFeeds).where(and(eq(userFeeds.userId, userId), eq(userFeeds.id, id)));
  }

  async findById(userId: UserId, id: UserFeedId): Promise<UserFeed | null> {
    const rows: UserFeedRow[] = await this.db
      .select(USER_FEED_COLUMNS)
      .from(userFeeds)
      .where(and(eq(userFeeds.userId, userId), eq(userFeeds.id, id)))
      .limit(1);
    return rows[0] ? toUserFeed(rows[0]) : null;
  }

  async upsertArticles(id: UserFeedId, drafts: UserFeedArticleDraft[]): Promise<number> {
    if (drafts.length === 0) return 0;

    const rows = drafts.map((a) => ({
      userFeedId: id as string,
      url: a.url,
      title: a.title,
      description: a.description,
      ogImage: a.ogImage,
      author: a.author,
      publishedAt: a.publishedAt,
    }));

    // xmax = 0 の行が新規 INSERT。実際に追加された新着数だけを返す(articles と同方式)。
    const result = await this.db
      .insert(userFeedArticles)
      .values(rows)
      .onConflictDoUpdate({
        target: [userFeedArticles.userFeedId, userFeedArticles.url],
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          ogImage: sql`excluded.og_image`,
          author: sql`excluded.author`,
          // articles と同様、再取込時に published_at も上書きして TZ 補正(ADR-0025)を反映させる。
          publishedAt: sql`excluded.published_at`,
        },
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` });

    return result.filter((r) => r.inserted).length;
  }

  async recordSuccess(id: UserFeedId): Promise<void> {
    await this.db
      .update(userFeeds)
      .set({ lastFetchedAt: new Date(), lastError: null, consecutiveFailures: 0 })
      .where(eq(userFeeds.id, id));
  }

  async recordFailure(id: UserFeedId, message: string): Promise<void> {
    await this.db
      .update(userFeeds)
      .set({
        lastError: message,
        lastErrorAt: new Date(),
        consecutiveFailures: sql`${userFeeds.consecutiveFailures} + 1`,
      })
      .where(eq(userFeeds.id, id));
  }
}
