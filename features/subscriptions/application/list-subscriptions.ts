import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { UserId } from '@/shared/type-utils';
import type { SubscriptionRepository } from '../domain/subscription-repository';
import type { SubscriptionSetting } from './dto';
import { mergeSettings } from './merge-settings';

/**
 * ユーザーの購読設定一覧を取得するユースケース。依存は引数注入(DB なしで単体テスト可)。
 */
export const listSubscriptions =
  (deps: { subscriptions: SubscriptionRepository }) =>
  async ({ userId }: { userId: UserId }): Promise<Result<SubscriptionSetting[], CommonError>> => {
    const [companies, states] = await Promise.all([
      deps.subscriptions.listEnabledCompanies(),
      deps.subscriptions.listUserStates(userId),
    ]);
    return ok(mergeSettings(companies, states));
  };
