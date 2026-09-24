'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFeedNav } from './feed-nav-context';
import { parseListParam } from './parse-list-param';

/**
 * 企業フィルタの複数選択(?company=a,b,c)の ViewModel。
 * useFeedCompany(単一・デスクトップ用)の複数選択版。状態は URL に持たせ RSC が読んで再取得する。
 * カンマ区切りで複数 slug を保持し、空なら ?company を削除。企業を変えると対象集合が変わるので
 * page はリセット(FeedList が URL 変化を検知して page=1 同期。ADR-0016)。
 * 切替は共有 FeedNav 遷移でノンブロッキング、isPending は本文 dim と共有。
 */
export function useFeedCompanies(): {
  /** 選択中の企業 slug 群(URL 由来)。未選択は空配列。 */
  companies: string[];
  /** 1社の選択をトグルする(チップの × やリストのタップ)。 */
  toggleCompany: (slug: string) => void;
  /** 選択集合をまとめて差し替える(ボトムシートの「記事を表示」)。 */
  setCompanies: (slugs: string[]) => void;
  /** 切替先 URL を温める。 */
  prefetchCompanies: (slugs: string[]) => void;
  isPending: boolean;
} {
  const params = useSearchParams();
  const { isPending, navigate, prefetch } = useFeedNav();
  const urlValue = params.get('company') ?? '';
  const companies = useMemo(() => parseListParam(urlValue), [urlValue]);
  const [optimistic, setOptimistic] = useState<string[]>(companies);

  useEffect(() => {
    setOptimistic(companies);
  }, [companies]);

  const hrefFor = useCallback(
    (slugs: string[]) => {
      const sp = new URLSearchParams(params);
      const clean = slugs.map((s) => s.trim()).filter(Boolean);
      if (clean.length === 0) sp.delete('company');
      else sp.set('company', clean.join(','));
      sp.delete('page');
      const qs = sp.toString();
      return qs ? `/?${qs}` : '/';
    },
    [params],
  );

  const setCompanies = useCallback(
    (slugs: string[]) => {
      setOptimistic(slugs);
      navigate(hrefFor(slugs));
    },
    [hrefFor, navigate],
  );

  const toggleCompany = useCallback(
    (slug: string) => {
      const next = optimistic.includes(slug)
        ? optimistic.filter((s) => s !== slug)
        : [...optimistic, slug];
      setCompanies(next);
    },
    [optimistic, setCompanies],
  );

  const prefetchCompanies = useCallback(
    (slugs: string[]) => prefetch(hrefFor(slugs)),
    [hrefFor, prefetch],
  );

  return { companies: optimistic, toggleCompany, setCompanies, prefetchCompanies, isPending };
}
