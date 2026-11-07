import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';
import { asUserFeedId, asUserId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';
import type { FeedFetcher } from './feed-fetcher';
import { refreshUserFeed } from './refresh-user-feed';

const userId = asUserId('user-1');
const id = asUserFeedId('feed-1');
const feed = { id, rssUrl: 'https://example.com/rss.xml' };

function setup(opts: { found?: boolean; fetched: Awaited<ReturnType<FeedFetcher>> }) {
  const findById = vi.fn().mockResolvedValue(opts.found === false ? null : feed);
  const upsertArticles = vi.fn().mockResolvedValue(3);
  const recordSuccess = vi.fn().mockResolvedValue(undefined);
  const recordFailure = vi.fn().mockResolvedValue(undefined);
  const feeds = {
    findById,
    upsertArticles,
    recordSuccess,
    recordFailure,
  } as unknown as UserFeedRepository;
  const fetchFeed = vi.fn().mockResolvedValue(opts.fetched) as unknown as FeedFetcher;
  return { feeds, fetchFeed, findById, upsertArticles, recordSuccess, recordFailure };
}

describe('refreshUserFeed', () => {
  it('所有者のフィードが無ければ NOT_FOUND を返し、取得もしない', async () => {
    const s = setup({ found: false, fetched: ok({ articles: [] }) as never });
    const result = await refreshUserFeed(s)({ userId, id });
    expect(result).toEqual({ ok: false, error: { kind: 'NOT_FOUND' } });
    expect(s.findById).toHaveBeenCalledExactlyOnceWith(userId, id);
    expect(s.fetchFeed).not.toHaveBeenCalled();
  });

  it('取得に失敗したらフィードは消さず recordFailure で理由を残し INTERNAL を返す', async () => {
    const s = setup({ fetched: err('timeout') as never });
    const result = await refreshUserFeed(s)({ userId, id });
    expect(result).toEqual({ ok: false, error: { kind: 'INTERNAL', cause: 'timeout' } });
    expect(s.recordFailure).toHaveBeenCalledExactlyOnceWith(id, 'timeout');
    expect(s.upsertArticles).not.toHaveBeenCalled();
    expect(s.recordSuccess).not.toHaveBeenCalled();
  });

  it('取得に成功したら記事を upsert し、追加件数を返して成功を記録する', async () => {
    const articles = [{ title: 'a' }];
    const s = setup({ fetched: ok({ articles }) as never });
    const result = await refreshUserFeed(s)({ userId, id });
    expect(s.upsertArticles).toHaveBeenCalledExactlyOnceWith(id, articles);
    expect(s.recordSuccess).toHaveBeenCalledExactlyOnceWith(id);
    expect(s.recordFailure).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, value: { added: 3 } });
  });
});
