import type { Metadata } from 'next';
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
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <Suspense fallback={<AuthPanelSkeleton />}>
        <AuthPanel searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
