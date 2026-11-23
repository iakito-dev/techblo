/**
 * 記事 URL に対応するはてなブックマークのエントリーページ(コメント一覧)の URL を返す。
 * エントリーページは `https://b.hatena.ne.jp/entry/` の後ろにスキームを除いた URL を続け、
 * https の記事だけ `s/` を挟む(http と https は別エントリーとして扱われる)。
 * フラグメントはブラウザがサーバーへ送らず、はてな側も同じエントリーとして数えるので落とす
 * (残すとエントリーページ自身のフラグメントと解釈される)。
 * http(s) 以外・壊れた URL はエントリーが存在し得ないので null。
 */
export function hatenaEntryUrl(articleUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(articleUrl);
  } catch {
    return null;
  }
  url.hash = '';
  const rest = url.href.slice(url.protocol.length + 2);
  if (url.protocol === 'https:') return `https://b.hatena.ne.jp/entry/s/${rest}`;
  if (url.protocol === 'http:') return `https://b.hatena.ne.jp/entry/${rest}`;
  return null;
}
