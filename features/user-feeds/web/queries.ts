import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@/db/client';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { logger } from '@/lib/observability/logger';
import type { UserId } from '@/shared/type-utils';
import type { UserFeedFilter, UserFeedSetting } from '../application/dto';
import { listUserFeedFilters } from '../application/list-user-feed-filters';
import { listUserFeeds } from '../application/list-user-feeds';
import { DrizzleUserFeedRepository } from '../infrastructure/drizzle-user-feed-repository';

/**
 * RSC が呼ぶ composition root(Driving Adapter)。
 * repository を組み立てて usecase に注入し、想定エラーはログして throw する。
 * Server Component / Server Action からのみ import すること。
 */
const userFeedRepo = new DrizzleUserFeedRepository(db);

/**
 * ユーザーの登録フィード一覧(設定画面用)。
 * 設定変更・取得の Server Action が userFeeds タグを無効化するので寿命は鮮度ではなく上限。
 */
export async function getUserFeeds(userId: UserId): Promise<UserFeedSetting[]> {
  'use cache';
  cacheTag(CACHE_TAGS.userFeeds(userId));
  cacheLife('hours');

  const result = await listUserFeeds({ feeds: userFeedRepo })({ userId });
  if (!result.ok) {
    logger.error('listUserFeeds failed', { error: result.error, userId });
    throw new Error('マイフィードの取得に失敗しました', { cause: result.error });
  }
  return result.value;
}

/**
 * 有効なマイフィードの id 群(メインフィードのマージ対象)。
 * getUserFeeds のキャッシュを共有し、enabled だけ抽出する。空配列 = マージ対象なし。
 */
export async function getEnabledUserFeedIds(userId: UserId): Promise<string[]> {
  const feeds = await getUserFeeds(userId);
  return feeds.filter((f) => f.enabled).map((f) => f.id);
}

/**
 * フィルタ UI(サイドバー/チップ/シート)用に、有効マイフィードを件数付きで返す。
 * 件数の集計があるため getUserFeeds とは別クエリだが、無効化タグ(userFeeds)は共通。
 */
export async function getUserFeedFilters(userId: UserId): Promise<UserFeedFilter[]> {
  'use cache';
  cacheTag(CACHE_TAGS.userFeeds(userId));
  cacheLife('hours');

  const result = await listUserFeedFilters({ feeds: userFeedRepo })({ userId });
  if (!result.ok) {
    logger.error('listUserFeedFilters failed', { error: result.error, userId });
    throw new Error('マイフィードの取得に失敗しました', { cause: result.error });
  }
  return result.value;
}
