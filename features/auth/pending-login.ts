import type { SocialProvider } from './client';

/**
 * 「ログインボタンを押した → OAuth から戻ってセッションができた」を結び付けるための目印。
 * 認証完了(login_succeeded)はプロバイダからのリダイレクト後に別ページで判明するため、
 * 押した時点のプロバイダを sessionStorage に置き、戻ってきたタブでセッションと突き合わせる。
 * sessionStorage はタブ単位でリダイレクトをまたいで残り、タブを閉じれば消えるので、
 * 押しただけで離脱した記録が後日のログインに誤って紐づくこともない。
 * クライアント専用 — 必ずマウント後(useEffect / イベントハンドラ)から呼ぶこと。
 */
const PENDING_LOGIN_KEY = 'techblo:pending-login-provider';

/** 作成からこの時間以内のユーザーは「今回の認証で登録した」とみなす(OAuth の往復 + 余裕)。 */
const NEW_USER_WINDOW_MS = 10 * 60 * 1000;

function isSocialProvider(value: string | null): value is SocialProvider {
  return value === 'google' || value === 'github' || value === 'discord';
}

export function markPendingLogin(provider: SocialProvider): void {
  try {
    sessionStorage.setItem(PENDING_LOGIN_KEY, provider);
  } catch {
    // 参照不可(プライベートモード等)なら認証完了イベントを諦めるだけでログインは止めない。
  }
}

export function clearPendingLogin(): void {
  try {
    sessionStorage.removeItem(PENDING_LOGIN_KEY);
  } catch {
    // markPendingLogin と同じ理由で握りつぶす。
  }
}

/** 目印があれば取り出して消す(1回のログインで1度だけ完了イベントを送るため)。 */
export function takePendingLogin(): SocialProvider | null {
  try {
    const stored = sessionStorage.getItem(PENDING_LOGIN_KEY);
    sessionStorage.removeItem(PENDING_LOGIN_KEY);
    return isSocialProvider(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * OAuth はログインと登録が同じ操作なので、ユーザーの作成時刻で新規登録かを判定する。
 * Better Auth クライアントは日付を Date で返すが、文字列でも受けられるようにしておく。
 */
export function isNewlyCreatedUser(createdAt: Date | string, now: Date = new Date()): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now.getTime() - created <= NEW_USER_WINDOW_MS;
}
