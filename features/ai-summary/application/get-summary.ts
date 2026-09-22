import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { ArticleId } from '@/shared/type-utils';
import type { ArticleSummaryRepository } from '../domain/article-summary-repository';
import { type ArticleSummaryDto, toArticleSummaryDto } from './dto';

/**
 * 記事ページ表示用の要約取得。要約が無い / status='failed' なら null を返す
 * (UI はセクションを出さない)。依存は引数注入。
 */
export const getSummary =
  (deps: { summaries: ArticleSummaryRepository }) =>
  async ({
    articleId,
  }: {
    articleId: ArticleId;
  }): Promise<Result<ArticleSummaryDto | null, CommonError>> => {
    const summary = await deps.summaries.findByArticleId(articleId);
    if (summary?.status === 'ready') return ok(toArticleSummaryDto(summary));
    return ok(null);
  };
