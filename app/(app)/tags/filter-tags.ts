interface TagCount {
  tag: string;
  count: number;
}

/**
 * タグ一覧の絞り込み。全角/半角・大文字/小文字の差(「ＲＥＡＣＴ」と「React」)を NFKC + 小文字化で吸収し、
 * 部分一致で残す。ハッシュタグ表記(フィード見出しの「#React」)のまま打っても当たるよう先頭の # は無視する。
 * 空クエリは全件。並び(記事数の多い順)は保つ。
 */
export function filterTags<T extends TagCount>(tags: readonly T[], query: string): T[] {
  const q = normalize(query).replace(/^#+/, '').trim();
  if (q === '') return [...tags];
  return tags.filter(({ tag }) => normalize(tag).includes(q));
}

function normalize(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}
