import { describe, expect, it, vi } from 'vitest';
import { asArticleId, asUserId } from '@/shared/type-utils';
import type { ReadRepository } from '../domain/read-repository';
import { removeRead } from './remove-read';

function fakeRepo(): ReadRepository {
  return { markRead: vi.fn(), addMany: vi.fn(), listRecent: vi.fn(), remove: vi.fn() };
}

describe('removeRead', () => {
  it('Repository.remove を呼び removed=true を返す', async () => {
    const repo = fakeRepo();
    const userId = asUserId('u1');
    const articleId = asArticleId('a1');
    const result = await removeRead({ reads: repo })({ userId, articleId });
    expect(repo.remove).toHaveBeenCalledWith(userId, articleId);
    expect(result).toEqual({ ok: true, value: { removed: true } });
  });

  it('既読でない記事を削除しても成功する(冪等性は Repository に委ねる)', async () => {
    const repo = fakeRepo();
    const input = { userId: asUserId('u1'), articleId: asArticleId('a1') };
    await removeRead({ reads: repo })(input);
    const result = await removeRead({ reads: repo })(input);
    expect(repo.remove).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });
});
