import type { PopularPeriod, ReadFilterMode } from '../../domain/feed-sort';

/** クエリキーごとの差し替え。null・空文字はそのキーを URL から消す(既定値は URL に残さない)。 */
export type FeedParamPatch = Record<string, string | null>;

/**
 * 現在のクエリに patch を当てたフィードの URL を組み立てる純関数(単体テスト対象)。
 * - patch に無いキー(q / tag / category / sort など)は保持する
 * - 条件が変わると対象集合や並びが変わるため `?page=` は常に削除する(FeedList が URL 変化を検知。ADR-0016)
 * - 残るクエリが無ければ `/` を返す
 *
 * 各 ViewModel(並び替え・期間・企業・検索・絞り込み)が同じ規則で URL を作るよう、ここに集約する。
 */
export function buildFeedHref(current: URLSearchParams, patch: Readonly<FeedParamPatch>): string {
  const sp = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === '') sp.delete(key);
    else sp.set(key, value);
  }
  sp.delete('page');
  const qs = sp.toString();
  return qs ? `/?${qs}` : '/';
}

/** 絞り込み条件(ステータス / 期間 / 企業 / マイフィード)を URL の patch に変換する。既定値はキーごと消す。 */
export function feedFiltersPatch(filters: {
  status: ReadFilterMode;
  period: PopularPeriod;
  companies: readonly string[];
  userFeeds: readonly string[];
}): FeedParamPatch {
  return {
    read: filters.status === 'all' ? null : filters.status,
    period: filters.period === 'all' ? null : filters.period,
    company: filters.companies.join(','),
    feed: filters.userFeeds.join(','),
  };
}
