import type { ReadFilterMode } from '@/features/feed/domain/feed-sort';

export function shouldTriggerAutoLoad({
  hasMore,
  isIntersecting,
  isPending,
  stalled = false,
}: {
  hasMore: boolean;
  isIntersecting: boolean;
  isPending: boolean;
  /** 追記しても見える件数が増えない状態(isGuestReadFilterStalled)。自動では読み進めない。 */
  stalled?: boolean;
}) {
  return hasMore && isIntersecting && !isPending && !stalled;
}

/** ゲストの既読フィルタで、表示が増えないページがこれだけ続いたら自動読み込みを止める。 */
export const GUEST_FILTER_MAX_EMPTY_PAGES = 3;

/**
 * ゲスト × 未読/既読フィルタの自動読み込みを止めるべきか。
 *
 * ゲストの既読は localStorage にしか無く、サーバーでは絞れない(ADR-0021)。FeedList はページを取ってから
 * クライアントで hide するため、該当が少ないと番兵が画面内に残り続け、自動読み込みが全ページを取り切るまで
 * Server Action を連発していた(サンドボックスの既読 0 件の `?read=read` で 10 連続、本番の記事数ならその数十倍)。
 * - 既読フィルタで既読が 0 件: 1 件も一致しえないので読み込まない
 * - 表示が増えないページが GUEST_FILTER_MAX_EMPTY_PAGES 続いた: 自動では止め、「もっと読む」の手動に任せる
 */
export function isGuestReadFilterStalled({
  isGuest,
  readMode,
  guestReadCount,
  emptyPageStreak,
}: {
  isGuest: boolean;
  readMode: ReadFilterMode;
  guestReadCount: number;
  emptyPageStreak: number;
}): boolean {
  if (!isGuest || readMode === 'all') return false;
  if (readMode === 'read' && guestReadCount === 0) return true;
  return emptyPageStreak >= GUEST_FILTER_MAX_EMPTY_PAGES;
}
