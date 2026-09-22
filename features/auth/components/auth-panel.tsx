import { Bell, Bookmark, Heart, Rss } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '../server';
import { AuthHeading } from './auth-heading';
import { SocialSignInButtons } from './social-sign-in-buttons';

/**
 * 認証画面(/login)の中央カード。認証は OAuth のみで「ログイン/新規登録」の操作は同一のため、
 * 旧 /login・/signup を1画面に統合した(/signup は /login にリダイレクト)。見出しだけ AuthHeading が
 * 「前回利用」の有無で出し分け、迷わせない(docs/features/auth.md)。
 *
 * 動的(searchParams / セッション判定)をこのコンポーネントに閉じ、ページ側は静的シェル +
 * Suspense 境界だけを持つ。既にログイン済みなら callbackURL(なければトップ)へ戻す。
 */
export async function AuthPanel({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const { callbackURL } = await searchParams;
  const session = await getSession();
  if (session) redirect(callbackURL ?? '/');

  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      {/* favicon / apple-icon と同じブランドマーク(2×2 ドット)。
          ティール地に対角=白 / 反対角=ミントで「複数ソースの集約」を象徴する。 */}
      <span aria-hidden className="grid size-12 place-items-center rounded-md bg-accent">
        <span className="grid grid-cols-2 gap-1.5">
          <span className="size-2 rounded-full bg-fg-inverse" />
          <span className="size-2 rounded-full bg-border-strong" />
          <span className="size-2 rounded-full bg-border-strong" />
          <span className="size-2 rounded-full bg-fg-inverse" />
        </span>
      </span>
      <AuthHeading />

      <div className="mt-8 w-full rounded-lg border border-border-default bg-bg-surface p-6 shadow-sm">
        <ul className="mb-6 flex flex-col gap-3">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-fg-secondary text-sm">
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-bg-surface-2 text-accent">
                <Icon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
        <SocialSignInButtons callbackURL={callbackURL} />
      </div>

      <p className="mt-6 text-center text-fg-secondary text-xs [word-break:auto-phrase]">
        続けると
        <Link href="/terms" className="text-accent hover:underline">
          利用規約
        </Link>
        と
        <Link href="/privacy" className="text-accent hover:underline">
          プライバシーポリシー
        </Link>
        に同意したものとみなされます。
      </p>
    </div>
  );
}

/** 中央カードと同寸のローディングプレースホルダ(Suspense フォールバック)。 */
export function AuthPanelSkeleton() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      <span className="size-12 animate-pulse rounded-md bg-bg-surface-2" />
      <div className="mt-5 h-7 w-44 animate-pulse rounded bg-bg-surface-2" />
      <div className="mt-2 h-4 w-32 animate-pulse rounded bg-bg-surface-2" />
      <div className="mt-8 w-full rounded-lg border border-border-default bg-bg-surface p-6 shadow-sm">
        <div className="mb-6 h-[7rem] animate-pulse rounded bg-bg-surface-2" />
        <div className="flex flex-col gap-3">
          <div className="h-12 w-full animate-pulse rounded-md bg-bg-surface-2" />
          <div className="flex gap-3">
            <div className="h-12 flex-1 animate-pulse rounded-md bg-bg-surface-2" />
            <div className="h-12 flex-1 animate-pulse rounded-md bg-bg-surface-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

const BENEFITS = [
  { icon: Bookmark, text: 'あとで読む記事を全端末で同期' },
  { icon: Heart, text: '良かった記事をお気に入りに保存' },
  { icon: Bell, text: 'チェックしたい企業だけを表示' },
  { icon: Rss, text: '好きなブログのRSSをマイフィードに登録' },
] as const;
