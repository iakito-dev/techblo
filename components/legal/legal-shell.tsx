import Link from 'next/link';
import { Suspense } from 'react';
import { Header } from '@/components/layout/header';

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
      <Suspense fallback={<div className="h-16 border-border-default border-b bg-bg-surface" />}>
        <Header />
      </Suspense>

      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="font-bold text-2xl tracking-tight md:text-3xl">{title}</h1>
          {lastUpdated && <p className="mt-2 text-fg-muted text-sm">最終更新日: {lastUpdated}</p>}
        </header>

        <div className="flex flex-col gap-8 text-fg-secondary leading-relaxed [word-break:auto-phrase]">
          {children}
        </div>

        <nav className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-border-default border-t pt-6 text-fg-muted text-sm">
          <Link href="/privacy" className="transition-colors hover:text-fg-default">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="transition-colors hover:text-fg-default">
            利用規約
          </Link>
          <Link href="/about" className="transition-colors hover:text-fg-default">
            運営者情報・お問い合わせ
          </Link>
        </nav>
      </main>
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
      <h2 className="font-semibold text-fg-default text-lg">{heading}</h2>
      {children}
    </section>
  );
}
