import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@/db/client';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { logger } from '@/lib/observability/logger';
import { asArticleId } from '@/shared/type-utils';
import type { ArticleSummaryDto } from '../application/dto';
import { getSummary } from '../application/get-summary';
import { DrizzleArticleSummaryRepository } from '../infrastructure/drizzle-article-summary-repository';

/**
 * RSC が呼ぶ composition root。Server Component / Server Action からのみ import すること。
 */
const summaryRepo = new DrizzleArticleSummaryRepository(db);

/**
 * 記事ページ / カードのタグ用の要約取得。要約が無い / 失敗なら null(UI はセクションを出さない)。
 * 記事単位タグでキャッシュし、生成バッチ完了時に updateTag(article) で無効化する想定(ADR-0016)。
 *
 * 'use cache: remote'(Vercel Runtime Cache)にする(ADR-0042)。記事ページと「もっと読む」は
 * リクエスト時に描画されるため、in-memory の 'use cache' だとサーバーレスのインスタンスごとに
 * 空から始まり、1画面で最大 24 本の要約クエリが Supabase に飛んでいた。
 */
export async function getSummaryByArticleId(articleId: string): Promise<ArticleSummaryDto | null> {
  'use cache: remote';
  cacheTag(CACHE_TAGS.article(articleId));
  cacheLife('hours');

  const result = await getSummary({ summaries: summaryRepo })({
    articleId: asArticleId(articleId),
  });
  if (!result.ok) {
    logger.error('getSummary failed', { error: result.error, articleId });
    return null;
  }
  return result.value;
}

/**
 * 複数記事の AI要約を、記事 ID 単位でキャッシュ済みのクエリで並列取得し、記事 ID をキーにした
 * Record で返す。要約が無い / 未生成の記事はキーを持たない。
 * 保存一覧(ブックマーク/お気に入り)は並び替え・Undo でカード順が変わるため、配列 index ではなく
 * ID 引きで要約をカードに対応づける(フィードは順序固定なので feed-load-more 側は配列のまま)。
 */
export async function getSummariesByArticleIds(
  articleIds: string[],
): Promise<Record<string, ArticleSummaryDto>> {
  const summaries = await Promise.all(articleIds.map((id) => getSummaryByArticleId(id)));
  const byId: Record<string, ArticleSummaryDto> = {};
  for (const summary of summaries) {
    if (summary) byId[summary.articleId] = summary;
  }
  return byId;
}
