import { schedules } from '@trigger.dev/sdk';
import { inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { generatePendingSummaries } from '@/features/ai-summary/application/generate-pending-summaries';
import { generateSummary } from '@/features/ai-summary/application/generate-summary';
import { DrizzleArticleSummaryRepository } from '@/features/ai-summary/infrastructure/drizzle-article-summary-repository';
import { HtmlContentFetcher } from '@/features/ai-summary/infrastructure/html-content-fetcher';
import { LlmSummaryGenerator } from '@/features/ai-summary/infrastructure/llm-summary-generator';
import { createLlmClient } from '@/lib/ai/llm-client';
import { logger } from '@/lib/observability/logger';
import { type ArticleId, asArticleId } from '@/shared/type-utils';

const DEFAULT_BATCH_LIMIT = 10;
/** 1 回の cron で処理する上限。再生成(全件バックフィル)を一括で終えられるよう 200 まで許可する。 */
const MAX_BATCH_LIMIT = 200;

function resolveBatchLimit(): number {
  const raw = Number(process.env.AI_SUMMARY_BATCH_LIMIT);
  if (!Number.isInteger(raw) || raw < 1) return DEFAULT_BATCH_LIMIT;
  return Math.min(raw, MAX_BATCH_LIMIT);
}

async function getArticlesByIds(ids: ArticleId[]) {
  if (ids.length === 0) return [];

  const rows = await db
    .select({
      id: articles.id,
      url: articles.url,
      title: articles.title,
      rssExcerpt: articles.description,
    })
    .from(articles)
    .where(inArray(articles.id, ids));

  return rows.map((row) => ({
    id: asArticleId(row.id),
    url: row.url,
    title: row.title,
    rssExcerpt: row.rssExcerpt,
  }));
}

async function revalidateArticleCaches(articleIds: ArticleId[]): Promise<void> {
  if (articleIds.length === 0) return;

  const secret = process.env.REVALIDATE_SECRET;
  const appUrl = process.env.BETTER_AUTH_URL;
  if (!secret || !appUrl) {
    logger.warn(
      'generate-article-summaries: REVALIDATE_SECRET / BETTER_AUTH_URL 未設定のため記事キャッシュを無効化できない',
    );
    return;
  }

  try {
    const res = await fetch(`${appUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ articleIds }),
    });
    if (!res.ok) {
      logger.warn('generate-article-summaries: 記事キャッシュ無効化が失敗', {
        status: res.status,
      });
    }
  } catch (error) {
    logger.warn('generate-article-summaries: 記事キャッシュ無効化に到達できない', { error });
  }
}

/**
 * 未生成の AI 記事要約を小さなバッチで生成する。
 * RSS 取込とは別 cron にして、LLM/API 側の失敗や遅延が新着取込を止めないようにする。
 */
export const generateArticleSummaries = schedules.task({
  id: 'generate-article-summaries',
  cron: '10 * * * *',
  maxDuration: 600,
  run: async () => {
    const summaries = new DrizzleArticleSummaryRepository(db);
    const fetcher = new HtmlContentFetcher();
    const generator = new LlmSummaryGenerator(createLlmClient());
    const generateOne = generateSummary({ summaries, fetcher, generator });

    const result = await generatePendingSummaries({
      summaries,
      getArticlesByIds,
      generateOne,
    })({ limit: resolveBatchLimit() });

    if (!result.ok) {
      logger.warn('generate-article-summaries: 生成バッチに失敗', { error: result.error });
      return { ok: false, error: result.error };
    }

    await revalidateArticleCaches(result.value.generatedArticleIds);
    logger.info('generate-article-summaries: 完了', result.value);
    return { ok: true, ...result.value };
  },
});
