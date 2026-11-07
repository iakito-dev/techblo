import { describe, expect, it } from 'vitest';
import { type ArticleRow, toArticle } from './article-mapper';

const row: ArticleRow = {
  id: 'art-1',
  url: 'https://example.test/p/1',
  title: 'タイトル',
  description: null,
  ogImage: null,
  author: 'alice',
  publishedAt: new Date('2026-01-02T03:04:05Z'),
  viewCount: 1,
  bookmarkCount: 2,
  favoriteCount: 3,
  hatenaBookmarkCount: 4,
  companyId: 'co-1',
  companySlug: 'acme',
  companyName: 'Acme',
  companyBrandColor: '#112233',
};

describe('toArticle', () => {
  it('DB 行をドメインの Article にマップし、カウント列を counts にまとめる', () => {
    expect(toArticle(row)).toEqual({
      id: 'art-1',
      url: 'https://example.test/p/1',
      title: 'タイトル',
      description: null,
      ogImage: null,
      author: 'alice',
      publishedAt: new Date('2026-01-02T03:04:05Z'),
      counts: { view: 1, bookmark: 2, favorite: 3, hatena: 4 },
      company: { id: 'co-1', slug: 'acme', name: 'Acme', brandColor: '#112233' },
    });
  });

  it('null の description / ogImage / author はそのまま null で通す', () => {
    const a = toArticle({ ...row, description: null, ogImage: null, author: null });
    expect([a.description, a.ogImage, a.author]).toEqual([null, null, null]);
  });
});
