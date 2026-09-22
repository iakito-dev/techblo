import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { ArticleId, UserId } from '@/shared/type-utils';
import type { BookmarkRepository } from '../domain/bookmark-repository';

/**
 * ブックマークの保存/解除。楽観 UI の「次状態」を受け取る idempotent 設計。
 * 依存は引数注入(DB なしで単体テスト可)。
 */
export const setBookmark =
  (deps: { bookmarks: BookmarkRepository }) =>
  async ({
    userId,
    articleId,
    bookmarked,
  }: {
    userId: UserId;
    articleId: ArticleId;
    bookmarked: boolean;
  }): Promise<Result<{ bookmarked: boolean }, CommonError>> => {
    if (bookmarked) {
      await deps.bookmarks.add(userId, articleId);
    } else {
      await deps.bookmarks.remove(userId, articleId);
    }
    return ok({ bookmarked });
  };
