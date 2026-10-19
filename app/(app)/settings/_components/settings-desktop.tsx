import { Suspense } from 'react';
import { AccountCard } from '@/features/auth/components/account-card';
import { SubscriptionListSkeleton } from '@/features/subscriptions/web/components/subscription-list-skeleton';
import {
  AppearanceSettings,
  SubscriptionSettings,
  SupportSettings,
  UserFeedSettings,
} from './settings-sections';
import { SettingsToc } from './settings-toc';

/** セクション間の余白とアンカージャンプ時の上余白(scroll-mt)。 */
const SECTION_CLASS = 'mt-10 scroll-mt-6';

/**
 * デスクトップ(lg+)の設定ページ。全セクションを1カラムで縦積みし、xl+ では右に目次
 * (SettingsToc)を出す。各ブロックの id は SETTINGS_SECTIONS と一致させる。
 * モバイルでは親が `hidden lg:block` で隠し、各サブルートが個別画面を出す
 * (どのサブルートでもデスクトップはこの同じフルページを描画する)。
 *
 * マイフィードはログイン専用機能だが、ゲストにも導線として見せる
 * (UserFeedSettings がゲスト時はログイン案内を返す)。
 */
export function SettingsDesktop({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="mx-auto max-w-[52rem] xl:grid xl:max-w-none xl:grid-cols-[minmax(0,52rem)_10rem] xl:justify-center xl:gap-12">
        <div className="min-w-0">
          <h1 className="mb-6 font-bold text-xl tracking-tight">設定</h1>
          <div id="account" className="scroll-mt-6">
            <AccountCard />
          </div>
          <div id="companies" className={SECTION_CLASS}>
            <Suspense fallback={<SubscriptionListSkeleton />}>
              <SubscriptionSettings />
            </Suspense>
          </div>
          <div id="feeds" className={SECTION_CLASS}>
            <Suspense fallback={null}>
              <UserFeedSettings guestCta="inline" />
            </Suspense>
          </div>
          <div id="appearance" className={SECTION_CLASS}>
            <AppearanceSettings />
          </div>
          <div id="support" className={SECTION_CLASS}>
            <SupportSettings />
          </div>
        </div>
        <aside className="hidden pt-14 xl:block">
          <SettingsToc />
        </aside>
      </div>
    </div>
  );
}
