import { describe, expect, it } from 'vitest';
import { asArticleId, asCompanyId } from '@/shared/type-utils';
import type { Article } from '../domain/article';
import { toArticleCard } from './dto';

const article: Article = {
  id: asArticleId('article-1'),
  url: 'https://example.com/article-1',
  title: '記事タイトル',
  description: '記事の抜粋',
  ogImage: null,
  author: 'author',
  publishedAt: new Date(2026, 0, 1, 12, 0, 0),
  counts: { view: 12, bookmark: 3, favorite: 2, hatena: 42 },
  company: {
    id: asCompanyId('company-1'),
    slug: 'example',
    name: 'Example Tech',
    brandColor: '#2563eb',
  },
};

describe('toArticleCard', () => {
  it('はてなブックマーク数をカード表示DTOへ渡す', () => {
    expect(toArticleCard(article).hatenaBookmarkCount).toBe(42);
  });
});
