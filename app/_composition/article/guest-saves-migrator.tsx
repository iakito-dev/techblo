'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useSession } from '@/features/auth/client';
import { migrateGuestBookmarks } from '@/features/bookmarks/web/actions';
import { migrateGuestFavorites } from '@/features/favorites/web/actions';
import { migrateGuestReads } from '@/features/reads/web/actions';
import { migrateGuestSubscriptions } from '@/features/subscriptions/web/actions';
import {
  clearGuestUnsubscribed,
  readGuestUnsubscribed,
} from '@/features/subscriptions/web/use-guest-subscriptions';
import { getSavedArticles } from './saved-articles-actions';
import { clearGuestSaves, readGuestSaves } from './use-guest-saves';

/**
 * ログイン(未ログイン→ログイン遷移)を検知し、localStorage のゲスト保存を DB へマージする(ADR-0017)。
 * 描画はしない副作用コンポーネント。app/layout.tsx の <body> に常設して全ページで監視する。
 *
 * - 実在フィルタ: ローカル ID を getSavedArticles に通し、実在(削除されていない)記事の ID だけ移行する(FK 安全)。
 * - 冪等: addMany は onConflictDoNothing。移行後 localStorage をクリアするので再実行は no-op。
 * - 二重実行防止: ran(ref)で同一マウントの二重 effect(StrictMode)を弾く。ログアウトで ran をリセットし、
 *   ログアウト→再ゲスト保存→再ログインでも移行できるようにする。
 */
export function GuestSavesMigrator() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      ran.current = false; // ログアウト後の再ログインで再度移行できるよう戻す
      return;
    }
    if (ran.current) return;

    const bookmarkIds = readGuestSaves('bookmark');
    const favoriteIds = readGuestSaves('favorite');
    const readIds = readGuestSaves('read');
    const unsubscribed = readGuestUnsubscribed();
    if (
      bookmarkIds.length === 0 &&
      favoriteIds.length === 0 &&
      readIds.length === 0 &&
      unsubscribed.length === 0
    )
      return;

    ran.current = true;

    (async () => {
      try {
        // 実在記事の ID だけに絞ってから移行(削除済み ID による FK 違反を防ぐ)
        const [bookmarks, favorites, reads] = await Promise.all([
          bookmarkIds.length ? getSavedArticles(bookmarkIds) : Promise.resolve([]),
          favoriteIds.length ? getSavedArticles(favoriteIds) : Promise.resolve([]),
          readIds.length ? getSavedArticles(readIds) : Promise.resolve([]),
        ]);
        await Promise.all([
          migrateGuestBookmarks(bookmarks.map((a) => a.id)),
          migrateGuestFavorites(favorites.map((a) => a.id)),
          migrateGuestReads(reads.map((a) => a.id)),
          migrateGuestSubscriptions(unsubscribed),
        ]);
        clearGuestSaves();
        clearGuestUnsubscribed();
        router.refresh(); // 一覧/フィードの RSC を DB 由来の状態で引き直す
      } catch {
        ran.current = false; // 失敗時は次回の遷移で再試行
      }
    })();
  }, [session, isPending, router]);

  return null;
}
