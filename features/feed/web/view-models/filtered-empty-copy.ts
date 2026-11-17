import type { FeedSort, PopularPeriod, ReadFilterMode } from '../../domain/feed-sort';

export type FilteredEmptyCopy = {
  title: string;
  hint: string;
  /** 絞り込みを外したフィードの URL。人気順はそのまま残す(並びは絞り込みではないため)。 */
  clearHref: string;
  /** タグ単独で 0 件のときだけ、別のタグを選び直せるようタグ一覧への導線を足す。 */
  showTagIndexLink: boolean;
};

/**
 * 絞り込み(タグ・カテゴリ・企業・マイフィード・期間・未読/既読)の結果が 0 件のときの文言を決める純関数。
 * 絞り込みが無ければ null(= 本当に記事が無いので、従来の「記事がまだありません」を出す)。
 *
 * 以前は絞り込みの有無にかかわらず「記事がまだありません。しばらくしてから再度確認してください」を出しており、
 * 存在しないタグや「24時間以内 × 1社」で 0 件になっただけでも、待てば出てくるように読めて
 * 絞り込みを外す手がかりが無かった。検索(?q=)と人気順の期間 0 件は専用の空状態が先に受ける。
 */
export function resolveFilteredEmptyCopy({
  sort,
  period,
  readMode,
  tag,
  category,
  companySlugs,
  feedIds,
}: {
  sort: FeedSort;
  period: PopularPeriod;
  readMode: ReadFilterMode;
  tag?: string;
  category?: string;
  companySlugs?: readonly string[];
  feedIds?: readonly string[];
}): FilteredEmptyCopy | null {
  const hasTag = Boolean(tag);
  const hasOther =
    Boolean(category) ||
    (companySlugs?.length ?? 0) > 0 ||
    (feedIds?.length ?? 0) > 0 ||
    period !== 'all';
  const hasRead = readMode !== 'all';
  if (!hasTag && !hasOther && !hasRead) return null;

  const clearHref = sort === 'popular' ? '/?sort=popular' : '/';
  const base = { clearHref, showTagIndexLink: false };

  if (hasTag && !hasOther && !hasRead) {
    return {
      ...base,
      title: `「#${tag}」の記事はありません`,
      hint: '表記の違うタグや、タグ一覧から探してみてください。',
      showTagIndexLink: true,
    };
  }
  if (hasRead && !hasTag && !hasOther) {
    return readMode === 'read'
      ? {
          ...base,
          title: '既読の記事はまだありません',
          hint: '記事ページを開くと既読になり、ここに表示されます。',
        }
      : {
          ...base,
          title: '未読の記事はありません',
          hint: '表示中の記事はすべて読みました。',
        };
  }
  return {
    ...base,
    title: '条件に一致する記事はありません',
    hint: '絞り込みを解除するか、条件を変えてみてください。',
  };
}
