import type { Metadata } from 'next';
import { SettingsBackLink } from '../_components/settings-back-link';
import { SettingsDesktop } from '../_components/settings-desktop';
import { SettingsFrame } from '../_components/settings-frame';
import { SupportSettings } from '../_components/settings-sections';

export const metadata: Metadata = {
  title: 'サポート',
  robots: { index: false, follow: false },
};

/**
 * モバイルのドリルダウン: サポート。
 * デスクトップは index と同じフル単一ページを描画する。
 */
export default function SettingsSupportPage() {
  return (
    <SettingsFrame>
      <SettingsDesktop className="hidden lg:block" />
      <div className="lg:hidden" data-swipe-nav-ignore>
        <SettingsBackLink />
        <SupportSettings />
      </div>
    </SettingsFrame>
  );
}
