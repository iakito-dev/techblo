import { describe, expect, it, vi } from 'vitest';
import { asArticleId, asUserId } from '@/shared/type-utils';
import type { ReadRepository } from '../domain/read-repository';
import { mergeGuestReads } from './merge-guest-reads';

function fakeRepo(): ReadRepository {
  return { markRead: vi.fn(), addMany: vi.fn(), listRecent: vi.fn() };
}

describe('mergeGuestReads', () => {
  it('渡された ID で addMany を呼び、merged 件数を返す', async () => {
    const repo = fakeRepo();
    const userId = asUserId('u1');
    const articleIds = [asArticleId('a1'), asArticleId('a2')];
    const result = await mergeGuestReads({ reads: repo })({ userId, articleIds });
    expect(repo.addMany).toHaveBeenCalledWith(userId, articleIds);
    expect(result).toEqual({ ok: true, value: { merged: 2 } });
  });

  it('空配列でも addMany を呼び merged=0 を返す', async () => {
    const repo = fakeRepo();
    const result = await mergeGuestReads({ reads: repo })({
      userId: asUserId('u1'),
      articleIds: [],
    });
    expect(repo.addMany).toHaveBeenCalledWith(asUserId('u1'), []);
    expect(result).toEqual({ ok: true, value: { merged: 0 } });
  });
});
