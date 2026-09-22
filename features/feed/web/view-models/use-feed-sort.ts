'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { type FeedSort, parseFeedSort } from '../../domain/feed-sort';
import { useFeedNav } from './feed-nav-context';

/**
 * ソート選択状態の ViewModel。
 * 状態は URL(?sort=)に持たせ、RSC がそれを読んで再取得する
 * (フロントは fetch も SQL も持たず、表示状態の管理に徹する)。
 * 切替は共有の FeedNav 遷移(navigate)でノンブロッキングに行う。遷移中も現在のフィードを表示
 * したままにでき(Suspense フォールバックのチラつきを防ぐ)、isPending は本文の dim と共有する。
 * prefetchSort はホバー/フォーカス時に切替先の RSC を温め、クリック時の往復を短くする。
 */
export function useFeedSort(): {
  sort: FeedSort;
  setSort: (next: FeedSort) => void;
  prefetchSort: (next: FeedSort) => void;
  isPending: boolean;
} {
  const params = useSearchParams();
  const { isPending, navigate, prefetch } = useFeedNav();
  const urlSort = parseFeedSort(params.get('sort') ?? undefined);
  const [sort, setOptimisticSort] = useState(urlSort);

  useEffect(() => {
    setOptimisticSort(urlSort);
  }, [urlSort]);

  const hrefFor = useCallback(
    (next: FeedSort) => {
      const sp = new URLSearchParams(params);
      // latest は既定値なので URL から消してきれいに保つ
      if (next === 'latest') sp.delete('sort');
      else sp.set('sort', next);
      // ソートが変わると並び順が変わるので、ページ番号は 1 に戻す
      sp.delete('page');
      // 集計期間(?period)は保持する。新着⇄人気を往復しても直前の期間で復元される
      // (人気順チップに期間を常時表示する UI の前提。0 件時は FeedPeriodEmptyState が全期間への導線を出す)。
      const qs = sp.toString();
      return qs ? `/?${qs}` : '/';
    },
    [params],
  );

  const setSort = useCallback(
    (next: FeedSort) => {
      if (next === sort) return;
      setOptimisticSort(next);
      navigate(hrefFor(next));
    },
    [navigate, hrefFor, sort],
  );

  const prefetchSort = useCallback(
    (next: FeedSort) => prefetch(hrefFor(next)),
    [prefetch, hrefFor],
  );

  return { sort, setSort, prefetchSort, isPending };
}
