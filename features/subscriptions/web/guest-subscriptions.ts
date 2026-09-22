/**
 * ゲスト(未ログイン)の購読設定を Cookie に永続化するための純ヘルパー。
 *
 * クライアント(設定の購読リスト)とサーバー(フィード取得)の両方から同じ Cookie を
 * 読み書きするため、名前とパース/シリアライズだけをここに集約する(副作用なしの純関数)。
 * 保持するのは「購読 OFF にした企業 slug」の配列(既定=全社購読なので、未設定なら全 ON)。
 * ログイン時は DB へ移行する想定(ゲスト保存と同じ ADR-0017 の方針)。
 */
export const GUEST_UNSUBSCRIBED_COOKIE = 'techblo.guest.unsubscribed';

// 旧名(corpex 時代)の Cookie。リネーム前のゲスト購読設定を引き継ぐためのフォールバック。
export const GUEST_UNSUBSCRIBED_COOKIE_LEGACY = 'corpex.guest.unsubscribed';

/** Cookie の生値(URL エンコード済み JSON 配列)を slug 配列へ。壊れていれば空配列。 */
export function parseUnsubscribed(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * getter から新キー優先・旧キーフォールバックで購読 OFF slug を読む(server/client 共用)。
 * `get` は Cookie 名を受け取り生値(未設定なら undefined)を返す関数。
 */
export function readUnsubscribedFrom(get: (name: string) => string | undefined): string[] {
  return parseUnsubscribed(get(GUEST_UNSUBSCRIBED_COOKIE) ?? get(GUEST_UNSUBSCRIBED_COOKIE_LEGACY));
}

/** slug 配列を Cookie 値(URL エンコード済み JSON)へ。 */
export function serializeUnsubscribed(slugs: string[]): string {
  return encodeURIComponent(JSON.stringify(slugs));
}
