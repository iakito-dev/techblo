import { describe, expect, it, vi } from 'vitest';
import { asUserFeedId, asUserId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';
import { listUserFeedFilters } from './list-user-feed-filters';

const userId = asUserId('user-1');

describe('listUserFeedFilters', () => {
  it('有効フィードを記事件数付きのフィルタ項目として返す', async () => {
    const rows = [
      { id: asUserFeedId('feed-1'), title: 'A', siteUrl: 'https://a.example', articleCount: 3 },
      { id: asUserFeedId('feed-2'), title: 'B', siteUrl: null, articleCount: 0 },
    ];
    const listFiltersByUser = vi.fn().mockResolvedValue(rows);
    const feeds = { listFiltersByUser } as unknown as UserFeedRepository;
    const result = await listUserFeedFilters({ feeds })({ userId });
    expect(listFiltersByUser).toHaveBeenCalledExactlyOnceWith(userId);
    expect(result).toEqual({ ok: true, value: rows });
  });
});
