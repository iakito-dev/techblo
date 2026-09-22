import type { UserFeedId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';
import type { FeedFetcher } from './feed-fetcher';

export type IngestUserFeedResult = {
  id: UserFeedId;
  ok: boolean;
  added: number;
  error?: string;
};

/**
 * 全ユーザーの有効マイフィードを取り込む(定期バッチ用)。
 * 1件の失敗が全体を止めないよう個別に握り、ステータスを記録する。
 * 取り込んだ新着総数を呼び出し側(trigger)がキャッシュ無効化の判断に使う。
 */
export const ingestUserFeeds =
  (deps: { feeds: UserFeedRepository; fetchFeed: FeedFetcher }) =>
  async (): Promise<IngestUserFeedResult[]> => {
    const feeds = await deps.feeds.listAllEnabled();

    const settled = await Promise.allSettled(
      feeds.map(async (feed): Promise<IngestUserFeedResult> => {
        const fetched = await deps.fetchFeed(feed.rssUrl);
        if (!fetched.ok) {
          await deps.feeds.recordFailure(feed.id, fetched.error);
          return { id: feed.id, ok: false, added: 0, error: fetched.error };
        }
        const added = await deps.feeds.upsertArticles(feed.id, fetched.value.articles);
        await deps.feeds.recordSuccess(feed.id);
        return { id: feed.id, ok: true, added };
      }),
    );

    return settled.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : {
            id: feeds[i]?.id ?? ('unknown' as UserFeedId),
            ok: false,
            added: 0,
            error: r.reason instanceof Error ? r.reason.message : String(r.reason),
          },
    );
  };
