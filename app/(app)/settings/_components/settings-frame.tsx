import type { ReactNode } from 'react';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';

/**
 * 設定ルート(index / companies / feeds / support)の共通外枠。
 * シェル(Header/Sidebar/MobileNav)は (app)/layout.tsx が保持するため、ここは
 * コンテンツ領域の余白・サイドバーオフセット・最大幅だけを担う。
 */
export function SettingsFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh pb-24 lg:pt-6 lg:pb-8 lg:pl-64">
      <div className={`mx-auto max-w-[1200px] ${MOBILE_GUTTER_CLASS} md:px-6 lg:px-8`}>
        {children}
      </div>
    </div>
  );
}
