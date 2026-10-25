'use server';

import { revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { db } from '@/db/client';
import { auth } from '@/lib/auth';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { logger } from '@/lib/observability/logger';
import type { CommonError } from '@/shared/error';
import { err, ok, type Result } from '@/shared/result';
import { asArticleId, asUserId } from '@/shared/type-utils';
import { markRead } from '../application/mark-read';
import { mergeGuestReads } from '../application/merge-guest-reads';
import { DrizzleReadRepository } from '../infrastructure/drizzle-read-repository';

const readRepo = new DrizzleReadRepository(db);

/**
 * 記事を既読にする Server Action(記事ページに着地した時に呼ぶ)。
 * セッションは features 間 import を避けるため lib/auth から直接取得(ADR-0002)。
 * 未ログインは no-op(ゲストは localStorage 側で記録する)。
 *
 * 無効化は revalidateTag(userReads, 'max') の遅延無効化を使う(updateTag ではない):
 * 記事を開くたびに現ルートを再フェッチさせない。未読フィルタ中に開いた記事は次のロードで
 * 落ちる(即座には消えない)が、開いた直後に消えるジャンクを避けられて UX 上もよい。
 */
export async function markReadAction(
  articleId: string,
): Promise<Result<{ read: boolean }, CommonError>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ok({ read: false });

  const userId = asUserId(session.user.id);
  const result = await markRead({ reads: readRepo })({
    userId,
    articleId: asArticleId(articleId),
  });

  if (!result.ok) {
    logger.error('markRead failed', { error: result.error, userId: session.user.id, articleId });
    return result;
  }

  revalidateTag(CACHE_TAGS.userReads(userId), 'max');
  return ok({ read: true });
}

/**
 * ゲスト(localStorage)の既読をログイン後に DB へ一括マージする Server Action。
 * 実在しない article ID は呼び出し側(app/_composition/article)で除外済みの前提(FK 安全・ADR-0017)。
 * 冪等なので二重実行されても重複しない。
 */
export async function migrateGuestReads(
  articleIds: string[],
): Promise<Result<{ merged: number }, CommonError>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return err({ kind: 'UNAUTHORIZED' });
  if (articleIds.length === 0) return ok({ merged: 0 });

  const userId = asUserId(session.user.id);
  const result = await mergeGuestReads({ reads: readRepo })({
    userId,
    articleIds: articleIds.map(asArticleId),
  });

  if (!result.ok) {
    logger.error('mergeGuestReads failed', { error: result.error, userId: session.user.id });
    return result;
  }

  revalidateTag(CACHE_TAGS.userReads(userId), 'max');
  return ok(result.value);
}
