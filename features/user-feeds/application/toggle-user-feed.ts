import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { UserFeedId, UserId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';

/** マイフィードの表示 ON/OFF を切り替える(OFF はメインフィードのマージ対象外)。 */
export const toggleUserFeed =
  (deps: { feeds: UserFeedRepository }) =>
  async (input: {
    userId: UserId;
    id: UserFeedId;
    enabled: boolean;
  }): Promise<Result<{ enabled: boolean }, CommonError>> => {
    await deps.feeds.setEnabled(input.userId, input.id, input.enabled);
    return ok({ enabled: input.enabled });
  };
