import { describe, expect, it, vi } from 'vitest';
import { asUserFeedId, asUserId } from '@/shared/type-utils';
import type { UserFeed } from '../domain/user-feed';
import type { UserFeedRepository } from '../domain/user-feed-repository';
import { listUserFeeds } from './list-user-feeds';

const userId = asUserId('user-1');

describe('listUserFeeds', () => {
  it('登録フィードを設定画面用 DTO に変換して返す', async () => {
    const feed: UserFeed = {
      id: asUserFeedId('feed-1'),
      title: 'My Blog',
      rssUrl: 'https://example.com/feed.xml',
      siteUrl: 'https://example.com',
      enabled: false,
      lastFetchedAt: new Date('2026-01-01T00:00:00Z'),
      lastError: 'timeout',
    };
    const listByUser = vi.fn().mockResolvedValue([feed]);
    const feeds = { listByUser } as unknown as UserFeedRepository;
    const result = await listUserFeeds({ feeds })({ userId });
    expect(listByUser).toHaveBeenCalledExactlyOnceWith(userId);
    expect(result).toEqual({ ok: true, value: [{ ...feed }] });
  });

  it('登録が無ければ空配列', async () => {
    const feeds = { listByUser: vi.fn().mockResolvedValue([]) } as unknown as UserFeedRepository;
    expect(await listUserFeeds({ feeds })({ userId })).toEqual({ ok: true, value: [] });
  });
});
