import { schedules } from '@trigger.dev/sdk';
import { db } from '@/db/client';
import { updateArticleMetrics } from '@/features/feed/application/update-article-metrics';
import { upsertArticles } from '@/features/feed/application/upsert-articles';
import { DrizzleArticleRepository } from '@/features/feed/infrastructure/drizzle-article-repository';
import { fetchBookmarkCounts } from '@/lib/hatena/count-client';
import { logger } from '@/lib/observability/logger';
import { ingestAllCompanies } from '@/lib/rss/ingest';

/**
 * 取込後にフィードキャッシュを無効化する。cron は Next ランタイム外なので revalidateTag を直接呼べず、
 * /api/revalidate(シークレット保護)を叩いて Next 側で無効化させる。
 * REVALIDATE_SECRET 未設定ならスキップ(ログのみ)。失敗しても cron 全体は止めない。
 *
 * env(t3-env)は読み込み時に全必須変数を検証するため、trigger.dev 側に全変数を強いてしまう。
 * インフラ文脈なので db/client・trigger.config と同様 process.env を直接参照する(必要なのは
 * REVALIDATE_SECRET と BETTER_AUTH_URL の2つだけで済む)。
 */
async function revalidateFeedCache(): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET;
  const appUrl = process.env.BETTER_AUTH_URL;
  if (!secret || !appUrl) {
    logger.warn(
      'fetch-feed-articles: REVALIDATE_SECRET / BETTER_AUTH_URL 未設定のためフィードキャッシュを無効化できない',
    );
    return;
  }
  try {
    const res = await fetch(`${appUrl}/api/revalidate`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}` },
    });
    if (!res.ok) {
      logger.warn('fetch-feed-articles: フィードキャッシュ無効化が失敗', { status: res.status });
    }
  } catch (error) {
    logger.warn('fetch-feed-articles: フィードキャッシュ無効化に到達できない', { error });
  }
}

/**
 * 全企業の RSS 定期取得。
 * ユーザー操作ではなくバックグラウンドで記事を取り込むため、UI 側に更新ボタンは置かない。
 */
export const fetchFeedArticles = schedules.task({
  id: 'fetch-feed-articles',
  cron: '0 * * * *',
  maxDuration: 300,
  run: async () => {
    const repo = new DrizzleArticleRepository(db);
    const sink = upsertArticles({ articles: repo });
    const results = await ingestAllCompanies(sink);

    const ingested = results.reduce((sum, r) => sum + r.count, 0);
    const failed = results.filter((r) => !r.ok).length;

    if (failed > 0) {
      logger.warn('fetch-feed-articles: 一部の企業フィード取得に失敗', {
        failed,
        companies: results.length,
      });
    }

    const metrics = await updateArticleMetrics({
      articles: repo,
      fetchCounts: fetchBookmarkCounts,
    })();

    if (!metrics.ok) {
      logger.warn('fetch-feed-articles: はてブ数の更新に失敗', { error: metrics.error });
    }

    // 新着 or はてブ数(人気順に影響)に変化があればフィードキャッシュを無効化して即反映する。
    const metricsUpdated = metrics.ok ? metrics.value.updated : 0;
    if (ingested > 0 || metricsUpdated > 0) {
      await revalidateFeedCache();
    }

    logger.info('fetch-feed-articles: 完了', {
      companies: results.length,
      ingested,
      failed,
      metricsUpdated,
    });

    return {
      companies: results.length,
      ingested,
      failed,
      metricsUpdated,
    };
  },
});
