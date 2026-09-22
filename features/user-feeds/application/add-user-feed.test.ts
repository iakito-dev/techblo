import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';
import { asUserFeedId, asUserId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';
import { addUserFeed } from './add-user-feed';
import { MAX_FEEDS_PER_USER } from './errors';
import type { FeedFetcher } from './feed-fetcher';

const userId = asUserId('user-1');

function makeRepo(overrides: Partial<UserFeedRepository> = {}): UserFeedRepository {
  return {
    listByUser: vi.fn().mockResolvedValue([]),
    listEnabledIds: vi.fn().mockResolvedValue([]),
    listFiltersByUser: vi.fn().mockResolvedValue([]),
    listAllEnabled: vi.fn().mockResolvedValue([]),
    countByUser: vi.fn().mockResolvedValue(0),
    existsByUrl: vi.fn().mockResolvedValue(false),
    add: vi.fn().mockResolvedValue({ id: asUserFeedId('feed-1') }),
    setEnabled: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    upsertArticles: vi.fn().mockResolvedValue(3),
    recordSuccess: vi.fn().mockResolvedValue(undefined),
    recordFailure: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const okFetcher: FeedFetcher = async () =>
  ok({ title: 'Example Blog', siteUrl: 'https://example.com', articles: [] });

describe('addUserFeed', () => {
  it('取得成功でフィードと記事を保存し、新着数を返す', async () => {
    const repo = makeRepo();
    const result = await addUserFeed({ feeds: repo, fetchFeed: okFetcher })({
      userId,
      rssUrl: 'https://example.com/feed.xml',
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.added).toBe(3);
    expect(repo.add).toHaveBeenCalledWith(userId, {
      rssUrl: 'https://example.com/feed.xml',
      title: 'Example Blog',
      siteUrl: 'https://example.com',
    });
    expect(repo.recordSuccess).toHaveBeenCalled();
  });

  it('タイトル取得不能ならホスト名で代替する', async () => {
    const repo = makeRepo();
    const fetcher: FeedFetcher = async () => ok({ title: null, siteUrl: null, articles: [] });
    await addUserFeed({ feeds: repo, fetchFeed: fetcher })({
      userId,
      rssUrl: 'https://blog.example.co.jp/rss',
    });

    expect(repo.add).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ title: 'blog.example.co.jp' }),
    );
  });

  it('不正な URL は VALIDATION で弾き、取得しない', async () => {
    const repo = makeRepo();
    const fetchFeed = vi.fn();
    const result = await addUserFeed({
      feeds: repo,
      fetchFeed: fetchFeed as unknown as FeedFetcher,
    })({ userId, rssUrl: 'not-a-url' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('VALIDATION');
    expect(fetchFeed).not.toHaveBeenCalled();
  });

  it('上限に達していたら LIMIT_EXCEEDED', async () => {
    const repo = makeRepo({ countByUser: vi.fn().mockResolvedValue(MAX_FEEDS_PER_USER) });
    const result = await addUserFeed({ feeds: repo, fetchFeed: okFetcher })({
      userId,
      rssUrl: 'https://example.com/feed.xml',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('LIMIT_EXCEEDED');
    expect(repo.add).not.toHaveBeenCalled();
  });

  it('登録済みの URL は DUPLICATE', async () => {
    const repo = makeRepo({ existsByUrl: vi.fn().mockResolvedValue(true) });
    const result = await addUserFeed({ feeds: repo, fetchFeed: okFetcher })({
      userId,
      rssUrl: 'https://example.com/feed.xml',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('DUPLICATE');
    expect(repo.add).not.toHaveBeenCalled();
  });

  it('取得失敗時はフィードを作らず FETCH_FAILED', async () => {
    const repo = makeRepo();
    const fetcher: FeedFetcher = async () => err('到達できないホストです');
    const result = await addUserFeed({ feeds: repo, fetchFeed: fetcher })({
      userId,
      rssUrl: 'https://example.com/feed.xml',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('FETCH_FAILED');
      if (result.error.kind === 'FETCH_FAILED') expect(result.error.message).toContain('到達');
    }
    expect(repo.add).not.toHaveBeenCalled();
  });
});
