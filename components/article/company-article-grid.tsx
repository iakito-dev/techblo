'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { FEED_GAP_CLASS } from '@/features/feed/web/feed-grid-classes';
import { loadMoreCompanyArticles } from './company-articles-actions';
import { FeedRow } from './feed-list';
import type { ComposedArticle } from './feed-load-more';
import { LoadMoreTrigger } from './load-more-trigger';

/**
 * 企業ページ(/companies/[slug])の記事グリッド。
 * 初期 items は RSC(getCompanyArticles)が合成して渡すため SSR / SEO 済み。
 * 続きは loadMoreCompanyArticles が表示データを返し、FeedList と同じ流儀で末尾に追記する。
 * フィルタ・並び替えが無いので、FeedList のキー同期(派生 state リセット)は不要。
 */
export function CompanyArticleGrid({
  slug,
  items: initialItems,
  initialHasMore,
  isGuest,
}: {
  slug: string;
  items: ComposedArticle[];
  initialHasMore: boolean;
  isGuest: boolean;
}) {
  const [items, setItems] = useState<ComposedArticle[]>(initialItems);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
  const loadingRef = useRef(false);

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    startTransition(async () => {
      try {
        const next = page + 1;
        const { items: more, hasMore: stillMore } = await loadMoreCompanyArticles({
          slug,
          page: next,
        });
        setItems((prev) => {
          // オフセットページングは取得間の新着流入で前ページと重複しうるため、ID で除外して追記する
          const seen = new Set(prev.map((item) => item.article.id));
          return [...prev, ...more.filter((item) => !seen.has(item.article.id))];
        });
        setPage(next);
        setHasMore(stillMore);
      } finally {
        loadingRef.current = false;
      }
    });
  }, [hasMore, page, slug]);

  return (
    <>
      <div className={`feed-grid ${FEED_GAP_CLASS}`}>
        {items.map((item) => (
          <FeedRow key={item.article.id} item={item} isGuest={isGuest} />
        ))}
      </div>
      {hasMore && <LoadMoreTrigger onLoadMore={loadMore} isPending={isPending} />}
    </>
  );
}
