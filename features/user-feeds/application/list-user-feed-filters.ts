import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { UserId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';
import type { UserFeedFilter } from './dto';

/** フィルタ UI 用に、有効マイフィードを記事件数付きで返す。 */
export const listUserFeedFilters =
  (deps: { feeds: UserFeedRepository }) =>
  async (input: { userId: UserId }): Promise<Result<UserFeedFilter[], CommonError>> => {
    const rows = await deps.feeds.listFiltersByUser(input.userId);
    return ok(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        siteUrl: r.siteUrl,
        articleCount: r.articleCount,
      })),
    );
  };
