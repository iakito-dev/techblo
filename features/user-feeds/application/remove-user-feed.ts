import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { UserFeedId, UserId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';

/** マイフィードを削除する(記事は ON DELETE CASCADE で一緒に消える)。 */
export const removeUserFeed =
  (deps: { feeds: UserFeedRepository }) =>
  async (input: { userId: UserId; id: UserFeedId }): Promise<Result<void, CommonError>> => {
    await deps.feeds.remove(input.userId, input.id);
    return ok(undefined);
  };
