import { eq } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { companies } from '@/db/schema/companies';
import { subscriptions } from '@/db/schema/subscriptions';
import { asCompanyId, type CompanyId, type UserId } from '@/shared/type-utils';
import type { CompanyChoice, UserSubscriptionState } from '../domain/subscription';
import type { SubscriptionRepository } from '../domain/subscription-repository';

/**
 * SubscriptionRepository の Drizzle 実装(Driven Adapter)。
 * 更新は単一の upsert 文で完結させる(元は neon-http のトランザクション非対応に合わせた形。postgres-js 移行後もそのまま有効。ADR-0033)。
 */
export class DrizzleSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly db: Database) {}

  async listEnabledCompanies(): Promise<CompanyChoice[]> {
    const rows = await this.db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        brandColor: companies.brandColor,
        siteUrl: companies.siteUrl,
      })
      .from(companies)
      .where(eq(companies.enabled, true))
      .orderBy(companies.name);

    return rows.map((r) => ({
      id: asCompanyId(r.id),
      name: r.name,
      slug: r.slug,
      brandColor: r.brandColor,
      siteUrl: r.siteUrl,
    }));
  }

  async listUserStates(userId: UserId): Promise<UserSubscriptionState[]> {
    const rows = await this.db
      .select({ companyId: subscriptions.companyId, enabled: subscriptions.enabled })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));

    return rows.map((r) => ({ companyId: asCompanyId(r.companyId), enabled: r.enabled }));
  }

  async setEnabled(userId: UserId, companyId: CompanyId, enabled: boolean): Promise<void> {
    await this.db
      .insert(subscriptions)
      .values({ userId, companyId, enabled })
      .onConflictDoUpdate({
        target: [subscriptions.userId, subscriptions.companyId],
        set: { enabled, updatedAt: new Date() },
      });
  }
}
