'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { headers } from 'next/headers';
import { db } from '@/db/client';
import { auth } from '@/lib/auth';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { logger } from '@/lib/observability/logger';
import { err, ok, type Result } from '@/shared/result';
import { asUserFeedId, asUserId, type UserId } from '@/shared/type-utils';
import { addUserFeed } from '../application/add-user-feed';
import type { AddUserFeedError } from '../application/errors';
import { refreshUserFeed } from '../application/refresh-user-feed';
import { removeUserFeed } from '../application/remove-user-feed';
import { toggleUserFeed } from '../application/toggle-user-feed';
import { DrizzleUserFeedRepository } from '../infrastructure/drizzle-user-feed-repository';
import { rssFeedFetcher } from '../infrastructure/rss-feed-fetcher';

const userFeedRepo = new DrizzleUserFeedRepository(db);

/** クライアントに返すシリアライズ可能なエラー(トースト用文言)。 */
type ActionError = { message: string };

/**
 * マイフィード変更後のキャッシュ無効化。
 * userFeeds タグはメインフィードのマージ版(getMergedFeed)と設定一覧(getUserFeeds)の両方に付くため、
 * これ1つで「フィードへの反映」と「設定画面の更新」が揃う。
 */
function revalidateUserFeeds(userId: UserId): void {
  updateTag(CACHE_TAGS.userFeeds(userId));
  revalidatePath('/settings');
}

const messageForAddError = (e: AddUserFeedError): string => {
  switch (e.kind) {
    case 'VALIDATION':
      return e.message;
    case 'DUPLICATE':
      return 'このフィードはすでに登録されています';
    case 'LIMIT_EXCEEDED':
      return `登録できるフィードは最大 ${e.limit} 件です`;
    case 'FETCH_FAILED':
      return e.message;
  }
};

/** RSS を登録する(即時取得込み)。 */
export async function addUserFeedAction(
  rssUrl: string,
): Promise<Result<{ added: number }, ActionError>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return err({ message: 'ログインが必要です' });
  const userId = asUserId(session.user.id);

  const result = await addUserFeed({ feeds: userFeedRepo, fetchFeed: rssFeedFetcher })({
    userId,
    rssUrl,
  });
  if (!result.ok) {
    // 取得・解析失敗はユーザー入力起因なので warn 止まり(内部障害ではない)
    logger.warn('addUserFeed failed', { error: result.error, userId });
    return err({ message: messageForAddError(result.error) });
  }

  revalidateUserFeeds(userId);
  return ok({ added: result.value.added });
}

/** マイフィードの表示 ON/OFF を切り替える。 */
export async function toggleUserFeedAction(input: {
  id: string;
  enabled: boolean;
}): Promise<Result<{ enabled: boolean }, ActionError>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return err({ message: 'ログインが必要です' });
  const userId = asUserId(session.user.id);

  const result = await toggleUserFeed({ feeds: userFeedRepo })({
    userId,
    id: asUserFeedId(input.id),
    enabled: input.enabled,
  });
  if (!result.ok) {
    logger.error('toggleUserFeed failed', { error: result.error, userId, id: input.id });
    return err({ message: '更新に失敗しました' });
  }

  revalidateUserFeeds(userId);
  return ok(result.value);
}

/** マイフィードを削除する。 */
export async function removeUserFeedAction(id: string): Promise<Result<void, ActionError>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return err({ message: 'ログインが必要です' });
  const userId = asUserId(session.user.id);

  const result = await removeUserFeed({ feeds: userFeedRepo })({
    userId,
    id: asUserFeedId(id),
  });
  if (!result.ok) {
    logger.error('removeUserFeed failed', { error: result.error, userId, id });
    return err({ message: '削除に失敗しました' });
  }

  revalidateUserFeeds(userId);
  return ok(undefined);
}

/** マイフィードを手動更新する(最新記事を取り込む)。 */
export async function refreshUserFeedAction(
  id: string,
): Promise<Result<{ added: number }, ActionError>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return err({ message: 'ログインが必要です' });
  const userId = asUserId(session.user.id);

  const result = await refreshUserFeed({ feeds: userFeedRepo, fetchFeed: rssFeedFetcher })({
    userId,
    id: asUserFeedId(id),
  });
  if (!result.ok) {
    logger.warn('refreshUserFeed failed', { error: result.error, userId, id });
    return err({ message: '更新に失敗しました(フィードを取得できませんでした)' });
  }

  revalidateUserFeeds(userId);
  return ok({ added: result.value.added });
}
