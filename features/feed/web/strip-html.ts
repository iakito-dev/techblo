/**
 * RSS の description は HTML を含むことがあるため、表示用にタグを除去する。
 * 本格的なサニタイズは記事本文を出す場合に sanitize-html を使う。
 */

/** RSS 抜粋に実際に現れる名前付きエンティティ(HTML 全量の対応は不要)。amp は二重デコード防止のため最後に別処理。 */
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  copy: '©',
};

/** 不正なコードポイント(サロゲート単体・範囲外)はエンティティごと落とす。 */
function fromCodePointSafe(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/**
 * HTML エンティティをデコードする。数値文字参照(10進/16進)と頻出の名前付きに対応。
 * `&amp;` は最後に処理する(`&amp;lt;` を `<` へ二重デコードしないため)。
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => fromCodePointSafe(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => fromCodePointSafe(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
    .replace(/&amp;/gi, '&');
}

export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, '')).trim();
}

/**
 * プレビュー用の抜粋を作る。タグ除去 + 連続空白の圧縮 + 文字数で切り詰め。
 * ダイアログは「読む場所」ではなく元記事への誘導なので、全文は出さない。
 */
export function toExcerpt(html: string, max = 280): string {
  const text = stripHtml(html).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
