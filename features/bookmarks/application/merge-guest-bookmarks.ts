import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { ArticleId, UserId } from '@/shared/type-utils';
import type { BookmarkRepository } from '../domain/bookmark-repository';

/**
 * ゲスト(localStorage)のブックマークをログインユーザーの DB へ一括マージする。
 * 冪等(Repository.addMany が onConflictDoNothing)。実在しない article ID は
 * 呼び出し側(components/article)で getSavedArticles により除外済みの前提(FK 安全)。
 * 依存は引数注入(DB なしで単体テスト可)。
 */
export const mergeGuestBookmarks =
  (deps: { bookmarks: BookmarkRepository }) =>
  async ({
    userId,
    articleIds,
  }: {
    userId: UserId;
    articleIds: ArticleId[];
  }): Promise<Result<{ merged: number }, CommonError>> => {
    await deps.bookmarks.addMany(userId, articleIds);
    return ok({ merged: articleIds.length });
  };
