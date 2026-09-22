import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GuestSavedArticles } from '@/components/article/guest-saved-articles';
import { SavedArticlesSkeleton } from '@/components/article/saved-articles-skeleton';
import { SavedArticlesView } from '@/components/article/saved-articles-view';
import { getSummariesByArticleIds } from '@/features/ai-summary/web/queries';
import { getSession } from '@/features/auth/server';
import { getBookmarkedArticleIds } from '@/features/bookmarks/web/queries';
import { getFavoritedArticleIds } from '@/features/favorites/web/queries';
import { getArticlesByIds } from '@/features/feed/web/queries';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';
import { asUserId } from '@/shared/type-utils';

export const metadata: Metadata = {
  title: 'あとで読む',
  robots: { index: false, follow: false },
};

/**
 * ブックマーク一覧。後で読む用に保存した記事(追加順)。
 * ログイン時は DB から、ゲストは localStorage から表示する(ADR-0017)。
 * shell(Header/Sidebar/MobileNav)は (app)/layout.tsx が保持する。
 * 見出しはレイアウト一致 skeleton で即表示し、データ取得は Suspense 境界内に閉じる。
 */
export default function BookmarksPage() {
  return (
    <div className="min-h-dvh pb-24 lg:pt-6 lg:pb-12 lg:pl-64">
      <div className={`mx-auto max-w-[1200px] ${MOBILE_GUTTER_CLASS} md:px-6`}>
        <Suspense fallback={<SavedArticlesSkeleton kind="bookmark" />}>
          <BookmarksContent />
        </Suspense>
      </div>
    </div>
  );
}

async function BookmarksContent() {
  const session = await getSession();
  if (!session) {
    return <GuestSavedArticles kind="bookmark" />;
  }
  const userId = asUserId(session.user.id);

  const [bookmarkedIds, favoritedIds] = await Promise.all([
    getBookmarkedArticleIds(userId),
    getFavoritedArticleIds(userId),
  ]);
  const articles = await getArticlesByIds(bookmarkedIds);
  const summaries = await getSummariesByArticleIds(articles.map((a) => a.id));

  return (
    <SavedArticlesView
      kind="bookmark"
      articles={articles}
      bookmarkedIds={bookmarkedIds}
      favoritedIds={favoritedIds}
      summaries={summaries}
    />
  );
}
