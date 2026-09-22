import { redirect } from 'next/navigation';
import { Suspense } from 'react';

/**
 * 旧・新規登録ページ。OAuth のみで「ログイン/新規登録」の操作が同一になったため /login に統合。
 * 既存の流入リンク(LP の CTA・ブックマーク等)を維持するため、callbackURL を引き継いでリダイレクトする。
 */
export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <SignupRedirect searchParams={searchParams} />
    </Suspense>
  );
}

async function SignupRedirect({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const { callbackURL } = await searchParams;
  redirect(callbackURL ? `/login?callbackURL=${encodeURIComponent(callbackURL)}` : '/login');
  return null;
}
