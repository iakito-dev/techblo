import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SubscriptionListSkeleton } from '@/features/subscriptions/web/components/subscription-list-skeleton';
import { SettingsBackLink } from '../_components/settings-back-link';
import { SettingsDesktop } from '../_components/settings-desktop';
import { SettingsFrame } from '../_components/settings-frame';
import { SubscriptionSettings } from '../_components/settings-sections';

export const metadata: Metadata = {
  title: '表示する企業',
  robots: { index: false, follow: false },
};

/**
 * モバイルのドリルダウン: 表示する企業。
 * デスクトップは index と同じフル単一ページを描画する(レイアウト一貫・リダイレクト不要)。
 */
export default function SettingsCompaniesPage() {
  return (
    <SettingsFrame>
      <SettingsDesktop className="hidden lg:block" />
      <div className="lg:hidden" data-swipe-nav-ignore>
        <SettingsBackLink />
        <Suspense fallback={<SubscriptionListSkeleton />}>
          <SubscriptionSettings />
        </Suspense>
      </div>
    </SettingsFrame>
  );
}
