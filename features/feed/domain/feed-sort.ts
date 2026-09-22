/**
 * フィードの並び替え。
 * - latest: 新着順 (publishedAt, id) 降順
 * - popular: 人気スコア順(view/bookmark/favorite/hatena の加重和)
 * いずれもオフセットページネーション(?page=N)で前後ページを取得する。
 */
export type FeedSort = 'latest' | 'popular';

export const DEFAULT_SORT: FeedSort = 'latest';

/** 文字列(?sort=)を FeedSort に正規化する。不正値は latest(既定)。 */
export const parseFeedSort = (value: string | undefined): FeedSort =>
  value === 'popular' ? 'popular' : 'latest';

/**
 * 人気順の集計期間。popular のときだけ意味を持つ。いずれもその期間に「公開された」記事に絞る。
 * - today/week: 短期。伸び速度(velocity = 直近の はてブ増加 / 経過時間)で並べる(ADR-0018)
 * - month/all: 長期。単純なはてブ数(累計の絶対値)で並べる。殿堂的な人気
 * 期間は直近 N 日のローリングウィンドウ(all はウィンドウ無し。ADR-0014)。
 */
export type PopularPeriod = 'today' | 'week' | 'month' | 'all';

export const DEFAULT_PERIOD: PopularPeriod = 'all';

export const POPULAR_PERIODS: readonly PopularPeriod[] = ['today', 'week', 'month', 'all'] as const;

/** 期間 → 直近の日数。all はウィンドウ無し(全期間)なので持たない。 */
export const PERIOD_DAYS: Record<Exclude<PopularPeriod, 'all'>, number> = {
  today: 1,
  week: 7,
  month: 30,
};

/** 文字列(?period=)を PopularPeriod に正規化する。不正値は all。 */
export const parsePeriod = (value: string | undefined): PopularPeriod =>
  value === 'today' || value === 'week' || value === 'month' ? value : 'all';

/**
 * 未読/既読フィルタのモード。
 * - all(既定): 絞らない。ゲスト共通の getFeed をそのまま使える
 * - unread: ユーザーが未読の記事のみ(reads に無い)
 * - read: ユーザーが既読の記事のみ(reads にある)
 * unread/read は per-user 状態なのでログイン必須。フィルタは feed の SQL(EXISTS/NOT EXISTS)で行う(ADR-0021)。
 */
export type ReadFilterMode = 'all' | 'unread' | 'read';

export const DEFAULT_READ_MODE: ReadFilterMode = 'all';

/** 文字列(?read=)を ReadFilterMode に正規化する。不正値は all。 */
export const parseReadMode = (value: string | undefined): ReadFilterMode =>
  value === 'unread' || value === 'read' ? value : 'all';
