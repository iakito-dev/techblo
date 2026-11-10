/** Navigation API(window.navigation)のうち、ここで使う部分だけの型。 */
type NavigationLike = { canGoBack?: unknown };

/**
 * 「戻る」で直前のアプリ内ページへ戻れるか(= 1 つ前の履歴エントリが同じオリジンか)。
 *
 * `history.length > 1` だけで判定すると、X や Slack・検索結果から同じタブで記事を開いた場合も
 * 真になり、router.back() でサイトの外へ戻ってしまう。Navigation API の `canGoBack` は
 * 同一オリジンの履歴エントリだけを数えるので、外部から来たときは false になる。
 * 未対応ブラウザでは従来どおり履歴の件数で判定する。
 */
export function canGoBackInApp(
  win: { navigation?: NavigationLike; history: { length: number } } = window as never,
): boolean {
  const canGoBack = win.navigation?.canGoBack;
  if (typeof canGoBack === 'boolean') return canGoBack;
  return win.history.length > 1;
}
