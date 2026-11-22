import { expandTag } from '@/lib/tags/curated';

/** カード最終行に出すタグの最大数(1 行に収まらない分はさらに CSS で隠す)。 */
export const CARD_TAG_LIMIT = 3;

export type CardTag = { tag: string; active: boolean };

/**
 * カードに出すタグを、表示順と「いま絞り込んでいるタグか」付きで返す。
 * activeTag(?tag= の canonical 値)があると、それに当たるタグ(類義語グループの生タグを含む。
 * 例: `フロントエンド` で絞り込み中の `React`)を先頭に寄せて active にする。
 * カードは先頭 3 件しか出さないため、寄せないと「#React の一覧なのに React のバッジが見えない」
 * カードができる。active でないタグの相対順は元のまま。
 */
export function cardTags(tags: readonly string[], activeTag?: string): CardTag[] {
  const target = activeTag?.trim();
  const matches = target ? new Set(expandTag(target)) : null;
  const active: CardTag[] = [];
  const rest: CardTag[] = [];
  for (const tag of tags) {
    if (matches?.has(tag)) active.push({ tag, active: true });
    else rest.push({ tag, active: false });
  }
  return [...active, ...rest].slice(0, CARD_TAG_LIMIT);
}
