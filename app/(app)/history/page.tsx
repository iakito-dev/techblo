import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GuestReadingHistory } from '@/components/article/guest-reading-history';
import { ReadingHistoryView } from '@/components/article/reading-history-view';
import { SavedArticlesSkeleton } from '@/components/article/saved-articles-skeleton';
import { getSummariesByArticleIds } from '@/features/ai-summary/web/queries';
import { getSession } from '@/features/auth/server';
import { getBookmarkedArticleIds } from '@/features/bookmarks/web/queries';
import { getFavoritedArticleIds } from '@/features/favorites/web/queries';
import { getArticlesByIds } from '@/features/feed/web/queries';
import { getRecentReads } from '@/features/reads/web/queries';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';
import { asUserId } from '@/shared/type-utils';

export const metadata: Metadata = {
  title: '閲覧履歴',
  robots: { index: false, follow: false },
};

/**
 * 閲覧履歴。最近読んだ記事を新しい順に、日付ごとに表示する(ADR-0041)。
 * ログイン時は DB の reads(readAt)から、ゲストは localStorage の既読 ID から表示する(ADR-0017)。
 * 外枠と skeleton は保存一覧(/bookmarks)と揃える。
 */
export default function HistoryPage() {
  return (
    <div className="min-h-dvh pb-24 lg:pt-6 lg:pb-12 lg:pl-64">
      <div className={`mx-auto max-w-[1200px] ${MOBILE_GUTTER_CLASS} md:px-6`}>
        <Suspense fallback={<SavedArticlesSkeleton kind="history" />}>
          <HistoryContent />
        </Suspense>
      </div>
    </div>
  );
}

async function HistoryContent() {
  const session = await getSession();
  if (!session) {
    return <GuestReadingHistory />;
  }
  const userId = asUserId(session.user.id);

  const [reads, bookmarkedIds, favoritedIds] = await Promise.all([
    getRecentReads(userId),
    getBookmarkedArticleIds(userId),
    getFavoritedArticleIds(userId),
  ]);
  // getArticlesByIds は入力順を保ち、削除済み記事を落とす
  const articles = await getArticlesByIds(reads.map((r) => r.articleId));
  const summaries = await getSummariesByArticleIds(articles.map((a) => a.id));
  const readAtById = Object.fromEntries(reads.map((r) => [r.articleId, r.readAt]));

  return (
    <ReadingHistoryView
      articles={articles}
      readAtById={readAtById}
      bookmarkedIds={bookmarkedIds}
      favoritedIds={favoritedIds}
      summaries={summaries}
    />
  );
}
