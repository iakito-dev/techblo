import { expandTag } from '@/lib/tags/curated';

/** カード最終行に出すタグの最大数(1 行に収まらない分はさらに CSS で隠す)。 */
export const CARD_TAG_LIMIT = 3;

export type CardTag = { tag: string; active: boolean };

/** 検索語として扱う最大長(highlight-match と同じ。これを超える語は強調しないので寄せもしない)。 */
const MAX_QUERY_CHARS = 100;

function matchesQuery(tag: string, needle: string | null): boolean {
  if (!needle) return false;
  return tag.normalize('NFKC').toLowerCase().includes(needle);
}

/**
 * カードに出すタグを、表示順と「いま絞り込んでいるタグか」付きで返す。
 * activeTag(?tag= の canonical 値)があると、それに当たるタグ(類義語グループの生タグを含む。
 * 例: `フロントエンド` で絞り込み中の `React`)を先頭に寄せて active にする。
 * カードは先頭 3 件しか出さないため、寄せないと「#React の一覧なのに React のバッジが見えない」
 * カードができる。active でないタグの相対順は元のまま。
 *
 * query(?q=)があると、検索語を部分一致で含むタグも active の次に寄せる(active にはしない。
 * 強調はバッジ内の <mark> が担う)。検索はタグにも当たるため、タグにしか語が無い記事で
 * 4 件目以降に隠れていると「なぜこの記事が出たのか」がカードから分からない。
 */
export function cardTags(tags: readonly string[], activeTag?: string, query?: string): CardTag[] {
  const target = activeTag?.trim();
  const matches = target ? new Set(expandTag(target)) : null;
  // 検索(listFeed)・強調(splitHighlight)と同じく NFKC で正規化し、大文字小文字を区別しない。
  const rawNeedle = query?.normalize('NFKC').trim().toLowerCase();
  const needle = rawNeedle && [...rawNeedle].length <= MAX_QUERY_CHARS ? rawNeedle : null;
  const active: CardTag[] = [];
  const searched: CardTag[] = [];
  const rest: CardTag[] = [];
  for (const tag of tags) {
    if (matches?.has(tag)) active.push({ tag, active: true });
    else if (matchesQuery(tag, needle)) searched.push({ tag, active: false });
    else rest.push({ tag, active: false });
  }
  return [...active, ...searched, ...rest].slice(0, CARD_TAG_LIMIT);
}
