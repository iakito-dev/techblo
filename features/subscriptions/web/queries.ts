import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@/db/client';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { logger } from '@/lib/observability/logger';
import type { UserId } from '@/shared/type-utils';
import type { SubscriptionSetting } from '../application/dto';
import { listSubscriptions } from '../application/list-subscriptions';
import { DrizzleSubscriptionRepository } from '../infrastructure/drizzle-subscription-repository';

/**
 * RSC が呼ぶ composition root(Driving Adapter)。
 * repository を組み立てて usecase に注入し、想定エラーはログして throw する。
 * Server Component / Server Action からのみ import すること。
 */
const subscriptionRepo = new DrizzleSubscriptionRepository(db);

export async function getSubscriptionSettings(userId: UserId): Promise<SubscriptionSetting[]> {
  'use cache';
  cacheTag(CACHE_TAGS.userSubscriptions(userId));
  // 設定画面の購読トグル Server Action が userSubscriptions タグを無効化するので、寿命は鮮度ではなく
  // 「トグルが来なかった時の上限」。'minutes' だと数分でコールドに戻り、フィードの企業フィルタ解決
  // (getEnabledCompanyIds)のたびに Neon 往復する。'hours' に延ばす(トグル時は即時反映を維持)。
  cacheLife('hours');

  const result = await listSubscriptions({ subscriptions: subscriptionRepo })({ userId });
  if (!result.ok) {
    logger.error('listSubscriptions failed', { error: result.error, userId });
    throw new Error('購読設定の取得に失敗しました', { cause: result.error });
  }
  return result.value;
}

/**
 * 購読 ON の企業 id のみを返す(フィード絞り込み用)。
 * 状態行が無い企業はデフォルト ON 扱い(mergeSettings)。
 * 空配列 = 全企業 OFF。呼び出し側はこれをフィルタ条件ではなく「全 OFF」として扱うこと。
 */
export async function getEnabledCompanyIds(userId: UserId): Promise<string[]> {
  const settings = await getSubscriptionSettings(userId);
  return settings.filter((s) => s.enabled).map((s) => s.companyId);
}
