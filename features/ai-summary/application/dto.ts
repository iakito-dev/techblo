import type { ArticleSummary, ArticleSummaryBullet } from '../domain/article-summary';

/**
 * 表示 DTO。記事ページが必要とする形だけを持つ。
 * status='failed' の要約は UI に出さないため、DTO は status='ready' のものだけを表す。
 */
export type ArticleSummaryDto = {
  articleId: string;
  overview: string;
  bullets: ArticleSummaryBullet[];
  tags: string[];
  model: string;
  generatedAt: Date;
};

export const toArticleSummaryDto = (s: ArticleSummary): ArticleSummaryDto => ({
  articleId: s.articleId,
  overview: s.overview,
  bullets: s.bullets,
  tags: s.tags,
  model: s.model,
  generatedAt: s.generatedAt,
});
