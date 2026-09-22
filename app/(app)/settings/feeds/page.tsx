import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SettingsBackLink } from '../_components/settings-back-link';
import { SettingsDesktop } from '../_components/settings-desktop';
import { SettingsFrame } from '../_components/settings-frame';
import { UserFeedSettings } from '../_components/settings-sections';

export const metadata: Metadata = {
  title: 'マイフィード',
  robots: { index: false, follow: false },
};

/**
 * モバイルのドリルダウン: マイフィード。
 * ログイン専用機能だが導線はゲストにも見せ、ゲストはログイン案内を表示する
 * (UserFeedSettings がゲスト/ログインを出し分ける)。
 * デスクトップは index と同じフル単一ページを描画する。
 */
export default function SettingsFeedsPage() {
  return (
    <SettingsFrame>
      <SettingsDesktop className="hidden lg:block" />
      <div className="lg:hidden" data-swipe-nav-ignore>
        <SettingsBackLink />
        <Suspense fallback={null}>
          <UserFeedSettings />
        </Suspense>
      </div>
    </SettingsFrame>
  );
}
