import { eq } from 'drizzle-orm';
// import type のみ。db/client を実行時にロードしない(env 検証を起動させずユニットテスト可能に保つ)
import type { Database } from '@/db/client';
import { companies } from '@/db/schema/companies';
import { type NewSubscription, subscriptions } from '@/db/schema/subscriptions';
import { logger } from './observability/logger';

/**
 * 全有効企業をユーザーの購読行(enabled=true)へマップする純粋関数。
 */
export function toNewSubscriptions(userId: string, companyIds: string[]): NewSubscription[] {
  return companyIds.map((companyId) => ({ userId, companyId, enabled: true }));
}

/**
 * 初回ログイン(ユーザー作成)時に全有効企業を購読として投入する。
 *
 * - Better Auth の databaseHooks.user.create.after から呼ばれる(docs/adr/0012)。
 * - `subscriptions_user_company_uq` により冪等(再実行で重複挿入しない)。
 * - 単一 INSERT 文で完結させる(元は neon-http のトランザクション非対応に合わせた形。postgres-js 移行後もそのまま有効。ADR-0033)。
 *
 * @returns 実際に挿入された購読数(既存分は onConflictDoNothing で除外される)
 */
export async function initializeUserSubscriptions(db: Database, userId: string): Promise<number> {
  const enabledCompanies = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.enabled, true));

  if (enabledCompanies.length === 0) {
    logger.warn('no enabled companies to subscribe on signup', { userId });
    return 0;
  }

  const inserted = await db
    .insert(subscriptions)
    .values(
      toNewSubscriptions(
        userId,
        enabledCompanies.map((c) => c.id),
      ),
    )
    .onConflictDoNothing()
    .returning({ id: subscriptions.id });

  return inserted.length;
}
