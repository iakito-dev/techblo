import { captureEvent } from '@/lib/observability/posthog';

/**
 * 購読の追加 / 解除を PostHog に送る(subscription_added / subscription_removed)。
 * ログイン時は Server Action の成功後、ゲスト時は Cookie を書く時点で呼ぶ。
 * 一括操作(すべて表示/非表示)は実際に状態が変わった企業だけを bulk=true で送る。
 */
export function trackSubscriptionChange(
  company: { companyId: string | null; slug: string },
  enabled: boolean,
  options: { isGuest: boolean; bulk: boolean },
): void {
  captureEvent(enabled ? 'subscription_added' : 'subscription_removed', {
    companyId: company.companyId,
    companySlug: company.slug,
    ...options,
  });
}
