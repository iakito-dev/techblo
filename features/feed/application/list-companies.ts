import { compareCompanyNames } from '@/shared/company-name-order';
import { ok, type Result } from '@/shared/result';
import type { CompanyRepository } from '../domain/company-repository';
import type { FeedError } from '../domain/errors';
import type { CompanyWithCount } from './dto';

/**
 * 有効な企業一覧を記事数つきで取得するユースケース(サイドバー・絞り込みシート・ゲストの購読設定用)。
 * 並びは記事数の多い順、同数なら企業名順。記事数が並ぶ企業(追加直後の 0 件の企業など)の順序を
 * DB の集計順任せにすると、キャッシュの再検証ごとに入れ替わり、一覧で目当ての企業の位置が定まらないため。
 */
export const listCompanies =
  (deps: { companies: CompanyRepository }) =>
  async (): Promise<Result<CompanyWithCount[], FeedError>> => {
    const rows = await deps.companies.listEnabledWithCounts();
    return ok(
      [...rows].sort(compareByArticleCountThenName).map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        brandColor: c.brandColor,
        siteUrl: c.siteUrl,
        articleCount: c.articleCount,
      })),
    );
  };

function compareByArticleCountThenName(
  a: { articleCount: number; name: string },
  b: { articleCount: number; name: string },
): number {
  return b.articleCount - a.articleCount || compareCompanyNames(a.name, b.name);
}
