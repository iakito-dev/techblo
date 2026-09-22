'use client';

import { Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from '@/features/auth/client';
import { UserMenu } from '@/features/auth/components/user-menu';
import { MobileSearchOverlay } from '@/features/feed/web/components/mobile-search-overlay';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';
import { Logo } from './logo';

/**
 * モバイル(<lg)の上部バー(ロゴ + アカウント)。
 * ナビは下部の MobileNav、デスクトップ(lg+)は AppSidebar が担う。
 * 認証状態はクライアントの useSession() で取得し、ログイン誘導 / アバターを出し分ける。
 * 詳細仕様: docs/features/auth.md
 */
export function Header() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 検索はフィード(/)専用。他ページではアイコンを出さない。
  const isFeed = pathname === '/';
  const showSearch = isFeed;

  // フィードの <md は専用ヘッダー(MobileFeedControls: 検索行 + チップ行)がロゴバーを
  // 置き換えるため、ここでは出さない(md〜lg のタブレットでは従来どおり表示する)。
  return (
    <header
      className={`sticky top-0 z-20 mb-8 border-border-default border-b bg-bg-surface/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 lg:hidden ${
        isFeed ? 'max-md:hidden' : ''
      }`}
    >
      <div
        className={`mx-auto flex h-16 max-w-[1200px] items-center ${MOBILE_GUTTER_CLASS} md:px-6`}
      >
        <Logo />
        <div className="ml-auto flex items-center gap-1">
          {showSearch && (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="記事を検索"
              className="grid size-11 touch-manipulation place-items-center rounded-full text-fg-secondary transition-colors active:bg-bg-surface-2"
            >
              <Search className="size-5" />
            </button>
          )}
          {/* ログイン導線は設定タブの登録カードへ集約した。ここではゲストに何も出さない
              (ログイン済みのアバターのみ。docs/features/auth.md)。 */}
          {!mounted || isPending ? (
            <span className="size-9 animate-pulse rounded-full bg-bg-surface-2" />
          ) : session ? (
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              image={session.user.image ?? null}
            />
          ) : null}
        </div>
      </div>
      {/* open のときだけマウントする(useSearchParams を prerender 時に走らせず Suspense 境界を不要にする)。 */}
      {showSearch && searchOpen && (
        <MobileSearchOverlay open onClose={() => setSearchOpen(false)} />
      )}
    </header>
  );
}
