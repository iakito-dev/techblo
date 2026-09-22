'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useFeedNav } from './feed-nav-context';

/**
 * 企業フィルタ(?company=slug)の ViewModel。
 * useFeedSort / useFeedPeriod と同じく状態は URL に持たせ、RSC が読んで再取得する。
 * 「すべて」は既定なので URL から消す。企業を変えると対象集合が変わるので page 相当はリセット
 * (FeedList が URL 由来の company 変化を検知して page=1 から取り直す。ADR-0016)。
 */
export function useFeedCompany(): {
  company: string | null;
  setCompany: (slug: string | null) => void;
  prefetchCompany: (slug: string | null) => void;
  isPending: boolean;
} {
  const params = useSearchParams();
  const { isPending, navigate, prefetch } = useFeedNav();
  const urlCompany = params.get('company');
  const [company, setOptimisticCompany] = useState<string | null>(urlCompany);

  useEffect(() => {
    setOptimisticCompany(urlCompany);
  }, [urlCompany]);

  const hrefFor = useCallback(
    (slug: string | null) => {
      const sp = new URLSearchParams(params);
      if (!slug) sp.delete('company');
      else sp.set('company', slug);
      const qs = sp.toString();
      return qs ? `/?${qs}` : '/';
    },
    [params],
  );

  const setCompany = useCallback(
    (slug: string | null) => {
      if (slug === company) return;
      setOptimisticCompany(slug);
      navigate(hrefFor(slug));
    },
    [company, hrefFor, navigate],
  );

  const prefetchCompany = useCallback(
    (slug: string | null) => prefetch(hrefFor(slug)),
    [hrefFor, prefetch],
  );

  return { company, setCompany, prefetchCompany, isPending };
}
