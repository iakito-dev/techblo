interface TagCount {
  tag: string;
  count: number;
}

/**
 * 「最近よく書かれているタグ」と「すべてのタグ」が同じ並び・同じ件数か。
 * 記事が少ない/新しい記事ばかりの間は両者が一致し、同じ一覧が 2 回続いて見えるため、
 * 一致するときは「最近」の節を省く。
 */
export function isSameTagList(a: readonly TagCount[], b: readonly TagCount[]): boolean {
  return a.length === b.length && a.every((x, i) => x.tag === b[i]?.tag && x.count === b[i]?.count);
}
