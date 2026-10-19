import { db } from '@/db/client';
import { logger } from '@/lib/observability/logger';
import type { UserId } from '@/shared/type-utils';
import type { ReadHistoryEntryDto } from '../application/dto';
import { listRecentReads } from '../application/list-recent-reads';
import { DrizzleReadRepository } from '../infrastructure/drizzle-read-repository';

/**
 * RSC が呼ぶ composition root。Server Component / Server Action からのみ import すること。
 */
const readRepo = new DrizzleReadRepository(db);

/**
 * 閲覧履歴(直近に読んだ記事、新しい順)。
 *
 * 'use cache' しない: markReadAction は userReads を revalidateTag(…, 'max')(stale-while-revalidate)で
 * 無効化するため、キャッシュすると「今読んだ記事が履歴の次の表示に出ない」。上限件数付きの
 * 単一ユーザー絞り込みで軽いので、毎回引く(ADR-0041)。
 */
export async function getRecentReads(userId: UserId): Promise<ReadHistoryEntryDto[]> {
  const result = await listRecentReads({ reads: readRepo })({ userId });
  if (!result.ok) {
    logger.error('listRecentReads failed', { error: result.error, userId });
    throw new Error('閲覧履歴の取得に失敗しました', { cause: result.error });
  }
  return result.value;
}
