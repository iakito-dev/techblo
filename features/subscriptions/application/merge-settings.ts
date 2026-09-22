import type { CompanyChoice, UserSubscriptionState } from '../domain/subscription';
import type { SubscriptionSetting } from './dto';

/**
 * 有効企業一覧とユーザーの購読状態をマージして表示 DTO を作る純粋関数。
 * 状態行が無い企業は enabled=true(新企業はデフォルト ON / docs/features/subscriptions.md)。
 * 企業の並び順は入力の companies の順を保持する。
 */
export function mergeSettings(
  companies: CompanyChoice[],
  states: UserSubscriptionState[],
): SubscriptionSetting[] {
  const enabledByCompany = new Map(states.map((s) => [s.companyId, s.enabled]));
  return companies.map((c) => ({
    companyId: c.id,
    name: c.name,
    slug: c.slug,
    brandColor: c.brandColor,
    siteUrl: c.siteUrl,
    enabled: enabledByCompany.get(c.id) ?? true,
  }));
}
