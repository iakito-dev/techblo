import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { UserId } from '@/shared/type-utils';
import type { FavoriteRepository } from '../domain/favorite-repository';

/**
 * ユーザーのお気に入り記事 id 一覧(追加日時の降順)。依存は引数注入。
 */
export const listFavoritedArticleIds =
  (deps: { favorites: FavoriteRepository }) =>
  async ({ userId }: { userId: UserId }): Promise<Result<string[], CommonError>> => {
    const ids = await deps.favorites.listArticleIds(userId);
    return ok(ids);
  };
