import { Suspense } from 'react';
import { AccountCard } from '@/features/auth/components/account-card';
import { SubscriptionListSkeleton } from '@/features/subscriptions/web/components/subscription-list-skeleton';
import {
  AppearanceSettings,
  SubscriptionSettings,
  SupportSettings,
  UserFeedSettings,
} from './settings-sections';

/**
 * デスクトップ(lg+)の設定ページ。全セクションを1カラムで縦積みする(従来レイアウト)。
 * モバイルでは親が `hidden lg:block` で隠し、各サブルートが個別画面を出す
 * (どのサブルートでもデスクトップはこの同じフルページを描画する)。
 *
 * マイフィードはログイン専用機能だが、ゲストにも導線として見せる
 * (UserFeedSettings がゲスト時はログイン案内を返す)。
 */
export function SettingsDesktop({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="mx-auto max-w-[52rem]">
        <h1 className="mb-6 font-bold text-xl tracking-tight">設定</h1>
        <div className="mb-8">
          <AccountCard />
        </div>
        <Suspense fallback={<SubscriptionListSkeleton />}>
          <SubscriptionSettings />
        </Suspense>
        <div className="mt-10">
          <Suspense fallback={null}>
            <UserFeedSettings guestCta="inline" />
          </Suspense>
        </div>
        <div className="mt-10">
          <AppearanceSettings />
        </div>
        <div className="mt-10">
          <SupportSettings />
        </div>
      </div>
    </div>
  );
}
