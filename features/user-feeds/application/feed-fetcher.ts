import type { Result } from '@/shared/result';
import type { UserFeedArticleDraft } from '../domain/user-feed';

/** RSS を取得・パースした結果。フィードのメタ(表示名/サイト)と記事群。 */
export type FetchedFeed = {
  title: string | null;
  siteUrl: string | null;
  articles: UserFeedArticleDraft[];
};

/**
 * RSS URL を取得・検証・パースする外部ポート(Driven Port)。
 * SSRF 検証 → HTTP 取得 → パースまでを内包する。実装は infrastructure。
 * 依存注入にすることで usecase をネットワークなしでテストできる。
 */
export type FeedFetcher = (rssUrl: string) => Promise<Result<FetchedFeed, string>>;
