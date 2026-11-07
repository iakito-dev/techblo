import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getFeed, getSummariesByArticleIds, loggerError } = vi.hoisted(() => ({
  getFeed: vi.fn(),
  getSummariesByArticleIds: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('@/features/feed/web/queries', () => ({ getFeed }));
vi.mock('@/features/ai-summary/web/queries', () => ({ getSummariesByArticleIds }));
vi.mock('@/lib/observability/logger', () => ({ logger: { error: loggerError } }));
vi.mock('@/lib/site-url', () => ({ resolveBaseUrl: () => 'https://example.test' }));

import { renderPublicFeed, xmlResponse } from './public-feed';

const article = (over: Record<string, unknown> = {}) => ({
  id: 'a1',
  title: '記事タイトル',
  url: 'https://blog.example.com/p/1',
  description: '元の説明',
  publishedAt: new Date('2026-06-01T00:00:00Z'),
  company: { name: 'ExampleCo', slug: 'example' },
  ...over,
});

describe('xmlResponse', () => {
  it('RSS の Content-Type とキャッシュヘッダを付ける', () => {
    const res = xmlResponse('<rss/>');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=600');
  });
});

describe('renderPublicFeed', () => {
  beforeEach(() => {
    getFeed.mockReset();
    getSummariesByArticleIds.mockReset();
    loggerError.mockReset();
    getFeed.mockResolvedValue({ items: [article()] });
    getSummariesByArticleIds.mockResolvedValue({});
  });

  it('全体フィードは新着順 50 件で取得し、絞り込みなしにする', async () => {
    const res = await renderPublicFeed({});
    expect(getFeed).toHaveBeenCalledWith({
      sort: 'latest',
      limit: 50,
      companyIds: undefined,
      category: undefined,
      tag: undefined,
    });
    const xml = await res.text();
    expect(xml).toContain('<title>技術ブログ新着｜テクブロ</title>');
    expect(xml).toContain('https://example.test/a/a1');
  });

  it('AI要約があれば description と tags を優先する', async () => {
    getSummariesByArticleIds.mockResolvedValue({ a1: { overview: '要約です', tags: ['Go'] } });
    const xml = await (await renderPublicFeed({})).text();
    expect(xml).toContain('要約です');
    expect(xml).not.toContain('元の説明');
    expect(xml).toContain('Go');
  });

  it('企業フィードは companyIds で絞り、企業用の URL・タイトルにする', async () => {
    const xml = await (
      await renderPublicFeed({ company: { id: 'c1', slug: 'example', name: 'ExampleCo' } })
    ).text();
    expect(getFeed).toHaveBeenCalledWith(expect.objectContaining({ companyIds: ['c1'] }));
    expect(xml).toContain('ExampleCoの技術ブログ新着｜テクブロ');
    expect(xml).toContain('https://example.test/companies/example/feed.xml');
  });

  it('不正なカテゴリは無視し、正しいカテゴリは絞り込みと selfUrl に反映する', async () => {
    await renderPublicFeed({ category: 'not-a-category' });
    expect(getFeed).toHaveBeenLastCalledWith(expect.objectContaining({ category: undefined }));

    const xml = await (await renderPublicFeed({ category: 'ai' })).text();
    expect(getFeed).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'ai' }));
    expect(xml).toContain('feed.xml?category=ai');
  });

  it('tag は trim し、空白のみ・51 文字以上は無視する', async () => {
    await renderPublicFeed({ tag: '  React  ' });
    expect(getFeed).toHaveBeenLastCalledWith(expect.objectContaining({ tag: 'React' }));

    await renderPublicFeed({ tag: '   ' });
    expect(getFeed).toHaveBeenLastCalledWith(expect.objectContaining({ tag: undefined }));

    await renderPublicFeed({ tag: 'x'.repeat(51) });
    expect(getFeed).toHaveBeenLastCalledWith(expect.objectContaining({ tag: undefined }));

    await renderPublicFeed({ tag: 'x'.repeat(50) });
    expect(getFeed).toHaveBeenLastCalledWith(expect.objectContaining({ tag: 'x'.repeat(50) }));
  });

  it('記事が 0 件でも有効な XML を返す', async () => {
    getFeed.mockResolvedValue({ items: [] });
    const res = await renderPublicFeed({});
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<channel>');
  });

  it('取得に失敗したら 500 を返しログに残す', async () => {
    getFeed.mockRejectedValue(new Error('db down'));
    const res = await renderPublicFeed({ tag: 'Go' });
    expect(res.status).toBe(500);
    expect(loggerError).toHaveBeenCalledOnce();
  });
});
