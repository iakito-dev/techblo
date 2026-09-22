import { schedules } from '@trigger.dev/sdk';
import { db } from '@/db/client';
import { ingestUserFeeds } from '@/features/user-feeds/application/ingest-user-feeds';
import { DrizzleUserFeedRepository } from '@/features/user-feeds/infrastructure/drizzle-user-feed-repository';
import { rssFeedFetcher } from '@/features/user-feeds/infrastructure/rss-feed-fetcher';
import { logger } from '@/lib/observability/logger';

/**
 * 取込後にフィードキャッシュを無効化する(fetch-feed-articles と同方式)。cron は Next ランタイム外なので
 * /api/revalidate(シークレット保護)を叩いて revalidateTag(feed) させる。マージ版フィードは feed タグを
 * 含むため、これで全ユーザーのマイフィード反映が揃う(per-user タグを全員ぶん叩く必要がない。ADR-0014)。
 */
async function revalidateFeedCache(): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET;
  const appUrl = process.env.BETTER_AUTH_URL;
  if (!secret || !appUrl) {
    logger.warn('fetch-user-feeds: REVALIDATE_SECRET / BETTER_AUTH_URL 未設定のため無効化できない');
    return;
  }
  try {
    const res = await fetch(`${appUrl}/api/revalidate`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}` },
    });
    if (!res.ok) {
      logger.warn('fetch-user-feeds: フィードキャッシュ無効化が失敗', { status: res.status });
    }
  } catch (error) {
    logger.warn('fetch-user-feeds: フィードキャッシュ無効化に到達できない', { error });
  }
}

/**
 * 全ユーザーの有効なマイフィード(プライベートRSS)を定期取得する。
 * 企業フィードの取込(fetch-feed-articles)とは別タスクにし、:15 にずらして負荷を分散する。
 */
export const fetchUserFeeds = schedules.task({
  id: 'fetch-user-feeds',
  cron: '15 * * * *',
  maxDuration: 300,
  run: async () => {
    const repo = new DrizzleUserFeedRepository(db);
    const results = await ingestUserFeeds({ feeds: repo, fetchFeed: rssFeedFetcher })();

    const ingested = results.reduce((sum, r) => sum + r.added, 0);
    const failed = results.filter((r) => !r.ok).length;

    if (failed > 0) {
      logger.warn('fetch-user-feeds: 一部のマイフィード取得に失敗', {
        failed,
        feeds: results.length,
      });
    }

    if (ingested > 0) {
      await revalidateFeedCache();
    }

    logger.info('fetch-user-feeds: 完了', { feeds: results.length, ingested, failed });
    return { feeds: results.length, ingested, failed };
  },
});
