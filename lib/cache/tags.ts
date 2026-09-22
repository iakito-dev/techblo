/**
 * revalidateTag のキーを1箇所に集約(タイポ防止)。
 */
export const CACHE_TAGS = {
  feed: 'feed',
  trending: 'trending',
  companies: 'companies',
  company: (id: string) => `company-${id}`,
  article: (id: string) => `article-${id}`,
  // ユーザー単位の保存状態。query 側で cacheTag、操作 Action 側で updateTag する。
  userBookmarks: (uid: string) => `user-bookmarks-${uid}`,
  userFavorites: (uid: string) => `user-favorites-${uid}`,
  userSubscriptions: (uid: string) => `user-subscriptions-${uid}`,
  // ユーザー登録RSS(プライベート)。設定変更・取得時に updateTag、マージ版フィードの per-user キーに使う。
  userFeeds: (uid: string) => `user-feeds-${uid}`,
  // 既読。未読/既読フィルタ済みフィード(per-user)を無効化する。記事を開いて既読化した時に
  // revalidateTag(userReads, 'max') で遅延無効化する(ADR-0021)。
  userReads: (uid: string) => `user-reads-${uid}`,
} as const;
