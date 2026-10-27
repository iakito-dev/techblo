import { describe, expect, it, vi } from 'vitest';
import { asArticleId } from '@/shared/type-utils';
import type { ArticleRepository } from '../domain/article-repository';
import { trackView } from './track-view';

describe('trackView', () => {
  it('記事 ID を ArticleId にして incrementView を1回呼び、ok を返す', async () => {
    const articles = { incrementView: vi.fn() } as unknown as ArticleRepository;
    const result = await trackView({ articles })({ articleId: 'a1' });
    expect(articles.incrementView).toHaveBeenCalledExactlyOnceWith(asArticleId('a1'));
    expect(result).toEqual({ ok: true, value: undefined });
  });
});
