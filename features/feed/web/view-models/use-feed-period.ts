'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { type FeedSort, type PopularPeriod, parsePeriod } from '../../domain/feed-sort';
import { useFeedNav } from './feed-nav-context';

/** 期間と同時にソートも切り替えるオプション(新着順中に期間を選んだら人気順へ、を1回の遷移で行う)。 */
type SetPeriodOptions = { sort?: FeedSort };

/**
 * 人気順の集計期間(?period=)の ViewModel。
 * useFeedSort と同じく状態は URL に持たせ、RSC が読んで再取得する。
 * all は既定値なので URL から消す。期間を変えると並びが変わるので page は 1 に戻す。
 * 切替は startTransition でノンブロッキングに行い、遷移中も現在のフィードを保つ。
 * prefetchPeriod はホバー/フォーカス時に切替先の RSC を温め、クリック時の往復を短くする。
 */
export function useFeedPeriod(): {
  period: PopularPeriod;
  setPeriod: (next: PopularPeriod, options?: SetPeriodOptions) => void;
  prefetchPeriod: (next: PopularPeriod, options?: SetPeriodOptions) => void;
  isPending: boolean;
} {
  const params = useSearchParams();
  const { isPending, navigate, prefetch } = useFeedNav();
  const urlPeriod = parsePeriod(params.get('period') ?? undefined);
  const [period, setOptimisticPeriod] = useState(urlPeriod);

  useEffect(() => {
    setOptimisticPeriod(urlPeriod);
  }, [urlPeriod]);

  const hrefFor = useCallback(
    (next: PopularPeriod, options?: SetPeriodOptions) => {
      const sp = new URLSearchParams(params);
      if (next === 'all') sp.delete('period');
      else sp.set('period', next);
      // ソート同時切替。setPeriod → setSort の2連続遷移は後勝ちの競合で
      // 片方のパラメータが落ちるため、必ず1つの URL 更新にまとめる。
      if (options?.sort) {
        if (options.sort === 'latest') sp.delete('sort');
        else sp.set('sort', options.sort);
      }
      sp.delete('page');
      const qs = sp.toString();
      return qs ? `/?${qs}` : '/';
    },
    [params],
  );

  const setPeriod = useCallback(
    (next: PopularPeriod, options?: SetPeriodOptions) => {
      if (next === period && !options?.sort) return;
      setOptimisticPeriod(next);
      navigate(hrefFor(next, options));
    },
    [navigate, hrefFor, period],
  );

  const prefetchPeriod = useCallback(
    (next: PopularPeriod, options?: SetPeriodOptions) => prefetch(hrefFor(next, options)),
    [prefetch, hrefFor],
  );

  return { period, setPeriod, prefetchPeriod, isPending };
}
