import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { UserId } from '@/shared/type-utils';
import type { ReadRepository } from '../domain/read-repository';
import type { ReadHistoryEntryDto } from './dto';

/** 閲覧履歴に出す件数の上限。既読は全記事に及びうるので一覧は直近分に限る(ADR-0041)。 */
export const READ_HISTORY_LIMIT = 100;

/**
 * 直近に読んだ記事(新しい順)。依存は引数注入(DB なしで単体テスト可)。
 */
export const listRecentReads =
  (deps: { reads: ReadRepository }) =>
  async ({ userId }: { userId: UserId }): Promise<Result<ReadHistoryEntryDto[], CommonError>> => {
    const entries = await deps.reads.listRecent(userId, READ_HISTORY_LIMIT);
    return ok(entries.map((e) => ({ articleId: e.articleId, readAt: e.readAt.toISOString() })));
  };
