import { compareCompanyNames } from '@/shared/company-name-order';
import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { UserId } from '@/shared/type-utils';
import type { SubscriptionRepository } from '../domain/subscription-repository';
import type { SubscriptionSetting } from './dto';
import { mergeSettings } from './merge-settings';

/**
 * ユーザーの購読設定一覧を取得するユースケース。依存は引数注入(DB なしで単体テスト可)。
 * 並びは企業名順。DB の ORDER BY name は照合順序のバイト順で、小文字始まりの企業名が末尾に回るため、
 * ここで日本語の照合(`compareCompanyNames`)で並べ直す(ゲストの一覧も同じ比較で並ぶ)。
 */
export const listSubscriptions =
  (deps: { subscriptions: SubscriptionRepository }) =>
  async ({ userId }: { userId: UserId }): Promise<Result<SubscriptionSetting[], CommonError>> => {
    const [companies, states] = await Promise.all([
      deps.subscriptions.listEnabledCompanies(),
      deps.subscriptions.listUserStates(userId),
    ]);
    const byName = [...companies].sort((a, b) => compareCompanyNames(a.name, b.name));
    return ok(mergeSettings(byName, states));
  };
