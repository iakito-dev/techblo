import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { href: '#features', label: '機能' },
  { href: '#companies', label: '対応企業' },
  { href: '#voices', label: '使い方' },
] as const;

/**
 * LP 上部の固定ナビ。ロゴ + アンカーリンク + ログイン/CTA。
 * モバイルではアンカーリンクを畳み、ロゴと CTA だけ残す(クライアント JS 不要のサーバー実装)。
 */
export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-border-default/70 border-b bg-bg-app/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative font-medium text-fg-muted text-sm transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-fg-default after:transition-all after:duration-300 hover:text-fg-default hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">ログイン</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">無料で始める</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
