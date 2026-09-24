import { afterEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';
import { safeFetch, type UrlGuard } from './fetcher';

const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });

/** 内部アドレス(このテストでは internal.test)だけを拒否するガード。 */
const guard: UrlGuard = async (url) =>
  new URL(url).hostname === 'internal.test' ? err('到達できないホストです') : ok(url);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('safeFetch guardUrl', () => {
  it('リダイレクト先が内部宛てなら追従せず拒否する', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(redirect('http://internal.test/latest'));
    vi.stubGlobal('fetch', fetchMock);

    const res = await safeFetch('https://public.test/feed', { guardUrl: guard, retries: 0 });

    expect(res).toEqual(err('到達できないホストです'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' });
  });

  it('公開ホストへの相対リダイレクトは検証して辿る', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect('/rss.xml'))
      .mockResolvedValueOnce(new Response('<rss/>', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await safeFetch('https://public.test/feed', { guardUrl: guard, retries: 0 });

    expect(res.ok).toBe(true);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://public.test/rss.xml');
  });

  it('リダイレクトが上限を超えたら拒否する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => redirect('https://public.test/loop')),
    );

    const res = await safeFetch('https://public.test/feed', { guardUrl: guard, retries: 0 });

    expect(res).toEqual(err('リダイレクトが多すぎます'));
  });

  it('初回 URL がガードで拒否されたら fetch しない', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await safeFetch('http://internal.test/', { guardUrl: guard });

    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
