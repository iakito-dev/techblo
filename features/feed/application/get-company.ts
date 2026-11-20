import { ok, type Result } from '@/shared/result';
import { hasNul } from '@/shared/text';
import type { CompanyRepository } from '../domain/company-repository';
import type { FeedError } from '../domain/errors';
import type { CompanyDetailDto } from './dto';

/**
 * slug で1社の詳細を取得するユースケース(フィードの企業絞り込み `/?company=` の見出しと企業別 RSS 用。
 * 企業ページは ADR-0048 で廃止)。有効な企業が無ければ null(見出しは企業名なしに、RSS は 404 にする)。
 */
export const getCompany =
  (deps: { companies: CompanyRepository }) =>
  async (slug: string): Promise<Result<CompanyDetailDto | null, FeedError>> => {
    // slug に NUL(URL の %00)が混ざると Postgres がエラーにするので、DB へ行かず「無い」扱いにする。
    if (hasNul(slug)) return ok(null);
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
