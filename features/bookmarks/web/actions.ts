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
import { mergeGuestBookmarks } from '../application/merge-guest-bookmarks';
import { setBookmark } from '../application/set-bookmark';
import { DrizzleBookmarkRepository } from '../infrastructure/drizzle-bookmark-repository';

const bookmarkRepo = new DrizzleBookmarkRepository(db);

/**
 * ブックマークの保存/解除 Server Action。
 * セッションは features 間 import を避けるため lib/auth から直接取得(ADR-0002)。
 */
export async function setBookmarkAction(input: {
  articleId: string;
  bookmarked: boolean;
}): Promise<Result<{ bookmarked: boolean }, CommonError>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return err({ kind: 'UNAUTHORIZED' });

  const result = await setBookmark({ bookmarks: bookmarkRepo })({
    userId: asUserId(session.user.id),
    articleId: asArticleId(input.articleId),
    bookmarked: input.bookmarked,
  });

  if (!result.ok) {
    logger.error('setBookmark failed', {
      error: result.error,
      userId: session.user.id,
      articleId: input.articleId,
    });
    return result;
  }

  // トップフィードはユーザータグで無効化し、ゲスト共通の feed キャッシュを巻き添えにしない
  updateTag(CACHE_TAGS.userBookmarks(asUserId(session.user.id)));
  revalidatePath('/bookmarks');
  return result;
}

/**
 * ゲスト(localStorage)のブックマークをログイン後に DB へ一括マージする Server Action。
 * 実在しない article ID は呼び出し側(components/article)で除外済みの前提(FK 安全・ADR-0017)。
 * 冪等なので二重実行されても重複しない。
 */
export async function migrateGuestBookmarks(
  articleIds: string[],
): Promise<Result<{ merged: number }, CommonError>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return err({ kind: 'UNAUTHORIZED' });
  if (articleIds.length === 0) return ok({ merged: 0 });

  const userId = asUserId(session.user.id);
  const result = await mergeGuestBookmarks({ bookmarks: bookmarkRepo })({
    userId,
    articleIds: articleIds.map(asArticleId),
  });

  if (!result.ok) {
    logger.error('mergeGuestBookmarks failed', { error: result.error, userId: session.user.id });
    return result;
  }

  updateTag(CACHE_TAGS.userBookmarks(userId));
  revalidatePath('/bookmarks');
  return result;
}
