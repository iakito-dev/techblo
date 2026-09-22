import { ok, type Result } from '@/shared/result';
import type { CompanyRepository } from '../domain/company-repository';
import type { FeedError } from '../domain/errors';
import type { CompanyWithCount } from './dto';

/**
 * 有効な企業一覧を記事数つきで取得するユースケース(サイドバー用)。
 */
export const listCompanies =
  (deps: { companies: CompanyRepository }) =>
  async (): Promise<Result<CompanyWithCount[], FeedError>> => {
    const rows = await deps.companies.listEnabledWithCounts();
    return ok(
      rows.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        brandColor: c.brandColor,
        siteUrl: c.siteUrl,
        articleCount: c.articleCount,
      })),
    );
  };
