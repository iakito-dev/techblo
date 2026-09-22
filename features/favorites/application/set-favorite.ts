import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { ArticleId, UserId } from '@/shared/type-utils';
import type { FavoriteRepository } from '../domain/favorite-repository';

/**
 * お気に入りの保存/解除。楽観 UI の「次状態」を受け取る idempotent 設計。
 */
export const setFavorite =
  (deps: { favorites: FavoriteRepository }) =>
  async ({
    userId,
    articleId,
    favorited,
  }: {
    userId: UserId;
    articleId: ArticleId;
    favorited: boolean;
  }): Promise<Result<{ favorited: boolean }, CommonError>> => {
    if (favorited) {
      await deps.favorites.add(userId, articleId);
    } else {
      await deps.favorites.remove(userId, articleId);
    }
    return ok({ favorited });
  };
