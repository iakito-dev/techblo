import type { CompanyId } from '@/shared/type-utils';

/**
 * 購読設定で選べる企業(購読対象の母集合)。外部依存ゼロ。
 */
export type CompanyChoice = {
  id: CompanyId;
  name: string;
  slug: string;
  brandColor: string;
  siteUrl: string;
};

/**
 * あるユーザーの 1 企業に対する購読状態。
 */
export type UserSubscriptionState = {
  companyId: CompanyId;
  enabled: boolean;
};
