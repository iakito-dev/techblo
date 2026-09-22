import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { UserId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';
import { toUserFeedSetting, type UserFeedSetting } from './dto';

/** ユーザーの登録フィード一覧を表示 DTO で返す(設定画面用)。 */
export const listUserFeeds =
  (deps: { feeds: UserFeedRepository }) =>
  async (input: { userId: UserId }): Promise<Result<UserFeedSetting[], CommonError>> => {
    const feeds = await deps.feeds.listByUser(input.userId);
    return ok(feeds.map(toUserFeedSetting));
  };
