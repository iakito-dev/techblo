'use client';

import { Bookmark, Heart, Rss, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useBottomChrome } from './bottom-chrome';

const ITEMS = [
  { icon: Rss, label: 'フィード', href: '/' },
  { icon: Bookmark, label: 'あとで読む', href: '/bookmarks' },
  { icon: Heart, label: 'お気に入り', href: '/favorites' },
  { icon: Settings, label: '設定', href: '/settings' },
] as const;

/** href が現在地かどうか('/' は完全一致、それ以外は配下も含めてアクティブ扱い)。 */
function isCurrent(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * モバイル下部タブナビ(<1024px で表示)。
 * 現在地は usePathname() で動的判定する。
 * iOS のタブバーに寄せ、半透明ブラー背景 + タップ時の押し込みフィードバックを付ける。
 */
export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { hidden } = useBottomChrome();
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    for (const { href } of ITEMS) {
      if (href !== pathname) router.prefetch(href);
    }
  }, [pathname, router]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const updateHeight = () => {
      document.documentElement.style.setProperty('--mobile-nav-h', `${nav.offsetHeight}px`);
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label="モバイルナビゲーション"
      className={`fixed inset-x-0 bottom-0 z-30 flex justify-around border-border-default border-t bg-bg-surface/80 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-xl backdrop-saturate-150 transition-transform duration-200 ease-out lg:hidden ${
        hidden ? 'translate-y-[calc(var(--mobile-nav-h)+3.5rem)]' : 'translate-y-0'
      }`}
    >
      {ITEMS.map(({ icon: Icon, label, href }) => {
        const current = isCurrent(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onTouchStart={() => router.prefetch(href)}
            onPointerEnter={() => router.prefetch(href)}
            onFocus={() => router.prefetch(href)}
            aria-current={current ? 'page' : undefined}
            className={`flex min-h-12 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-md px-3 py-1.5 font-medium text-[0.625rem] transition-all active:scale-90 ${
              current ? 'font-semibold text-fg-default' : 'text-fg-muted'
            }`}
          >
            <Icon className="size-6" strokeWidth={current ? 2.4 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
