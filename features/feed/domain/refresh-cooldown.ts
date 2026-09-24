/**
 * 手動更新(refreshFeed)のクールダウン。
 * 更新は全企業のクロール + はてブ数更新 + feed キャッシュ無効化を伴い、Server Action は外部から
 * 直接 POST できるため、連打・自動化で外部ブログやはてブ API への過剰リクエストにならないよう
 * 直近の取込試行(cron 含む)からこの間隔は再クロールしない。
 */
export const REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

/** 直近の取込試行から見て、いま手動更新でクロールしてよいか。 */
export function canRefreshNow(lastAttemptAt: Date | null, now: Date): boolean {
  if (!lastAttemptAt) return true;
  return now.getTime() - lastAttemptAt.getTime() >= REFRESH_COOLDOWN_MS;
}
