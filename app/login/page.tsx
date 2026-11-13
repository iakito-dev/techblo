import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthPanel, AuthPanelSkeleton } from '@/features/auth/components/auth-panel';

export const metadata: Metadata = {
  title: 'ログイン / 新規登録',
  robots: { index: false, follow: false },
};

/**
 * 認証ページ。OAuth のみで「ログイン/新規登録」の操作が同一のため1画面に統合(旧 /signup は本ページへリダイレクト)。
 * 静的シェル(外枠)は即表示し、searchParams / セッション判定(動的)は Suspense 境界内に閉じる。
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  return (
    <main className="relative grid min-h-dvh place-items-center px-4 pt-16 pb-12">
      {/*
        アプリのヘッダー・下部ナビが無い単独画面なので、ログインをやめてフィードへ戻る導線を置く。
        無いとブラウザの戻るしか手段が無く、ホーム画面に追加した PWA(戻るボタンが無い)では行き止まりになる。
      */}
      <Link
        href="/"
        className="text-fg-muted hover:text-fg-default focus-visible:ring-accent absolute top-3 left-2 inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none sm:top-4 sm:left-4"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        フィードへ戻る
      </Link>
      <Suspense fallback={<AuthPanelSkeleton />}>
        <AuthPanel searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
