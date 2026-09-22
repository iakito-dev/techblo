import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@/db/client';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { logger } from '@/lib/observability/logger';
import type { UserId } from '@/shared/type-utils';
import { listFavoritedArticleIds } from '../application/list-favorited-article-ids';
import { DrizzleFavoriteRepository } from '../infrastructure/drizzle-favorite-repository';

/**
 * RSC が呼ぶ composition root。Server Component / Server Action からのみ import すること。
 */
const favoriteRepo = new DrizzleFavoriteRepository(db);

export async function getFavoritedArticleIds(userId: UserId): Promise<string[]> {
  'use cache';
  cacheTag(CACHE_TAGS.userFavorites(userId));
  // 保存トグルの Server Action が userFavorites タグを無効化するので、寿命は鮮度ではなく
  // 「トグルが来なかった時の上限」。'minutes' だと数分でコールドに戻り再訪のたびに Neon 往復する
  // ため 'hours' に延ばす(トグル時は即時反映を維持)。
  cacheLife('hours');

  const result = await listFavoritedArticleIds({ favorites: favoriteRepo })({ userId });
  if (!result.ok) {
    logger.error('listFavoritedArticleIds failed', { error: result.error, userId });
    throw new Error('お気に入りの取得に失敗しました', { cause: result.error });
  }
  return result.value;
}
