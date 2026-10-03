import { afterEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';
import { readTextWithLimit, safeFetch, type UrlGuard } from './fetcher';

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

describe('readTextWithLimit', () => {
  /** content-length を付けずにチャンクで流すレスポンス(実際の読み込みバイト数で打ち切れるかを見る)。 */
  const streamed = (...chunks: string[]) =>
    new Response(
      new ReadableStream({
        start(controller) {
          for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
          controller.close();
        },
      }),
    );

  it('上限以内ならテキストを返す(マルチバイトがチャンク境界で割れても復元する)', async () => {
    const bytes = new TextEncoder().encode('テック');
    const res = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(bytes.slice(0, 4));
          controller.enqueue(bytes.slice(4));
          controller.close();
        },
      }),
    );

    expect(await readTextWithLimit(res, 1024)).toEqual(ok('テック'));
  });

  it('content-length が上限を超えていれば読まずに拒否する', async () => {
    const res = new Response('x', { headers: { 'content-length': String(10 * 1024 * 1024) } });

    const result = await readTextWithLimit(res, 1024 * 1024);

    expect(result.ok).toBe(false);
  });

  it('content-length が無くても読み込み中に上限を超えたら打ち切る', async () => {
    const result = await readTextWithLimit(streamed('a'.repeat(600), 'b'.repeat(600)), 1000);

    expect(result.ok).toBe(false);
  });
});
