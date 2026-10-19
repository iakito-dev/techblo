import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { ArticleId, UserId } from '@/shared/type-utils';
import type { ReadRepository } from '../domain/read-repository';

/**
 * 記事を既読にする(記事ページに着地したタイミングで呼ぶ)。冪等(再閲覧は readAt の更新のみ)。
 * 依存は引数注入(DB なしで単体テスト可)。
 */
export const markRead =
  (deps: { reads: ReadRepository }) =>
  async ({
    userId,
    articleId,
  }: {
    userId: UserId;
    articleId: ArticleId;
  }): Promise<Result<{ read: true }, CommonError>> => {
    await deps.reads.markRead(userId, articleId);
    return ok({ read: true });
  };
