import { eq, sql } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { companies } from '@/db/schema/companies';
import type { FeedHealthSnapshot, HealthRepository } from '../domain/health-repository';

export class DrizzleHealthRepository implements HealthRepository {
  constructor(private readonly db: Database) {}

  async checkDb(): Promise<void> {
    await this.db.execute(sql`select 1`);
  }

  async getFeedSnapshot(input: {
    staleAfterHours: number;
    failingAfterCount: number;
  }): Promise<FeedHealthSnapshot> {
    const rows = await this.db
      .select({
        enabledCompanies: sql<number>`count(*)::int`,
        staleCompanies: sql<number>`count(*) filter (
          where ${companies.lastFetchedAt} is null
          or ${companies.lastFetchedAt} < now() - (${input.staleAfterHours} * interval '1 hour')
        )::int`,
        failingCompanies: sql<number>`count(*) filter (
          where ${companies.consecutiveFailures} >= ${input.failingAfterCount}
        )::int`,
        newestFetchedAt: sql<Date | null>`max(${companies.lastFetchedAt})`,
      })
      .from(companies)
      .where(eq(companies.enabled, true));

    const row = rows[0];
    return {
      enabledCompanies: row?.enabledCompanies ?? 0,
      staleCompanies: row?.staleCompanies ?? 0,
      failingCompanies: row?.failingCompanies ?? 0,
      newestFetchedAt: row?.newestFetchedAt ?? null,
    };
  }
}
