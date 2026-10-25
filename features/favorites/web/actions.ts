'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { headers } from 'next/headers';
import { db } from '@/db/client';
import { auth } from '@/lib/auth';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { logger } from '@/lib/observability/logger';
import type { CommonError } from '@/shared/error';
import { err, ok, type Result } from '@/shared/result';
import { asArticleId, asUserId } from '@/shared/type-utils';
import { mergeGuestFavorites } from '../application/merge-guest-favorites';
import { setFavorite } from '../application/set-favorite';
import { DrizzleFavoriteRepository } from '../infrastructure/drizzle-favorite-repository';

const favoriteRepo = new DrizzleFavoriteRepository(db);

/**
 * お気に入りの保存/解除 Server Action。
 * セッションは features 間 import を避けるため lib/auth から直接取得(ADR-0002)。
 */
export async function setFavoriteAction(input: {
  articleId: string;
  favorited: boolean;
}): Promise<Result<{ favorited: boolean }, CommonError>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return err({ kind: 'UNAUTHORIZED' });

  const result = await setFavorite({ favorites: favoriteRepo })({
    userId: asUserId(session.user.id),
    articleId: asArticleId(input.articleId),
    favorited: input.favorited,
  });

  if (!result.ok) {
    logger.error('setFavorite failed', {
      error: result.error,
      userId: session.user.id,
      articleId: input.articleId,
    });
    return result;
  }

  // トップフィードはユーザータグで無効化し、ゲスト共通の feed キャッシュを巻き添えにしない
  updateTag(CACHE_TAGS.userFavorites(asUserId(session.user.id)));
  revalidatePath('/favorites');
  return result;
}

/**
 * ゲスト(localStorage)のお気に入りをログイン後に DB へ一括マージする Server Action。
 * 実在しない article ID は呼び出し側(app/_composition/article)で除外済みの前提(FK 安全・ADR-0017)。
 * 冪等なので二重実行されても重複しない。
 */
export async function migrateGuestFavorites(
  articleIds: string[],
): Promise<Result<{ merged: number }, CommonError>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return err({ kind: 'UNAUTHORIZED' });
  if (articleIds.length === 0) return ok({ merged: 0 });

  const userId = asUserId(session.user.id);
  const result = await mergeGuestFavorites({ favorites: favoriteRepo })({
    userId,
    articleIds: articleIds.map(asArticleId),
  });

  if (!result.ok) {
    logger.error('mergeGuestFavorites failed', { error: result.error, userId: session.user.id });
    return result;
  }

  updateTag(CACHE_TAGS.userFavorites(userId));
  revalidatePath('/favorites');
  return result;
}
