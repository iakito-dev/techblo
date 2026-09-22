import {
  FEED_COLUMNS_CLASS,
  FEED_GAP_CLASS,
  feedCutoffClass,
} from '@/features/feed/web/feed-grid-classes';
import { ArticleCardSkeleton } from './feed-grid';

/**
 * セクション型フィード(新着 + 棚)のローディング skeleton。page.tsx の Suspense fallback で使う。
 * 実際の描画(feed-section.tsx)と同じく、列数はコンテナクエリ(FEED_COLUMNS_CLASS)で実幅に応じて
 * 1〜4列に可変にし、最大件数(新着12件・棚4件)ぶんのプレースホルダを描画して実列数に満たない
 * 分は cutoff(feedCutoffClass)で隠す(ADR-0035)。祖先の `@container` は
 * page.tsx の本文ラッパーが持つ。
 * 先頭を新着(3行ぶん)、以降2つを棚(1行ぶん)の形にして、解決後の実カードとの高さ差を抑える。
 */
export function FeedSectionsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <FeedSectionSkeletonRow count={12} cutoff="latest" />
      <FeedSectionSkeletonRow count={4} cutoff="shelf" />
      <FeedSectionSkeletonRow count={4} cutoff="shelf" />
    </div>
  );
}

function FeedSectionSkeletonRow({ count, cutoff }: { count: number; cutoff: 'latest' | 'shelf' }) {
  const cutoffClass = feedCutoffClass(cutoff);
  return (
    <div className="py-8 first:pt-0 md:py-10">
      <div className="mb-6 h-7 w-40 animate-pulse rounded bg-bg-surface-3" />
      <div className={`grid grid-cols-1 ${FEED_GAP_CLASS} ${FEED_COLUMNS_CLASS} ${cutoffClass}`}>
        {Array.from({ length: count }, (_, i) => i).map((i) => (
          <ArticleCardSkeleton key={i} withExcerpt={false} />
        ))}
      </div>
    </div>
  );
}
