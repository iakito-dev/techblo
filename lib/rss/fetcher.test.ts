import { afterEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';
import { fetchFeed } from './fetcher';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchFeed', () => {
  it('取得できた XML をそのまま返し、フィード向けの Accept ヘッダーを付ける', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('<rss></rss>', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchFeed('https://example.test/feed');

    expect(res).toEqual(ok('<rss></rss>'));
    const init = fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> };
    expect(init.headers.Accept).toContain('application/rss+xml');
  });

  it('本文が空白だけなら empty response body として失敗する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('  \n ', { status: 200 })));

    expect(await fetchFeed('https://example.test/feed')).toEqual(err('empty response body'));
  });

  it('guardUrl が拒否した URL は取得せず失敗を返す', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchFeed('http://internal.test/feed', {
      guardUrl: async () => err('到達できないホストです'),
    });

    expect(res).toEqual(err('到達できないホストです'));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
