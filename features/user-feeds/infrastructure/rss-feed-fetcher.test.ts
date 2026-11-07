import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';

const h = vi.hoisted(() => ({
  assertPublicHttpUrl: vi.fn(),
  fetchFeed: vi.fn(),
  parseFeed: vi.fn(),
  parseFeedMeta: vi.fn(),
}));

vi.mock('@/lib/http/safe-url', () => ({ assertPublicHttpUrl: h.assertPublicHttpUrl }));
vi.mock('@/lib/rss/fetcher', () => ({ fetchFeed: h.fetchFeed }));
vi.mock('@/lib/rss/parser', () => ({ parseFeed: h.parseFeed, parseFeedMeta: h.parseFeedMeta }));

const { rssFeedFetcher } = await import('./rss-feed-fetcher');

const URL_IN = 'https://blog.example/feed';
const article = { url: 'https://blog.example/p/1', title: 't' };

beforeEach(() => {
  vi.resetAllMocks();
  h.assertPublicHttpUrl.mockResolvedValue(ok(URL_IN));
  h.fetchFeed.mockResolvedValue(ok('<rss/>'));
  h.parseFeed.mockReturnValue(ok([article]));
  h.parseFeedMeta.mockReturnValue({ title: 'Blog', siteUrl: 'https://blog.example' });
});

describe('rssFeedFetcher', () => {
  it('検証 → 取得 → パースを通し、タイトル・サイト URL・記事を返す', async () => {
    const res = await rssFeedFetcher(URL_IN);

    expect(res).toEqual(
      ok({ title: 'Blog', siteUrl: 'https://blog.example', articles: [article] }),
    );
    // リダイレクト先も同じガードで検証させる
    expect(h.fetchFeed).toHaveBeenCalledWith(URL_IN, { guardUrl: h.assertPublicHttpUrl });
  });

  it('URL が不正なら取得せず、検証のエラー文言をそのまま返す', async () => {
    h.assertPublicHttpUrl.mockResolvedValue(err('公開ホストのみ登録できます'));

    expect(await rssFeedFetcher('http://localhost/feed')).toEqual(
      err('公開ホストのみ登録できます'),
    );
    expect(h.fetchFeed).not.toHaveBeenCalled();
  });

  it('取得失敗は原因を添えたユーザー向け文言にする', async () => {
    h.fetchFeed.mockResolvedValue(err('HTTP 404'));

    expect(await rssFeedFetcher(URL_IN)).toEqual(err('フィードを取得できませんでした(HTTP 404)'));
  });

  it('パース失敗・記事 0 件はそれぞれ別の文言で失敗する', async () => {
    h.parseFeed.mockReturnValueOnce(err('bad xml'));
    expect(await rssFeedFetcher(URL_IN)).toEqual(err('RSS / Atom として解析できませんでした'));

    h.parseFeed.mockReturnValueOnce(ok([]));
    expect(await rssFeedFetcher(URL_IN)).toEqual(err('記事が1件も見つかりませんでした'));
  });
});
