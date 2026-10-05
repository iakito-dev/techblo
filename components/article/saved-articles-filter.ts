export type SavedSort = 'savedAt' | 'publishedAtDesc' | 'publishedAtAsc';

/** 絞り込み・並び替えに必要な最小の形。ArticleCard と ArticleSummaryDto から組み立てる。 */
export type SavedFilterItem = {
  title: string;
  companyName: string;
  publishedAt: Date;
  overview?: string | null;
  tags?: readonly string[];
};

/** 全角/半角・大文字小文字の差を吸収する(NFKC は全角空白も半角空白へ畳む)。 */
export function normalizeQuery(text: string): string {
  return text.normalize('NFKC').toLowerCase();
}

/** 空白区切りの AND 語に分解する。空クエリは空配列。 */
export function toTerms(query: string): string[] {
  return normalizeQuery(query).split(/\s+/).filter(Boolean);
}

export function matchesSavedQuery(item: SavedFilterItem, query: string): boolean {
  const terms = toTerms(query);
  if (terms.length === 0) return true;
  const haystack = normalizeQuery(
    [item.title, item.companyName, item.overview ?? '', ...(item.tags ?? [])].join('\n'),
  );
  return terms.every((term) => haystack.includes(term));
}

/**
 * 絞り込み → 並び替え。入力配列は変更しない。
 * 'savedAt' は入力順(= 保存した日の新しい順)をそのまま保つ。
 */
export function filterAndSortSaved<T>(
  items: readonly T[],
  toItem: (value: T) => SavedFilterItem,
  query: string,
  sort: SavedSort,
): T[] {
  const filtered = items.filter((v) => matchesSavedQuery(toItem(v), query));
  if (sort === 'savedAt') return filtered;
  const dir = sort === 'publishedAtDesc' ? -1 : 1;
  return filtered.sort(
    (a, b) => dir * (toItem(a).publishedAt.getTime() - toItem(b).publishedAt.getTime()),
  );
}
