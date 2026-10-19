'use client';

import { memo, useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { FeedSort, PopularPeriod, ReadFilterMode } from '@/features/feed/domain/feed-sort';
import { ArticleCard } from '@/features/feed/web/components/article-card';
import {
  FEED_COLUMNS_CLASS,
  FEED_FIRST_RULE_CLASS,
  FEED_GAP_CLASS,
} from '@/features/feed/web/feed-grid-classes';
import { useFeedNav } from '@/features/feed/web/view-models/feed-nav-context';
import { ArticleActions } from './article-actions';
import { loadMoreFeed } from './feed-actions';
import { shouldTriggerAutoLoad } from './feed-infinite-scroll';
import type { ComposedArticle } from './feed-load-more';
import { useGuestSaves } from './use-guest-saves';

/**
 * カード1件 + 保存系アクションの行。memo 化し、親の再レンダリング
 * (「もっと読む」/ 自動読み込みでの items 追記など)で props 同値の既存行を再描画しない。
 * loadMore は setItems([...prev, ...more]) で既存要素の参照を保つため、
 * 追記時に再描画されるのは新規行だけになる。
 */
/** セクション型フィード(feed-sections-view.tsx)でも同じカード合成を再利用するため export する。 */
export const FeedRow = memo(function FeedRow({
  item,
  isGuest,
  sort,
}: {
  item: ComposedArticle;
  isGuest: boolean;
  sort?: FeedSort;
}) {
  const { article, bookmarked, favorited, summary } = item;
  return (
    <ArticleCard
      article={article}
      overview={summary?.overview ?? null}
      tags={summary?.tags ?? []}
      showHatenaCount={sort === 'popular'}
      actions={
        <ArticleActions
          articleId={article.id}
          initialBookmarked={bookmarked}
          initialFavorited={favorited}
          isGuest={isGuest}
        />
      }
    />
  );
});

/**
 * フィードのカードをスクロール追従の自動読み込み(+「もっと読む」フォールバック)で
 * 追記していくクライアント側のリスト(ADR-0013 追補)。
 * 初期ページは RSC が合成して initialItems で渡す(SSR / SEO 済み)。
 * 続きは loadMoreFeed Server Action が表示データを返し、末尾に追記する。
 * 保存系アクションは ArticleActions に集約し、isGuest で「ログイン=DB / ゲスト=localStorage」を内部分岐する(ADR-0017)。
 *
 * sort/period/company が変わると親(RSC)が page=1 の initialItems を渡し直す。
 * 以前は key で再マウントしていたが、全カードの DOM 破棄→再生成が切替のカクつきの主因だった。
 * 代わりに「派生 state リセット」パターンで内部 state だけ同期し、DOM は保ったまま中身を差し替える(ADR-0016)。
 */
export function FeedList({
  initialItems,
  initialHasMore,
  isGuest,
  sort,
  period,
  companySlugs,
  feedIds,
  readMode = 'all',
  query,
  tag,
  category,
}: {
  initialItems: ComposedArticle[];
  initialHasMore: boolean;
  isGuest: boolean;
  sort: FeedSort;
  period: PopularPeriod;
  companySlugs?: string[];
  feedIds?: string[];
  readMode?: ReadFilterMode;
  query?: string;
  tag?: string;
  category?: string;
}) {
  const [items, setItems] = useState<ComposedArticle[]>(initialItems);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
  // フィルタ/並び替えの遷移 pending(ツールバーと共有)。loadMore の isPending とは別物。
  // 切替中は本文を dim して、新ページ到着までの「前の内容のまま」を「読み込み中」と分かるようにする。
  const { isPending: navPending } = useFeedNav();
  // ゲストの既読フィルタはサーバーで絞れない(localStorage)ため、ここでクライアント側 hide する(ADR-0021)。
  // ログイン時はサーバー(getReadFilteredFeed)が絞り済みなので素通し。
  const guestReads = useGuestSaves('read');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  // sort/period/company/read が変わったら page=1 の結果へ同期する。
  // render 中に直接 setState すると、古いリストを一瞬も描画せずに差し替わる
  // (useEffect は描画後に走るため一瞬古い内容が見える。これはその回避策で React 公式の推奨)。
  const companyKey = companySlugs && companySlugs.length > 0 ? companySlugs.join(',') : 'all';
  const feedFilterKey = feedIds && feedIds.length > 0 ? feedIds.join(',') : 'all';
  const feedKey = `${sort}-${period}-${companyKey}-${feedFilterKey}-${readMode}-${query ?? ''}-${tag ?? ''}-${category ?? ''}`;
  // 進行中の loadMore が「どの条件のリストへの追記か」を判定するための最新キー
  const feedKeyRef = useRef(feedKey);
  const [prevKey, setPrevKey] = useState(feedKey);
  if (feedKey !== prevKey) {
    setPrevKey(feedKey);
    setItems(initialItems);
    setPage(1);
    setHasMore(initialHasMore);
    loadingRef.current = false; // 進行中フラグも戻し、切替後の自動読み込みが止まらないようにする
    feedKeyRef.current = feedKey;
  }

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    const requestKey = `${sort}-${period}-${companyKey}-${feedFilterKey}-${readMode}-${query ?? ''}-${tag ?? ''}-${category ?? ''}`;
    startTransition(async () => {
      try {
        const next = page + 1;
        const { items: more, hasMore: stillMore } = await loadMoreFeed({
          sort,
          period,
          page: next,
          companySlugs,
          feedIds,
          readMode,
          query,
          tag,
          category,
        });
        // 応答待ちの間にソート/期間/企業が切り替わっていたら、古い条件のページは破棄する
        // (混入すると並びが壊れ、key 重複でクラッシュもする)
        if (feedKeyRef.current !== requestKey) return;
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
  }, [
    companyKey,
    companySlugs,
    feedFilterKey,
    feedIds,
    hasMore,
    page,
    period,
    sort,
    readMode,
    query,
    tag,
    category,
  ]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          shouldTriggerAutoLoad({
            hasMore,
            isIntersecting: entry?.isIntersecting ?? false,
            isPending: isPending || loadingRef.current,
          })
        ) {
          loadMore();
        }
      },
      { rootMargin: '480px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isPending, loadMore]);

  // ゲスト × 既読フィルタのときだけクライアント側で hide(ログインはサーバーで絞り済み)。
  // guestReads.ready 前は素通し(localStorage 未読込で全件未読扱い)。
  const visibleItems =
    isGuest && readMode !== 'all' && guestReads.ready
      ? items.filter((item) =>
          readMode === 'read' ? guestReads.has(item.article.id) : !guestReads.has(item.article.id),
        )
      : items;

  return (
    <>
      {/*
        トップ(/)の棚(feed-section.tsx)と列構成を揃える(md+ でコンテナクエリ 1〜4列。
        ADR-0035。祖先の @container は page.tsx の本文ラッパーが持つ)。企業ページ等の
        CompanyArticleGrid / 保存記事一覧は共通の feed-grid ユーティリティ(auto-fill)のままにし、
        影響をこのコンポーネント(/ 専用)に閉じる。
      */}
      <div
        aria-busy={navPending}
        className={`grid grid-cols-1 ${FEED_GAP_CLASS} ${FEED_COLUMNS_CLASS} ${FEED_FIRST_RULE_CLASS} transition-opacity duration-200 ${
          navPending ? 'opacity-50' : ''
        }`}
      >
        {visibleItems.map((item) => (
          <FeedRow key={item.article.id} item={item} isGuest={isGuest} sort={sort} />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="mt-10 flex justify-center pb-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-sm border border-border-default bg-bg-surface px-6 py-2.5 font-medium text-fg-default text-sm transition-colors hover:bg-bg-surface-2 hover:text-fg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app disabled:opacity-60"
          >
            {isPending ? '読み込み中…' : 'もっと読む'}
          </button>
        </div>
      )}
    </>
  );
}
