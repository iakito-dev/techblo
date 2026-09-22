import type { UserFeed } from '../domain/user-feed';

/**
 * 設定画面に出すフィード1件分の表示 DTO。
 * クライアントへ渡すため id は素の string にする(branded 型は剥がす)。
 */
export type UserFeedSetting = {
  id: string;
  title: string;
  rssUrl: string;
  siteUrl: string | null;
  enabled: boolean;
  lastFetchedAt: Date | null;
  lastError: string | null;
};

export const toUserFeedSetting = (f: UserFeed): UserFeedSetting => ({
  id: f.id,
  title: f.title,
  rssUrl: f.rssUrl,
  siteUrl: f.siteUrl,
  enabled: f.enabled,
  lastFetchedAt: f.lastFetchedAt,
  lastError: f.lastError,
});

/**
 * フィルタ UI(サイドバー/チップ/シート)に出すマイフィード1件分。
 * 企業フィルタの FilterCompany と同型: id をキーに、ファビコンは siteUrl から導出する。
 */
export type UserFeedFilter = {
  id: string;
  title: string;
  siteUrl: string | null;
  articleCount: number;
};
