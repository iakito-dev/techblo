import type { CommonError } from '@/shared/error';
import { err, ok, type Result } from '@/shared/result';
import type { UserFeedId, UserId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';
import type { FeedFetcher } from './feed-fetcher';

/**
 * 1件のマイフィードを手動更新する。所有者検証付き。
 * 取得失敗はフィードを消さず recordFailure でステータスに残す(UI に表示)。
 */
export const refreshUserFeed =
  (deps: { feeds: UserFeedRepository; fetchFeed: FeedFetcher }) =>
  async (input: {
    userId: UserId;
    id: UserFeedId;
  }): Promise<Result<{ added: number }, CommonError>> => {
    const feed = await deps.feeds.findById(input.userId, input.id);
    if (!feed) return err({ kind: 'NOT_FOUND' });

    const fetched = await deps.fetchFeed(feed.rssUrl);
    if (!fetched.ok) {
      await deps.feeds.recordFailure(input.id, fetched.error);
      return err({ kind: 'INTERNAL', cause: fetched.error });
    }

    const added = await deps.feeds.upsertArticles(input.id, fetched.value.articles);
    await deps.feeds.recordSuccess(input.id);
    return ok({ added });
  };
