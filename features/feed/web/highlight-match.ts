/** 検索語の一致箇所を示すテキスト片。match=true の片を <mark> で強調する。 */
export type HighlightSegment = { text: string; match: boolean };

const MAX_QUERY_CHARS = 100;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * text を検索語 query の一致箇所(大文字小文字を区別しない部分一致)で区切る。
 * 検索(ADR-0022)は「検索語全体」の ILIKE 部分一致なので、ここも語に分割せず query 全体で突き合わせる。
 * 一致が無い・query が空のときは text 全体を 1 片で返す(呼び出し側は分岐せずそのまま描画できる)。
 */
export function splitHighlight(text: string, query: string | undefined): HighlightSegment[] {
  // 検索側(listFeed)と同じく NFKC で正規化する(全角の「ＲＥＡＣＴ」で検索しても React に当たる)。
  const needle = query?.normalize('NFKC').trim();
  if (!text || !needle || [...needle].length > MAX_QUERY_CHARS) return [{ text, match: false }];

  // 'u' で Unicode 単位の大文字小文字無視にする。toLowerCase で長さが変わる文字(İ など)でも
  // インデックスがずれないよう、元の文字列に対して直接マッチさせる。
  const pattern = new RegExp(escapeRegExp(needle), 'giu');
  const segments: HighlightSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const start = m.index ?? 0;
    if (start > last) segments.push({ text: text.slice(last, start), match: false });
    segments.push({ text: m[0], match: true });
    last = start + m[0].length;
  }
  if (segments.length === 0) return [{ text, match: false }];
  if (last < text.length) segments.push({ text: text.slice(last), match: false });
  return segments;
}
