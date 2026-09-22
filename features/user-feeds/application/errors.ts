/** 1ユーザーが登録できるフィード数の上限。容量と取得負荷の歯止め。 */
export const MAX_FEEDS_PER_USER = 50;

/** フィード登録時のドメイン/入力エラー。actions 層がユーザー向け文言へ変換する。 */
export type AddUserFeedError =
  | { kind: 'VALIDATION'; message: string }
  | { kind: 'DUPLICATE' }
  | { kind: 'LIMIT_EXCEEDED'; limit: number }
  | { kind: 'FETCH_FAILED'; message: string };
