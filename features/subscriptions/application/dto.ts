import type { CompanyId } from '@/shared/type-utils';

/**
 * 購読設定 UI が必要とする 1 行分の表示 DTO。
 */
export type SubscriptionSetting = {
  companyId: CompanyId;
  name: string;
  slug: string;
  brandColor: string;
  siteUrl: string;
  enabled: boolean;
};
