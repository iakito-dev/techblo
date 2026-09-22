import type { UserFeedId } from '@/shared/type-utils';

/**
 * ユーザーが登録したプライベート RSS フィード(ドメインモデル)。
 * DB 行から infrastructure が変換する。取得ステータスは表示に必要な分だけ持つ。
 */
export type UserFeed = {
  id: UserFeedId;
  title: string;
  rssUrl: string;
  siteUrl: string | null;
  enabled: boolean;
  lastFetchedAt: Date | null;
  lastError: string | null;
};

/**
 * RSS を取得・パースした記事1件(user_feed_articles への upsert 前の中間表現)。
 * lib/rss の ArticleInput と同形だが、domain を pure に保つためここで再定義する。
 */
export type UserFeedArticleDraft = {
  url: string;
  title: string;
  description: string | null;
  ogImage: string | null;
  author: string | null;
  publishedAt: Date;
};

/** 新規フィード登録時に永続化する値(取得済みのタイトル等を含む)。 */
export type NewUserFeed = {
  rssUrl: string;
  title: string;
  siteUrl: string | null;
};
