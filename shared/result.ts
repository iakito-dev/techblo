/**
 * Result<T, E> 型と ok/err ヘルパー。
 * throw せずにエラーを Result で表現する(docs/principles/code.md)。
 */

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok;

/**
 * 複数の Result を AND 結合。最初の Err でショートカット。
 */
export function combine<T, E>(rs: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const r of rs) {
    if (!r.ok) return r;
    values.push(r.value);
  }
  return ok(values);
}
