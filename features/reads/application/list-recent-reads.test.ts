import { describe, expect, it, vi } from 'vitest';
import { asArticleId, asUserId } from '@/shared/type-utils';
import type { ReadRepository } from '../domain/read-repository';
import { listRecentReads, READ_HISTORY_LIMIT } from './list-recent-reads';

function fakeRepo(entries: Awaited<ReturnType<ReadRepository['listRecent']>> = []): ReadRepository {
  return { markRead: vi.fn(), addMany: vi.fn(), listRecent: vi.fn().mockResolvedValue(entries) };
}

describe('listRecentReads', () => {
  it('上限件数で Repository.listRecent を呼ぶ', async () => {
    const repo = fakeRepo();
    const userId = asUserId('u1');
    await listRecentReads({ reads: repo })({ userId });
    expect(repo.listRecent).toHaveBeenCalledWith(userId, READ_HISTORY_LIMIT);
  });

  it('readAt を ISO 文字列にし、Repository の並び順を保つ', async () => {
    const repo = fakeRepo([
      { articleId: asArticleId('a2'), readAt: new Date('2026-10-19T03:00:00.000Z') },
      { articleId: asArticleId('a1'), readAt: new Date('2026-10-18T12:00:00.000Z') },
    ]);
    const result = await listRecentReads({ reads: repo })({ userId: asUserId('u1') });
    expect(result).toEqual({
      ok: true,
      value: [
        { articleId: 'a2', readAt: '2026-10-19T03:00:00.000Z' },
        { articleId: 'a1', readAt: '2026-10-18T12:00:00.000Z' },
      ],
    });
  });
});
