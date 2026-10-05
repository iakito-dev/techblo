'use client';

import { useEffect, useRef } from 'react';
import { shouldTriggerAutoLoad } from './feed-infinite-scroll';

/**
 * 一覧末尾の「もっと読む」ボタン + スクロール追従の自動読み込み(IntersectionObserver)。
 * 企業ページ(CompanyArticleGrid)用。挙動・見た目はフィード(FeedList)の末尾と揃えている。
 * 二重発火の抑止は呼び出し側の onLoadMore(loadingRef ガード)も担うので、ここは pending 中を弾くだけ。
 */
export function LoadMoreTrigger({
  onLoadMore,
  isPending,
}: {
  onLoadMore: () => void;
  isPending: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          shouldTriggerAutoLoad({
            hasMore: true,
            isIntersecting: entry?.isIntersecting ?? false,
            isPending,
          })
        ) {
          onLoadMore();
        }
      },
      { rootMargin: '480px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isPending, onLoadMore]);

  return (
    <div ref={sentinelRef} className="mt-10 flex justify-center pb-2">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={isPending}
        className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-sm border border-border-default bg-bg-surface px-6 py-2.5 font-medium text-fg-default text-sm transition-colors hover:bg-bg-surface-2 hover:text-fg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app disabled:opacity-60"
      >
        {isPending ? '読み込み中…' : 'もっと読む'}
      </button>
    </div>
  );
}
