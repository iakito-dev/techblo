'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import {
  type PopularPeriod,
  parsePeriod,
  parseReadMode,
  type ReadFilterMode,
} from '../../domain/feed-sort';
import { useFeedNav } from './feed-nav-context';

/**
 * フィルタ(ステータス / 期間 / 企業)の単一の真実の源(ViewModel)。
 * 状態は URL に持たせる(?read / ?period / ?company)。モバイルのヘッダーバッジ・適用中チップ・
 * 件数表示・絞り込みシートは、すべてこの 1 つの導出から組み立てる(UI ごとに独自 state を持たない)。
 *
 * 並び替え(sort)はフィルタとは性質が違うので含めない(useFeedSort が別に管理)。
 * 期間は公開日ウィンドウのフィルタで、sort とは直交する(Phase 0 でサーバー側を分離済み)。
 */
export type FeedFilters = {
  status: ReadFilterMode;
  period: PopularPeriod;
  companies: string[];
  /** マイフィード(?feed=id,id)。企業と並ぶフィルタ源。 */
  userFeeds: string[];
};

export function useFeedFilters(): FeedFilters & {
  /** 適用中の条件数(バッジ用): status≠all で+1、period≠all で+1、企業 + マイフィードは選択数。 */
  activeCount: number;
  isPending: boolean;
  setStatus: (status: ReadFilterMode) => void;
  setPeriod: (period: PopularPeriod) => void;
  toggleCompany: (slug: string) => void;
  removeCompany: (slug: string) => void;
  toggleUserFeed: (id: string) => void;
  removeUserFeed: (id: string) => void;
  /** すべてのフィルタを既定(all / all / 空 / 空)に戻す(sort は変えない)。 */
  clearAll: () => void;
} {
  const params = useSearchParams();
  const { navigate, isPending } = useFeedNav();

  const status = parseReadMode(params.get('read') ?? undefined);
  const period = parsePeriod(params.get('period') ?? undefined);
  const parseList = (raw: string | null) =>
    raw
      ? raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const companies = useMemo(() => parseList(params.get('company')), [params]);
  const userFeeds = useMemo(() => parseList(params.get('feed')), [params]);

  const activeCount =
    (status !== 'all' ? 1 : 0) + (period !== 'all' ? 1 : 0) + companies.length + userFeeds.length;

  // 複数キーを 1 回の URL 更新で差し替える(setX の連続呼び出しによる後勝ち競合を避ける)。
  // フィルタを変えると対象集合が変わるので page は常にリセットする(FeedList が URL 変化を検知。ADR-0016)。
  const apply = useCallback(
    (next: Partial<FeedFilters>) => {
      const s = next.status ?? status;
      const p = next.period ?? period;
      const c = next.companies ?? companies;
      const f = next.userFeeds ?? userFeeds;
      const sp = new URLSearchParams(params);
      if (s === 'all') sp.delete('read');
      else sp.set('read', s);
      if (p === 'all') sp.delete('period');
      else sp.set('period', p);
      if (c.length === 0) sp.delete('company');
      else sp.set('company', c.join(','));
      if (f.length === 0) sp.delete('feed');
      else sp.set('feed', f.join(','));
      sp.delete('page');
      const qs = sp.toString();
      navigate(qs ? `/?${qs}` : '/');
    },
    [params, status, period, companies, userFeeds, navigate],
  );

  const setStatus = useCallback((s: ReadFilterMode) => apply({ status: s }), [apply]);
  const setPeriod = useCallback((p: PopularPeriod) => apply({ period: p }), [apply]);
  const removeCompany = useCallback(
    (slug: string) => apply({ companies: companies.filter((c) => c !== slug) }),
    [apply, companies],
  );
  const toggleCompany = useCallback(
    (slug: string) =>
      apply({
        companies: companies.includes(slug)
          ? companies.filter((c) => c !== slug)
          : [...companies, slug],
      }),
    [apply, companies],
  );
  const removeUserFeed = useCallback(
    (id: string) => apply({ userFeeds: userFeeds.filter((f) => f !== id) }),
    [apply, userFeeds],
  );
  const toggleUserFeed = useCallback(
    (id: string) =>
      apply({
        userFeeds: userFeeds.includes(id) ? userFeeds.filter((f) => f !== id) : [...userFeeds, id],
      }),
    [apply, userFeeds],
  );
  const clearAll = useCallback(
    () => apply({ status: 'all', period: 'all', companies: [], userFeeds: [] }),
    [apply],
  );

  return {
    status,
    period,
    companies,
    userFeeds,
    activeCount,
    isPending,
    setStatus,
    setPeriod,
    toggleCompany,
    removeCompany,
    toggleUserFeed,
    removeUserFeed,
    clearAll,
  };
}
