import Link from 'next/link';
import { Suspense } from 'react';
import { DesktopHomeBar } from '@/components/layout/desktop-home-bar';
import { Header } from '@/components/layout/header';
import { ScrollToTop } from '@/components/layout/scroll-to-top';
import { SkipLink } from '@/components/layout/skip-link';

/**
 * プライバシーポリシー / 利用規約 / 運営者情報 など、テキスト主体の静的ページの共有シェル。
 * 企業ページと同じく公開ページなので Header を載せ、本文は読みやすい一段組みに収める。
 */
export function LegalShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh pb-24 lg:pb-12">
      <SkipLink />
      <Suspense fallback={<div className="border-border-default bg-bg-surface h-16 border-b" />}>
        <Header />
      </Suspense>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-3xl px-4 py-10 focus:outline-none md:px-6 lg:px-8"
      >
        <DesktopHomeBar className="mb-8" />
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {lastUpdated && <p className="text-fg-muted mt-2 text-sm">最終更新日: {lastUpdated}</p>}
        </header>

        <div className="text-fg-secondary flex flex-col gap-8 leading-relaxed [word-break:auto-phrase]">
          {children}
        </div>

        <nav className="border-border-default text-fg-muted mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t pt-6 text-sm">
          <Link href="/privacy" className="hover:text-fg-default transition-colors">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="hover:text-fg-default transition-colors">
            利用規約
          </Link>
          <Link href="/about" className="hover:text-fg-default transition-colors">
            運営者情報・お問い合わせ
          </Link>
        </nav>
      </main>
      <ScrollToTop />
    </div>
  );
}

/** 法的ページ内の見出し付きセクション。 */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-fg-default text-lg font-semibold">{heading}</h2>
      {children}
    </section>
  );
}
