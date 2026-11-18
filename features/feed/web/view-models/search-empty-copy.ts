import type { FeedSort, PopularPeriod, ReadFilterMode } from '../../domain/feed-sort';

export type SearchEmptyCopy = {
  hint: string;
  /**
   * 絞り込みを外して同じ語で全体から検索し直す URL。絞り込みが無ければ null。
   * 人気順はそのまま残す(並びは絞り込みではないため。resolveFilteredEmptyCopy の clearHref と同じ方針)。
   */
  searchAllHref: string | null;
};

/**
 * 検索(?q=)で 0 件のときの補足文と「絞り込みを外して検索」の URL を決める純関数。
 *
 * 以前は絞り込みの有無にかかわらず「企業や期間の絞り込みを見直してみてください」と出しており、
 * 何も絞っていない読者には見直す対象が無く、逆に企業などで絞っている読者は
 * 「検索をクリア」しか押せず(検索語が消えて絞り込みが残る)、同じ語を全体で探すには
 * 絞り込みを 1 つずつ外して打ち直す必要があった。
 */
export function resolveSearchEmptyCopy({
  query,
  sort,
  period,
  readMode,
  tag,
  category,
  companySlugs,
  feedIds,
}: {
  query: string;
  sort: FeedSort;
  period: PopularPeriod;
  readMode: ReadFilterMode;
  tag?: string;
  category?: string;
  companySlugs?: readonly string[];
  feedIds?: readonly string[];
}): SearchEmptyCopy {
  const hasFilter =
    Boolean(tag) ||
    Boolean(category) ||
    (companySlugs?.length ?? 0) > 0 ||
    (feedIds?.length ?? 0) > 0 ||
    period !== 'all' ||
    readMode !== 'all';

  if (!hasFilter) {
    return {
      hint: '別のキーワードや、英語・カタカナなど表記を変えて検索してみてください。',
      searchAllHref: null,
    };
  }

  const sp = new URLSearchParams({ q: query });
  if (sort === 'popular') sp.set('sort', 'popular');
  return {
    hint: '絞り込み中の条件では見つかりませんでした。絞り込みを外すと全体から検索できます。',
    searchAllHref: `/?${sp.toString()}`,
  };
}
