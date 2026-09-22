import { ok, type Result } from '@/shared/result';
import type { CompanyRepository } from '../domain/company-repository';
import type { FeedError } from '../domain/errors';
import type { CompanyDetailDto } from './dto';

/**
 * slug で1社の詳細を取得するユースケース(企業ページ /companies/[slug] 用)。
 * 有効な企業が無ければ null(呼び出し側で notFound に変換する)。
 */
export const getCompany =
  (deps: { companies: CompanyRepository }) =>
  async (slug: string): Promise<Result<CompanyDetailDto | null, FeedError>> => {
    const c = await deps.companies.findBySlug(slug);
    if (!c) return ok(null);
    return ok({
      id: c.id,
      slug: c.slug,
      name: c.name,
      brandColor: c.brandColor,
      siteUrl: c.siteUrl,
      description: c.description,
      articleCount: c.articleCount,
    });
  };
