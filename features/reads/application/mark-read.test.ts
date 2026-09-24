import { describe, expect, it, vi } from 'vitest';
import { asArticleId, asUserId } from '@/shared/type-utils';
import type { ReadRepository } from '../domain/read-repository';
import { markRead } from './mark-read';

function fakeRepo(): ReadRepository {
  return { markRead: vi.fn(), addMany: vi.fn() };
}

describe('markRead', () => {
  it('Repository.markRead を呼び read=true を返す', async () => {
    const repo = fakeRepo();
    const userId = asUserId('u1');
    const articleId = asArticleId('a1');
    const result = await markRead({ reads: repo })({ userId, articleId });
    expect(repo.markRead).toHaveBeenCalledWith(userId, articleId);
    expect(result).toEqual({ ok: true, value: { read: true } });
  });

  it('同じ記事を2回既読にしても成功する(冪等性は Repository に委ねる)', async () => {
    const repo = fakeRepo();
    const input = { userId: asUserId('u1'), articleId: asArticleId('a1') };
    await markRead({ reads: repo })(input);
    const result = await markRead({ reads: repo })(input);
    expect(repo.markRead).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });
});
