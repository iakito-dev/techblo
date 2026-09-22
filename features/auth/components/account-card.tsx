'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from '../client';
import { SocialSignInButtons } from './social-sign-in-buttons';
import { UserMenu } from './user-menu';

/**
 * 設定タブ最上部の登録 / アカウントカード。
 * ログイン導線はヘッダーから外し、ここに集約する(docs/features/auth.md)。
 * - ゲスト: 「登録してデータを引き継ぐ」カード(無料登録 CTA + ログインリンク)
 * - ログイン済み: アカウント情報(アバター / 名前 / メール、UserMenu からログアウト)
 *
 * 認証状態はクライアントの useSession() で取得する。SSR は常に pending なので、
 * マウント前は skeleton を出してハイドレーション不一致を避ける(Header と同型のガード)。
 */
export function AccountCard() {
  const { data: session, isPending } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || isPending) {
    return <div className="h-28 animate-pulse rounded-lg bg-bg-surface-2" />;
  }

  if (session) {
    return (
      <div className="rounded-lg border border-border-default bg-bg-surface p-3 shadow-xs">
        <UserMenu
          name={session.user.name}
          email={session.user.email}
          image={session.user.image ?? null}
          full
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-default bg-bg-surface p-5 shadow-xs">
      <h2 className="font-bold text-fg-default text-lg">アカウント登録して設定を引き継ぐ</h2>
      <p className="mt-1.5 text-fg-secondary text-sm leading-relaxed">
        あとで読むやお気に入り、フィード画面の表示設定がすべての端末で同期されます。
      </p>
      <div className="mt-4">
        <SocialSignInButtons callbackURL="/settings" />
      </div>
      <p className="mt-3 text-center text-fg-secondary text-sm">
        登録済みの方は
        <Link
          href="/login?callbackURL=%2Fsettings"
          className="font-medium text-accent hover:underline"
        >
          ログイン
        </Link>
      </p>
    </div>
  );
}
