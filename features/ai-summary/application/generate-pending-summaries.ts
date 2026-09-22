import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { ArticleId } from '@/shared/type-utils';
import type { ArticleSummary } from '../domain/article-summary';
import type { ArticleSummaryRepository } from '../domain/article-summary-repository';
import type { GenerateSummaryInput } from './generate-summary';

export type SummaryInputArticle = {
  id: ArticleId;
  url: string;
  title: string;
  rssExcerpt: string | null;
};

export type GeneratePendingSummariesResult = {
  requested: number;
  found: number;
  generated: number;
  failed: number;
  generatedArticleIds: ArticleId[];
};

export const generatePendingSummaries =
  (deps: {
    summaries: ArticleSummaryRepository;
    getArticlesByIds: (ids: ArticleId[]) => Promise<SummaryInputArticle[]>;
    generateOne: (input: GenerateSummaryInput) => Promise<Result<ArticleSummary, CommonError>>;
  }) =>
  async (input: {
    limit: number;
  }): Promise<Result<GeneratePendingSummariesResult, CommonError>> => {
    const pendingIds = await deps.summaries.listPendingArticleIds(input.limit);
    const articles = await deps.getArticlesByIds(pendingIds);
    const byId = new Map(articles.map((article) => [article.id, article]));
    const generatedArticleIds: ArticleId[] = [];
    let generated = 0;
    let failed = pendingIds.length - articles.length;

    for (const articleId of pendingIds) {
      const article = byId.get(articleId);
      if (!article) continue;

      const result = await deps
        .generateOne({
          articleId: article.id,
          url: article.url,
          title: article.title,
          rssExcerpt: article.rssExcerpt,
        })
        .catch(() => null);

      if (result?.ok && result.value.status === 'ready') {
        generated += 1;
        generatedArticleIds.push(article.id);
      } else {
        failed += 1;
      }
    }

    return ok({
      requested: input.limit,
      found: pendingIds.length,
      generated,
      failed,
      generatedArticleIds,
    });
  };
