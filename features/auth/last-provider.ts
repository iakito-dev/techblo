import type { SocialProvider } from './client';

/**
 * 直近に使ったログイン方法を localStorage に覚えておくためのキーと読み書き。
 * ログインボタン(主役の出し分け)と認証画面の見出し(おかえりなさい/はじめよう)で共有する。
 * クライアント専用 — 必ずマウント後(useEffect 等)から呼ぶこと。
 */
const LAST_PROVIDER_KEY = 'techblo:last-auth-provider';

function isSocialProvider(value: string | null): value is SocialProvider {
  return value === 'google' || value === 'github' || value === 'discord';
}

/** 記録された直近のログイン方法。未記録・参照不可(プライベートモード等)なら null。 */
export function readLastProvider(): SocialProvider | null {
  try {
    const stored = localStorage.getItem(LAST_PROVIDER_KEY);
    return isSocialProvider(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** ログイン開始時に直近の方法を記録する(失敗してもログイン自体は止めない)。 */
export function writeLastProvider(provider: SocialProvider): void {
  try {
    localStorage.setItem(LAST_PROVIDER_KEY, provider);
  } catch {
    // localStorage 不可でも既定の主役で動くので握りつぶす。
  }
}
