import { getSession } from '@/features/auth/server';
import { getBookmarkedArticleIds } from '@/features/bookmarks/web/queries';
import { getFavoritedArticleIds } from '@/features/favorites/web/queries';
import { asUserId } from '@/shared/type-utils';
import { ArticleActions } from './article-actions';

/**
 * 記事ページ(/a/[id])の保存系アクション。feature 境界を越える合成を app/components 層で行う
 * (ADR-0013。一覧は feed-load-more.tsx が同じ合成をまとめて行う)。
 *
 * session を読むのでこのコンポーネントだけが動的になる。ページ本体(記事本文・AI要約)は
 * ユーザーに依存せずキャッシュ可能なままにしたいので、呼び出し側は必ず Suspense 境界に
 * 包んでここだけをストリームさせる(本文の表示を保存状態の取得で待たせない)。
 */
export async function ArticleDetailActions({ articleId }: { articleId: string }) {
  const session = await getSession();
  if (!session) {
    return (
      <ArticleActions
        articleId={articleId}
        initialBookmarked={false}
        initialFavorited={false}
        isGuest
      />
    );
  }

  const userId = asUserId(session.user.id);
  const [bookmarkedIds, favoritedIds] = await Promise.all([
    getBookmarkedArticleIds(userId),
    getFavoritedArticleIds(userId),
  ]);

  return (
    <ArticleActions
      articleId={articleId}
      initialBookmarked={bookmarkedIds.includes(articleId)}
      initialFavorited={favoritedIds.includes(articleId)}
    />
  );
}
