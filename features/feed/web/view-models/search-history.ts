/** 検索履歴の最大保持件数。ポップオーバー/オーバーレイに収まる量に抑える。 */
export const SEARCH_HISTORY_MAX = 8;
/** 1語の上限。サーバー側の検索語上限(100文字)と揃える。 */
export const SEARCH_HISTORY_TERM_MAX = 100;

/** 同一視キー。全角/半角・大文字小文字の違いで同じ語が並ばないようにする。 */
function keyOf(term: string): string {
  return term.normalize('NFKC').toLowerCase();
}

function sanitize(term: string): string {
  return Array.from(term.trim()).slice(0, SEARCH_HISTORY_TERM_MAX).join('');
}

/** 語を先頭に追加する。空は無視、同一視できる既存語は先頭へ移動し、最大件数で切る。 */
export function addSearchHistory(list: readonly string[], term: string): string[] {
  const next = sanitize(term);
  if (!next) return [...list];
  const key = keyOf(next);
  return [next, ...list.filter((t) => keyOf(t) !== key)].slice(0, SEARCH_HISTORY_MAX);
}

/** 語を1件削除する(同一視キーで一致するもの)。 */
export function removeSearchHistory(list: readonly string[], term: string): string[] {
  const key = keyOf(term);
  return list.filter((t) => keyOf(t) !== key);
}

/** 全消去。 */
export function clearSearchHistory(): string[] {
  return [];
}

/**
 * localStorage の生文字列を安全に履歴へ戻す。壊れた JSON・配列以外・文字列以外の要素は捨てる
 * (手動編集や旧版の値で画面が落ちないようにする)。
 */
export function parseSearchHistory(raw: string | null): string[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const result: string[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string') continue;
    const term = sanitize(item);
    if (!term || result.some((t) => keyOf(t) === keyOf(term))) continue;
    result.push(term);
    if (result.length >= SEARCH_HISTORY_MAX) break;
  }
  return result;
}

export function serializeSearchHistory(list: readonly string[]): string {
  return JSON.stringify(list);
}
