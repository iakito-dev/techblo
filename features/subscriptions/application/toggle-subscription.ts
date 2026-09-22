import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { CompanyId, UserId } from '@/shared/type-utils';
import type { SubscriptionRepository } from '../domain/subscription-repository';

/**
 * 1 企業の購読 ON/OFF を切り替えるユースケース。依存は引数注入。
 */
export const toggleSubscription =
  (deps: { subscriptions: SubscriptionRepository }) =>
  async ({
    userId,
    companyId,
    enabled,
  }: {
    userId: UserId;
    companyId: CompanyId;
    enabled: boolean;
  }): Promise<Result<{ enabled: boolean }, CommonError>> => {
    await deps.subscriptions.setEnabled(userId, companyId, enabled);
    return ok({ enabled });
  };
