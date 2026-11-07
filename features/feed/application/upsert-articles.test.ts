import { describe, expect, it, vi } from 'vitest';
import { asCompanyId } from '@/shared/type-utils';
import type { ArticleDraft } from '../domain/article';
import type { ArticleRepository } from '../domain/article-repository';
import { upsertArticles } from './upsert-articles';

describe('upsertArticles', () => {
  const items = [{ url: 'https://example.com/1' }] as unknown as ArticleDraft[];

  it('企業 ID を CompanyId にして upsertMany を呼び、保存件数を ok で返す', async () => {
    const articles = { upsertMany: vi.fn().mockResolvedValue(3) } as unknown as ArticleRepository;
    const result = await upsertArticles({ articles })('c1', items);
    expect(articles.upsertMany).toHaveBeenCalledExactlyOnceWith(asCompanyId('c1'), items);
    expect(result).toEqual({ ok: true, value: 3 });
  });

  it('Repository が Error を throw したら message を err で返す(throw しない)', async () => {
    const articles = {
      upsertMany: vi.fn().mockRejectedValue(new Error('db down')),
    } as unknown as ArticleRepository;
    const result = await upsertArticles({ articles })('c1', items);
    expect(result).toEqual({ ok: false, error: 'db down' });
  });

  it('Error 以外が throw されても文字列化して err で返す', async () => {
    const articles = {
      upsertMany: vi.fn().mockRejectedValue('boom'),
    } as unknown as ArticleRepository;
    const result = await upsertArticles({ articles })('c1', items);
    expect(result).toEqual({ ok: false, error: 'boom' });
  });
});
