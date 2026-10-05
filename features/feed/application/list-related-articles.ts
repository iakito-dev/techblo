import { ok, type Result } from '@/shared/result';
import { asArticleId } from '@/shared/type-utils';
import type { Article } from '../domain/article';
import type { ArticleRepository } from '../domain/article-repository';
import type { FeedError } from '../domain/errors';
import { type ArticleCard, toArticleCard } from './dto';

export const RELATED_ARTICLES_LIMIT = 6;

/**
 * 記事ページ下部の関連記事を取得するユースケース(ADR-0037)。
 * AI要約タグの重なりが多い順に並べ、足りない分だけ同じ企業の新着で補う。
 * 補完は「タグ一致が無い/少ない記事」でも行き止まりにしないためのフォールバック。
 */
export const listRelatedArticles =
  (deps: { articles: ArticleRepository }) =>
  async (
    articleId: string,
    limit = RELATED_ARTICLES_LIMIT,
  ): Promise<Result<ArticleCard[], FeedError>> => {
    const id = asArticleId(articleId);
    const article = await deps.articles.findById(id);
    if (!article) return ok([]);

    const related: Article[] = await deps.articles.listByTagOverlap(id, limit);

    if (related.length < limit) {
      // 除外されうるのは自身 1 件 + タグ一致済みの related.length 件。不足分(limit - related.length)に
      // これらを足すと limit + 1 件で、除外後も不足分を必ず満たせる。
      const latest = await deps.articles.list({
        sort: 'latest',
        companyIds: [article.company.id],
        offset: 0,
        limit: limit + 1,
      });
      const seen = new Set<string>([article.id, ...related.map((a) => a.id)]);
      for (const a of latest) {
        if (related.length >= limit) break;
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        related.push(a);
      }
    }

    return ok(related.slice(0, limit).map(toArticleCard));
  };
