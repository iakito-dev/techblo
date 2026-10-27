import { describe, expect, it, vi } from 'vitest';
import { asCompanyId } from '@/shared/type-utils';
import type { ArticleRepository } from '../domain/article-repository';
import { countByCategory } from './count-by-category';

describe('countByCategory', () => {
  it('companyIds をそのまま Repository に渡し、結果を ok で包む', async () => {
    const counts = { backend: 3, frontend: 1 };
    const articles = {
      countByCategory: vi.fn().mockResolvedValue(counts),
    } as unknown as ArticleRepository;
    const ids = [asCompanyId('c1')];
    const result = await countByCategory({ articles })(ids);
    expect(articles.countByCategory).toHaveBeenCalledExactlyOnceWith(ids);
    expect(result).toEqual({ ok: true, value: counts });
  });

  it('companyIds 省略時は undefined を渡す', async () => {
    const articles = {
      countByCategory: vi.fn().mockResolvedValue({}),
    } as unknown as ArticleRepository;
    await countByCategory({ articles })();
    expect(articles.countByCategory).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});
