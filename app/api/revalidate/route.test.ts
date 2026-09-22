import { beforeEach, describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.fn();

vi.mock('next/cache', () => ({
  revalidateTag,
}));

vi.mock('@/lib/env', () => ({
  env: { REVALIDATE_SECRET: '1234567890123456' },
}));

describe('/api/revalidate', () => {
  beforeEach(() => {
    revalidateTag.mockClear();
  });

  it('feed キャッシュを無効化する', async () => {
    const { POST } = await import('./route');

    const res = await POST(
      new Request('https://example.com/api/revalidate', {
        method: 'POST',
        headers: { authorization: 'Bearer 1234567890123456' },
      }),
    );

    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('feed', 'max');
  });

  it('articleIds が指定されたら記事単位キャッシュも無効化する', async () => {
    const { POST } = await import('./route');

    const res = await POST(
      new Request('https://example.com/api/revalidate', {
        method: 'POST',
        headers: {
          authorization: 'Bearer 1234567890123456',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ articleIds: ['a1', 'a2'] }),
      }),
    );

    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('article-a1', 'max');
    expect(revalidateTag).toHaveBeenCalledWith('article-a2', 'max');
  });
});
