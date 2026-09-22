import type { CompanyId, UserId } from '@/shared/type-utils';
import type { CompanyChoice, UserSubscriptionState } from './subscription';

/**
 * Driven Port。実装は infrastructure 層に置く。
 */
export interface SubscriptionRepository {
  /** 購読対象になりうる有効企業の一覧。 */
  listEnabledCompanies(): Promise<CompanyChoice[]>;
  /** ユーザーが明示的に保持している購読状態(行が無い企業はデフォルト ON 扱い)。 */
  listUserStates(userId: UserId): Promise<UserSubscriptionState[]>;
  /** 1 企業の購読 ON/OFF を upsert する。 */
  setEnabled(userId: UserId, companyId: CompanyId, enabled: boolean): Promise<void>;
}
