/**
 * 企業名の部分一致判定。全角/半角・大文字/小文字の違い(例: 「ＤｅＮＡ」と「dena」)で
 * 取りこぼさないよう NFKC + 小文字化で正規化して比べる。空クエリは全件一致。
 */
export function matchesCompanyName(name: string, query: string): boolean {
  const q = normalize(query);
  if (q === '') return true;
  return normalize(name).includes(q);
}

function normalize(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}
