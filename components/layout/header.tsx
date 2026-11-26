'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from '@/features/auth/client';
import { UserMenu } from '@/features/auth/components/user-menu';
import { ArticleBackLink } from '@/features/feed/web/components/article-back-link';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';
import { Logo } from './logo';

/**
 * モバイル(<lg)の上部バー(ロゴ + アカウント)。
 * ナビは下部の MobileNav、デスクトップ(lg+)は AppSidebar が担う。
 * 認証状態はクライアントの useSession() で取得し、ログイン誘導 / アバターを出し分ける。
 * 詳細仕様: docs/features/auth.md
 */
export function Header() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ヘッダーに検索アイコンは置かない。フィードの検索欄は <md が MobileFeedControls、md〜lg が
  // ツールバー(FeedControls)に常にあり、以前ここにあった検索アイコンはフィードの md〜lg でしか
  // 見えず、すぐ下の検索欄と同じ操作が 2 つ並んでいた。
  const isFeed = pathname === '/';
  // 記事ページ(/a/[id])はロゴの代わりに「戻る」を置く。本文側の戻るはスクロールで画面外へ
  // 消えるため、関連記事まで読み進めた後に一覧へ戻る手段が端のスワイプだけになっていた。
  // ヘッダーは sticky なので、ここに置けばどこまで読んでも親指を伸ばさず戻れる。
  const isDetail = pathname.startsWith('/a/');

  // フィードの <md は専用ヘッダー(MobileFeedControls: 検索行 + チップ行)がロゴバーを
  // 置き換えるため、ここでは出さない(md〜lg のタブレットでは従来どおり表示する)。
  return (
    <header
      className={`border-border-default bg-bg-surface/80 sticky top-0 z-20 mb-8 border-b pt-[env(safe-area-inset-top)] backdrop-blur-xl backdrop-saturate-150 lg:hidden ${
        isFeed ? 'max-md:hidden' : ''
      }`}
    >
      <div
        className={`mx-auto flex h-16 max-w-[1200px] items-center ${MOBILE_GUTTER_CLASS} md:px-6`}
      >
        {isDetail ? <ArticleBackLink /> : <Logo />}
        <div className="ml-auto flex items-center gap-1">
          {/* ログイン導線は設定タブの登録カードへ集約した。ここではゲストに何も出さない
              (ログイン済みのアバターのみ。docs/features/auth.md)。 */}
          {!mounted || isPending ? (
            <span className="bg-bg-surface-2 size-9 animate-pulse rounded-full" />
          ) : session ? (
            <UserMenu
              name={session.user.name}
              email={session.user.email}
              image={session.user.image ?? null}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
