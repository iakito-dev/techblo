const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * article.id など uuid 列に渡す値の形式を確かめる。
 * 形式が不正な文字列を uuid 列の比較に渡すと Postgres が型エラー(22P02)にして 500 になるため、
 * URL・localStorage・Server Action 引数など外から来た ID は DB へ渡す前にここで弾く。
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
