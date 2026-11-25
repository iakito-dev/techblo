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

/**
 * ゲストの既読フィルタ(?read=read)で、localStorage の既読記事がすべて一覧に出そろったか。
 * 既読フィルタに一致しうるのは既読 ID の記事だけなので、出そろったらこれ以上ページを取っても何も増えない。
 * 以前は既読 0 件のときだけ止めていたため、既読が数件だと一覧に全部出たあとも自動読み込みが空ページを
 * 取り続け(サンドボックスの既読 8 件で 6 回)、「もっと読む」も残って押すとフィード全体を読み進めていた。
 * 既読 ID には削除済み・非表示企業の記事や他の絞り込みで外れる記事も含みうるので、その場合は出そろわず
 * 従来どおり(isGuestReadFilterStalled の空ページ連続で自動を止める)に任せる。
 */
export function areAllGuestReadsShown({
  isGuest,
  readMode,
  guestReadCount,
  shownCount,
}: {
  isGuest: boolean;
  readMode: ReadFilterMode;
  guestReadCount: number;
  /** 既読フィルタで一覧に出ている件数(= 一覧に出ている既読記事の数)。 */
  shownCount: number;
}): boolean {
  return isGuest && readMode === 'read' && shownCount >= guestReadCount;
}

/**
 * 一覧の末尾に「すべての記事を表示しました」を出すか。
 * 自動読み込みの一覧は最後まで読むと何の印も無く途切れ、続きを読み込み中なのか終わったのかが分からなかった。
 * 続きが無い(hasMore=false)か、ゲストの既読フィルタで一致しうる記事が出そろったときだけ出す。
 * 表示が 0 件なら空状態が受け持つので出さない。
 */
export function shouldShowFeedEnd({
  hasMore,
  nothingMoreCanMatch,
  visibleCount,
}: {
  hasMore: boolean;
  /** areAllGuestReadsShown の結果。 */
  nothingMoreCanMatch: boolean;
  visibleCount: number;
}): boolean {
  return visibleCount > 0 && (!hasMore || nothingMoreCanMatch);
}
