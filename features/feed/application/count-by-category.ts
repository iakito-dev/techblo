import { ok, type Result } from '@/shared/result';
import type { CompanyId } from '@/shared/type-utils';
import type { ArticleRepository, CategoryCounts } from '../domain/article-repository';
import type { FeedError } from '../domain/errors';

/**
 * カテゴリ別の記事数を取得するユースケース(モバイルのカテゴリ絞り込みの件数表示用)。
 * listCompanies と同型の薄いラッパー(Repository の戻りをそのまま Result に包むだけ)。
 */
export const countByCategory =
  (deps: { articles: ArticleRepository }) =>
  async (companyIds?: CompanyId[]): Promise<Result<CategoryCounts, FeedError>> => {
    const counts = await deps.articles.countByCategory(companyIds);
    return ok(counts);
  };
