import { afterEach, describe, expect, it, vi } from 'vitest';
import { isErr, isOk } from '@/shared/result';
import { fetchBookmarkCounts } from './count-client';

function mockFetchOnce(json: Record<string, number | null>) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => json,
  } as unknown as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchBookmarkCounts', () => {
  it('空配列はフェッチせず空 Map を返す', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const result = await fetchBookmarkCounts([]);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) expect(result.value.size).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('url→count の Map を返し、null(0ブックマーク)は除外する', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchOnce({
        'https://example.com/a': 42,
        'https://example.com/b': null,
      }),
    );
    const result = await fetchBookmarkCounts(['https://example.com/a', 'https://example.com/b']);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.get('https://example.com/a')).toBe(42);
      expect(result.value.has('https://example.com/b')).toBe(false);
    }
  });

  it('50件超は複数バッチに分割して呼ぶ', async () => {
    const urls = Array.from({ length: 120 }, (_, i) => `https://example.com/${i}`);
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as unknown as Response);
    vi.stubGlobal('fetch', spy);

    await fetchBookmarkCounts(urls);
    // 120 / 50 = 3 バッチ
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('全バッチ失敗時は err を返す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const result = await fetchBookmarkCounts(['https://example.com/a']);
    expect(isErr(result)).toBe(true);
  });
});
