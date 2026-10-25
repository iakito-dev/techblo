import { captureEvent } from '@/lib/observability/posthog';

/**
 * ブックマーク / お気に入りの追加・削除を PostHog に送る(bookmark_added 等)。
 * ログイン時は Server Action の成功後、ゲスト時は localStorage へ書いた直後に呼ぶ
 * (失敗してロールバックした操作は数えない)。
 */
export function trackSaveChange(
  kind: 'bookmark' | 'favorite',
  articleId: string,
  saved: boolean,
  isGuest: boolean,
): void {
  const properties = { articleId, isGuest };
  if (kind === 'bookmark') {
    captureEvent(saved ? 'bookmark_added' : 'bookmark_removed', properties);
  } else {
    captureEvent(saved ? 'favorite_added' : 'favorite_removed', properties);
  }
}
