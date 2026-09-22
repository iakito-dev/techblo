'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { parseReadMode, type ReadFilterMode } from '../../domain/feed-sort';
import { useFeedNav } from './feed-nav-context';

/**
 * 未読/既読フィルタ(?read=unread|read)の ViewModel。
 * useFeedSort と同型: 状態は URL に持たせ RSC が読んで再取得。all は既定なので URL から消す。
 * フィルタを変えると対象集合が変わるので page はリセット(FeedList が URL 変化を検知し page=1 同期。ADR-0016)。
 * 切替は共有 FeedNav 遷移でノンブロッキング、isPending は本文 dim と共有。
 */
export function useFeedRead(): {
  read: ReadFilterMode;
  setRead: (next: ReadFilterMode) => void;
  prefetchRead: (next: ReadFilterMode) => void;
  isPending: boolean;
} {
  const params = useSearchParams();
  const { isPending, navigate, prefetch } = useFeedNav();
  const urlRead = parseReadMode(params.get('read') ?? undefined);
  const [read, setOptimisticRead] = useState(urlRead);

  useEffect(() => {
    setOptimisticRead(urlRead);
  }, [urlRead]);

  const hrefFor = useCallback(
    (next: ReadFilterMode) => {
      const sp = new URLSearchParams(params);
      if (next === 'all') sp.delete('read');
      else sp.set('read', next);
      sp.delete('page');
      const qs = sp.toString();
      return qs ? `/?${qs}` : '/';
    },
    [params],
  );

  const setRead = useCallback(
    (next: ReadFilterMode) => {
      if (next === read) return;
      setOptimisticRead(next);
      navigate(hrefFor(next));
    },
    [navigate, hrefFor, read],
  );

  const prefetchRead = useCallback(
    (next: ReadFilterMode) => prefetch(hrefFor(next)),
    [prefetch, hrefFor],
  );

  return { read, setRead, prefetchRead, isPending };
}
