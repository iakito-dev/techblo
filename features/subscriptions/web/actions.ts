'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { headers } from 'next/headers';
import { db } from '@/db/client';
import { auth } from '@/lib/auth';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { logger } from '@/lib/observability/logger';
import type { CommonError } from '@/shared/error';
import { err, type Result } from '@/shared/result';
import { asCompanyId, asUserId } from '@/shared/type-utils';
import { toggleSubscription } from '../application/toggle-subscription';
import { DrizzleSubscriptionRepository } from '../infrastructure/drizzle-subscription-repository';
import { getSubscriptionSettings } from './queries';

const subscriptionRepo = new DrizzleSubscriptionRepository(db);

/**
 * 購読 ON/OFF を切り替える Server Action。
 * セッションは features 間 import を避けるため lib/auth から直接取得する(ADR-0002)。
 */
export async function toggleSubscriptionAction(input: {
  companyId: string;
  enabled: boolean;
}): Promise<Result<{ enabled: boolean }, CommonError>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return err({ kind: 'UNAUTHORIZED' });

  const result = await toggleSubscription({ subscriptions: subscriptionRepo })({
    userId: asUserId(session.user.id),
    companyId: asCompanyId(input.companyId),
    enabled: input.enabled,
  });

  if (!result.ok) {
    logger.error('toggleSubscription failed', {
      error: result.error,
      userId: session.user.id,
      companyId: input.companyId,
    });
    return result;
  }

  // 購読変更はトップフィードの絞り込みに影響するためユーザータグで無効化する
  updateTag(CACHE_TAGS.userSubscriptions(asUserId(session.user.id)));
  revalidatePath('/settings');
  return result;
}

/**
 * ゲスト時に Cookie で OFF にしていた購読企業を、ログイン後の DB へ反映する(ADR-0017 と同じ移行)。
 * サインアップ時は全社 ON で初期化される(ADR-0012)ため、OFF 指定の企業だけを OFF へ落とす。
 * disabledSlugs はゲスト Cookie 由来。冪等(既に OFF はスキップ)。GuestSavesMigrator から呼ぶ。
 */
export async function migrateGuestSubscriptions(disabledSlugs: string[]): Promise<void> {
  if (disabledSlugs.length === 0) return;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return;
  const userId = asUserId(session.user.id);

  // slug → companyId はユーザー自身の設定(slug 同梱)から引く(features/feed を import しないため)。
  const settings = await getSubscriptionSettings(userId);
  const disabled = new Set(disabledSlugs);
  const targets = settings.filter((s) => disabled.has(s.slug) && s.enabled);
  if (targets.length === 0) return;

  for (const t of targets) {
    const result = await toggleSubscription({ subscriptions: subscriptionRepo })({
      userId,
      companyId: t.companyId,
      enabled: false,
    });
    if (!result.ok) {
      logger.error('migrateGuestSubscriptions failed', {
        error: result.error,
        userId,
        slug: t.slug,
      });
    }
  }

  updateTag(CACHE_TAGS.userSubscriptions(userId));
  revalidatePath('/settings');
}
