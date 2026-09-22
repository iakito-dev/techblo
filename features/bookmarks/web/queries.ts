import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@/db/client';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { logger } from '@/lib/observability/logger';
import type { UserId } from '@/shared/type-utils';
import { listBookmarkedArticleIds } from '../application/list-bookmarked-article-ids';
import { DrizzleBookmarkRepository } from '../infrastructure/drizzle-bookmark-repository';

/**
 * RSC が呼ぶ composition root。Server Component / Server Action からのみ import すること。
 */
const bookmarkRepo = new DrizzleBookmarkRepository(db);

export async function getBookmarkedArticleIds(userId: UserId): Promise<string[]> {
  'use cache';
  cacheTag(CACHE_TAGS.userBookmarks(userId));
  // 保存トグルの Server Action が userBookmarks タグを無効化するので、寿命は鮮度ではなく
  // 「トグルが来なかった時の上限」。'minutes' だと数分でコールドに戻り再訪のたびに Neon 往復する
  // ため 'hours' に延ばす(トグル時は即時反映を維持)。
  cacheLife('hours');

  const result = await listBookmarkedArticleIds({ bookmarks: bookmarkRepo })({ userId });
  if (!result.ok) {
    logger.error('listBookmarkedArticleIds failed', { error: result.error, userId });
    throw new Error('あとで読む記事の取得に失敗しました', { cause: result.error });
  }
  return result.value;
}
