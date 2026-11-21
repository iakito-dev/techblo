/**
 * ログイン画面の「ログインせずに戻る」の遷移先。
 *
 * ログイン画面はアプリのシェル(ヘッダー・ナビ)の外にあり、ホーム画面に追加した PWA(standalone)では
 * ブラウザの戻るボタンも無いため、画面内に出口が無いと閉じ込められる。来た画面(callbackURL)へ戻し、
 * 無ければトップへ戻す。
 *
 * callbackURL はクエリから来る任意の文字列なので、同一オリジンのパスだけを採用する
 * (`//evil.example` や `/\evil.example` はブラウザが別オリジンとして解釈しうるため弾く)。
 * ログイン画面自身を指すとループするのでトップに落とす。
 */
export function resolveLoginExitHref(callbackURL: string | undefined): string {
  if (!callbackURL?.startsWith('/')) return '/';
  if (callbackURL.startsWith('//') || callbackURL.startsWith('/\\')) return '/';
  if (/^\/(login|signup)(?:[/?#]|$)/.test(callbackURL)) return '/';
  return callbackURL;
}
