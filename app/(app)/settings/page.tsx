import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SettingsDesktop } from './_components/settings-desktop';
import { SettingsFrame } from './_components/settings-frame';
import { SettingsMobileMenu } from './_components/settings-mobile-menu';

export const metadata: Metadata = {
  title: '設定',
  robots: { index: false, follow: false },
};

/**
 * 設定ページ(index)。
 * - デスクトップ(lg+): 左セクションナビ + 全セクションの単一ページ(SettingsDesktop)。
 * - モバイル(<lg): iOS 設定アプリ風のメニュー。企業 / マイフィード / サポートは
 *   各サブルート(/settings/companies など)へドリルダウンする。
 *
 * モバイル部は data-swipe-nav-ignore で包み、メニュー上の横スワイプがタブ間遷移に
 * 誤発火しないようにする(MobileSwipeNavigation の BLOCKING_SELECTOR が対応)。
 * shell(Header/Sidebar/MobileNav)は (app)/layout.tsx が保持する。
 */
export default function SettingsPage() {
  return (
    <SettingsFrame>
      <SettingsDesktop className="hidden lg:block" />
      <div className="lg:hidden" data-swipe-nav-ignore>
        <h1 className="mb-6 font-bold text-xl tracking-tight">設定</h1>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-bg-surface-2" />}>
          <SettingsMobileMenu />
        </Suspense>
      </div>
    </SettingsFrame>
  );
}
