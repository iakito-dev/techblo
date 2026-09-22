import { schedules } from '@trigger.dev/sdk';
import { inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { classifyPendingCategories } from '@/features/ai-summary/application/classify-pending-categories';
import { DrizzleArticleSummaryRepository } from '@/features/ai-summary/infrastructure/drizzle-article-summary-repository';
import { LlmCategoryClassifier } from '@/features/ai-summary/infrastructure/llm-category-classifier';
import { createLlmClient } from '@/lib/ai/llm-client';
import { logger } from '@/lib/observability/logger';
import { type ArticleId, asArticleId } from '@/shared/type-utils';

const DEFAULT_BATCH_LIMIT = 50;
/** 1 回の cron で処理する上限。バックフィル(既存約2,400件)を一括で終えられるよう 200 まで許可する。 */
const MAX_BATCH_LIMIT = 200;

function resolveBatchLimit(): number {
  const raw = Number(process.env.AI_CATEGORY_BATCH_LIMIT);
  if (!Number.isInteger(raw) || raw < 1) return DEFAULT_BATCH_LIMIT;
  return Math.min(raw, MAX_BATCH_LIMIT);
}

async function getTitlesByIds(ids: ArticleId[]): Promise<Map<ArticleId, string>> {
  if (ids.length === 0) return new Map();

  const rows = await db
    .select({ id: articles.id, title: articles.title })
    .from(articles)
    .where(inArray(articles.id, ids));

  return new Map(rows.map((row) => [asArticleId(row.id), row.title]));
}

async function revalidateArticleCaches(articleIds: ArticleId[]): Promise<void> {
  if (articleIds.length === 0) return;

  const secret = process.env.REVALIDATE_SECRET;
  const appUrl = process.env.BETTER_AUTH_URL;
  if (!secret || !appUrl) {
    logger.warn(
      'classify-article-categories: REVALIDATE_SECRET / BETTER_AUTH_URL 未設定のため記事キャッシュを無効化できない',
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
      logger.warn('classify-article-categories: 記事キャッシュ無効化が失敗', {
        status: res.status,
      });
    }
  } catch (error) {
    logger.warn('classify-article-categories: 記事キャッシュ無効化に到達できない', { error });
  }
}

/**
 * 未分類の記事カテゴリ(職能軸)を小さなバッチで分類する。
 * 要約生成(generate-article-summaries)の後段に置く別ステップ(
 * ADR-0034)。保存済み要約(title/overview/tags)だけを入力にするため本文取得は行わない。
 */
export const classifyArticleCategories = schedules.task({
  id: 'classify-article-categories',
  cron: '40 * * * *',
  maxDuration: 600,
  run: async () => {
    const summaries = new DrizzleArticleSummaryRepository(db);
    const classifier = new LlmCategoryClassifier(createLlmClient());

    const result = await classifyPendingCategories({
      summaries,
      classifier,
      getTitlesByIds,
    })({ limit: resolveBatchLimit() });

    if (!result.ok) {
      logger.warn('classify-article-categories: 分類バッチに失敗', { error: result.error });
      return { ok: false, error: result.error };
    }

    await revalidateArticleCaches(result.value.classifiedArticleIds);
    logger.info('classify-article-categories: 完了', result.value);
    return { ok: true, ...result.value };
  },
});
