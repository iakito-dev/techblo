import { and, count, desc, eq, isNull, max } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { companies } from '@/db/schema/companies';
import { asCompanyId } from '@/shared/type-utils';
import type {
  CompanyDetail,
  CompanyRepository,
  CompanyWithCounts,
} from '../domain/company-repository';

/**
 * CompanyRepository の Drizzle 実装(Driven Adapter)。
 */
export class DrizzleCompanyRepository implements CompanyRepository {
  constructor(private readonly db: Database) {}

  async listEnabledWithCounts(): Promise<CompanyWithCounts[]> {
    const rows = await this.db
      .select({
        id: companies.id,
        slug: companies.slug,
        name: companies.name,
        brandColor: companies.brandColor,
        siteUrl: companies.siteUrl,
        articleCount: count(articles.id),
      })
      .from(companies)
      .leftJoin(articles, and(eq(articles.companyId, companies.id), isNull(articles.deletedAt)))
      .where(eq(companies.enabled, true))
      .groupBy(companies.id)
      .orderBy(desc(count(articles.id)));

    return rows.map((r) => ({
      id: asCompanyId(r.id),
      slug: r.slug,
      name: r.name,
      brandColor: r.brandColor,
      siteUrl: r.siteUrl,
      articleCount: r.articleCount,
    }));
  }

  async findBySlug(slug: string): Promise<CompanyDetail | null> {
    const rows = await this.db
      .select({
        id: companies.id,
        slug: companies.slug,
        name: companies.name,
        brandColor: companies.brandColor,
        siteUrl: companies.siteUrl,
        description: companies.description,
        articleCount: count(articles.id),
      })
      .from(companies)
      .leftJoin(articles, and(eq(articles.companyId, companies.id), isNull(articles.deletedAt)))
      .where(and(eq(companies.slug, slug), eq(companies.enabled, true)))
      .groupBy(companies.id)
      .limit(1);

    const r = rows[0];
    if (!r) return null;
    return {
      id: asCompanyId(r.id),
      slug: r.slug,
      name: r.name,
      brandColor: r.brandColor,
      siteUrl: r.siteUrl,
      description: r.description,
      articleCount: r.articleCount,
    };
  }

  async findLastIngestAttemptAt(): Promise<Date | null> {
    const rows = await this.db
      .select({
        lastFetchedAt: max(companies.lastFetchedAt),
        lastErrorAt: max(companies.lastErrorAt),
      })
      .from(companies)
      .where(eq(companies.enabled, true));

    const times = [rows[0]?.lastFetchedAt, rows[0]?.lastErrorAt].filter(
      (d): d is Date => d instanceof Date,
    );
    if (times.length === 0) return null;
    return new Date(Math.max(...times.map((d) => d.getTime())));
  }
}
