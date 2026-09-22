import { err, ok, type Result } from '@/shared/result';
import { asCompanyId } from '@/shared/type-utils';
import type { ArticleDraft } from '../domain/article';
import type { ArticleRepository } from '../domain/article-repository';

/**
 * RSS 取得した記事を保存するユースケース(ingest の sink として注入される)。
 * 重複排除キーは url。throw せず Result を返す。
 */
export const upsertArticles =
  (deps: { articles: ArticleRepository }) =>
  async (companyId: string, items: ArticleDraft[]): Promise<Result<number, string>> => {
    try {
      const n = await deps.articles.upsertMany(asCompanyId(companyId), items);
      return ok(n);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  };
