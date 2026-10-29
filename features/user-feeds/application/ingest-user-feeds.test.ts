import { describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';
import { asUserFeedId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';
import type { FeedFetcher } from './feed-fetcher';
import { ingestUserFeeds } from './ingest-user-feeds';

const a = { id: asUserFeedId('a'), rssUrl: 'https://a.example/rss' };
const b = { id: asUserFeedId('b'), rssUrl: 'https://b.example/rss' };

function setup(
  feedList: (typeof a)[],
  fetchFeed: FeedFetcher,
  upsert = vi.fn().mockResolvedValue(2),
) {
  const recordSuccess = vi.fn().mockResolvedValue(undefined);
  const recordFailure = vi.fn().mockResolvedValue(undefined);
  const feeds = {
    listAllEnabled: vi.fn().mockResolvedValue(feedList),
    upsertArticles: upsert,
    recordSuccess,
    recordFailure,
  } as unknown as UserFeedRepository;
  return { feeds, fetchFeed, recordSuccess, recordFailure, upsert };
}

describe('ingestUserFeeds', () => {
  it('有効なフィードが無ければ何もせず空配列を返す', async () => {
    const fetchFeed = vi.fn() as unknown as FeedFetcher;
    const s = setup([], fetchFeed);
    expect(await ingestUserFeeds(s)()).toEqual([]);
    expect(fetchFeed).not.toHaveBeenCalled();
  });

  it('成功したフィードは upsert して成功を記録し、追加件数を返す', async () => {
    const fetchFeed = vi.fn().mockResolvedValue(ok({ articles: [] })) as unknown as FeedFetcher;
    const s = setup([a], fetchFeed);
    expect(await ingestUserFeeds(s)()).toEqual([{ id: a.id, ok: true, added: 2 }]);
    expect(s.recordSuccess).toHaveBeenCalledExactlyOnceWith(a.id);
  });

  it('1件の取得失敗は理由を記録するだけで、他のフィードの取り込みを止めない', async () => {
    const fetchFeed = vi.fn(async (url: string) =>
      url === a.rssUrl ? err('404') : ok({ articles: [] }),
    ) as unknown as FeedFetcher;
    const s = setup([a, b], fetchFeed);
    expect(await ingestUserFeeds(s)()).toEqual([
      { id: a.id, ok: false, added: 0, error: '404' },
      { id: b.id, ok: true, added: 2 },
    ]);
    expect(s.recordFailure).toHaveBeenCalledExactlyOnceWith(a.id, '404');
    expect(s.recordSuccess).toHaveBeenCalledExactlyOnceWith(b.id);
  });

  it('例外で落ちたフィードも失敗として返し、他は成功のまま', async () => {
    const upsert = vi.fn(async (id: string) => {
      if (id === a.id) throw new Error('db down');
      return 1;
    });
    const fetchFeed = vi.fn().mockResolvedValue(ok({ articles: [] })) as unknown as FeedFetcher;
    const s = setup([a, b], fetchFeed, upsert);
    expect(await ingestUserFeeds(s)()).toEqual([
      { id: a.id, ok: false, added: 0, error: 'db down' },
      { id: b.id, ok: true, added: 1 },
    ]);
  });
});
