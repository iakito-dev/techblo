import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { ArticleId, UserId } from '@/shared/type-utils';
import type { ReadRepository } from '../domain/read-repository';

/**
 * 記事を閲覧履歴から削除する(= 既読を外す。ADR-0049)。冪等(既読でなくても成功)。
 * 依存は引数注入(DB なしで単体テスト可)。
 */
export const removeRead =
  (deps: { reads: ReadRepository }) =>
  async ({
    userId,
    articleId,
  }: {
    userId: UserId;
    articleId: ArticleId;
  }): Promise<Result<{ removed: true }, CommonError>> => {
    await deps.reads.remove(userId, articleId);
    return ok({ removed: true });
  };
