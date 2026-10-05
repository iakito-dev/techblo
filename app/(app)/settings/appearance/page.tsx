import type { Metadata } from 'next';
import { SettingsBackLink } from '../_components/settings-back-link';
import { SettingsDesktop } from '../_components/settings-desktop';
import { SettingsFrame } from '../_components/settings-frame';
import { AppearanceSettings } from '../_components/settings-sections';

export const metadata: Metadata = {
  title: '表示',
  robots: { index: false, follow: false },
};

/**
 * モバイルのドリルダウン: 表示(テーマ)。
 * デスクトップは index と同じフル単一ページを描画する。
 */
export default function SettingsAppearancePage() {
  return (
    <SettingsFrame>
      <SettingsDesktop className="hidden lg:block" />
      <div className="lg:hidden" data-swipe-nav-ignore>
        <SettingsBackLink />
        <AppearanceSettings />
      </div>
    </SettingsFrame>
  );
}
