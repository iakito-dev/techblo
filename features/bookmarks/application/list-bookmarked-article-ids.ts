import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { UserId } from '@/shared/type-utils';
import type { BookmarkRepository } from '../domain/bookmark-repository';

/**
 * ユーザーのブックマーク記事 id 一覧(追加日時の降順)。依存は引数注入。
 */
export const listBookmarkedArticleIds =
  (deps: { bookmarks: BookmarkRepository }) =>
  async ({ userId }: { userId: UserId }): Promise<Result<string[], CommonError>> => {
    const ids = await deps.bookmarks.listArticleIds(userId);
    return ok(ids);
  };
