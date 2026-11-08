'use client';

import { Avatar, Button } from '@heroui/react';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut, useSession } from '../client';
import { SocialSignInButtons } from './social-sign-in-buttons';

/**
 * 設定タブ最上部の登録 / アカウントカード。
 * ログイン導線はヘッダーから外し、ここに集約する(docs/features/auth.md)。
 * - ゲスト: 「登録してデータを引き継ぐ」カード(無料登録 CTA + ログインリンク)
 * - ログイン済み: アカウント情報(アバター / 名前 / メール)+ ログアウトボタン。
 *   設定画面ではログアウトを探す場所なので、ドロップダウンに隠さず常に見せる。
 *
 * 認証状態はクライアントの useSession() で取得する。SSR は常に pending なので、
 * マウント前は skeleton を出してハイドレーション不一致を避ける(Header と同型のガード)。
 */
export function AccountCard() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || isPending) {
    return <div className="bg-bg-surface-2 h-28 animate-pulse rounded-lg" />;
  }

  if (session) {
    const { name, email, image } = session.user;
    async function handleSignOut() {
      setSigningOut(true);
      await signOut();
      router.refresh();
    }
    return (
      <div className="border-border-default bg-bg-surface flex items-center gap-3 rounded-lg border p-4 shadow-xs">
        <Avatar size="md">
          {image ? <Avatar.Image src={image} alt="" /> : null}
          <Avatar.Fallback className="bg-bg-inverse text-fg-inverse font-medium">
            {(name ?? email).charAt(0).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-fg-default truncate text-sm font-medium">{name ?? email}</span>
          {name && <span className="text-fg-muted truncate text-xs">{email}</span>}
        </div>
        <Button
          variant="outline"
          size="sm"
          isPending={signingOut}
          onPress={() => void handleSignOut()}
          className="bg-bg-surface shrink-0 rounded-sm"
        >
          <LogOut aria-hidden="true" className="size-4" />
          ログアウト
        </Button>
      </div>
    );
  }

  return (
    <div className="border-border-default bg-bg-surface rounded-lg border p-5 shadow-xs">
      <h2 className="text-fg-default text-lg font-bold">アカウント登録して設定を引き継ぐ</h2>
      <p className="text-fg-secondary mt-1.5 text-sm leading-relaxed">
        あとで読むやお気に入り、フィード画面の表示設定がすべての端末で同期されます。
      </p>
      <div className="mt-4">
        <SocialSignInButtons callbackURL="/settings" />
      </div>
      <p className="text-fg-secondary mt-3 text-center text-sm">
        登録済みの方は
        <Link
          href="/login?callbackURL=%2Fsettings"
          className="text-accent font-medium hover:underline"
        >
          ログイン
        </Link>
      </p>
    </div>
  );
}
