import { describe, expect, it, vi } from 'vitest';
import { type ArticleId, asArticleId } from '@/shared/type-utils';
import type { ArticleSummary } from '../domain/article-summary';
import type { ArticleSummaryRepository } from '../domain/article-summary-repository';
import type { CategoryClassifier } from '../domain/category-classifier';
import { classifyPendingCategories } from './classify-pending-categories';

function fakeSummary(
  articleId: ArticleId,
  overrides: Partial<ArticleSummary> = {},
): ArticleSummary {
  return {
    articleId,
    overview: '概要',
    bullets: [{ heading: 'a', detail: 'aの説明です。' }],
    tags: ['AWS'],
    category: null,
    model: 'test',
    source: 'rss_excerpt',
    status: 'ready',
    generatedAt: new Date('2026-06-15T00:00:00Z'),
    ...overrides,
  };
}

function fakeRepo(
  ids: ArticleId[],
  summariesById: Map<ArticleId, ArticleSummary>,
): ArticleSummaryRepository {
  return {
    findByArticleId: vi.fn(async (id: ArticleId) => summariesById.get(id) ?? null),
    upsert: vi.fn(),
    listPendingArticleIds: vi.fn(),
    listUncategorizedArticleIds: vi.fn(async (limit: number) => ids.slice(0, limit)),
    updateCategory: vi.fn(),
  };
}

function fakeClassifier(impl: (input: { title: string }) => Promise<string>): CategoryClassifier {
  return { model: 'test', classify: vi.fn(impl) };
}

describe('classifyPendingCategories', () => {
  it('未分類記事を指定件数だけ取得して分類し、分類済み article id を返す', async () => {
    const a1 = asArticleId('a1');
    const summaries = fakeRepo([a1], new Map([[a1, fakeSummary(a1)]]));
    const classifier = fakeClassifier(async () => 'ai');

    const result = await classifyPendingCategories({
      summaries,
      classifier,
      getTitlesByIds: vi.fn(async () => new Map([[a1, '記事1']])),
    })({ limit: 1 });

    expect(summaries.listUncategorizedArticleIds).toHaveBeenCalledWith(1);
    expect(classifier.classify).toHaveBeenCalledWith({
      title: '記事1',
      overview: '概要',
      tags: ['AWS'],
    });
    expect(summaries.updateCategory).toHaveBeenCalledWith(a1, 'ai', expect.any(Date));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ requested: 1, classified: 1, failed: 0 });
      expect(result.value.classifiedArticleIds).toEqual([a1]);
    }
  });

  it('enum外の不正出力は category=null で categorizedAt だけ更新し failed に数える', async () => {
    const a1 = asArticleId('a1');
    const summaries = fakeRepo([a1], new Map([[a1, fakeSummary(a1)]]));
    const classifier = fakeClassifier(async () => 'not-a-category');

    const result = await classifyPendingCategories({
      summaries,
      classifier,
      getTitlesByIds: vi.fn(async () => new Map([[a1, '記事1']])),
    })({ limit: 10 });

    expect(summaries.updateCategory).toHaveBeenCalledWith(a1, null, expect.any(Date));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ classified: 0, failed: 1 });
      expect(result.value.classifiedArticleIds).toEqual([]);
    }
  });

  it('classifier が例外を投げても category=null で試行済みを記録し、残りを処理する', async () => {
    const a1 = asArticleId('a1');
    const a2 = asArticleId('a2');
    const summaries = fakeRepo(
      [a1, a2],
      new Map([
        [a1, fakeSummary(a1)],
        [a2, fakeSummary(a2)],
      ]),
    );
    const classifier = fakeClassifier(async ({ title }) => {
      if (title === '記事1') throw new Error('LLM failed');
      return 'infra';
    });

    const result = await classifyPendingCategories({
      summaries,
      classifier,
      getTitlesByIds: vi.fn(
        async () =>
          new Map([
            [a1, '記事1'],
            [a2, '記事2'],
          ]),
      ),
    })({ limit: 10 });

    expect(classifier.classify).toHaveBeenCalledTimes(2);
    expect(summaries.updateCategory).toHaveBeenCalledWith(a1, null, expect.any(Date));
    expect(summaries.updateCategory).toHaveBeenCalledWith(a2, 'infra', expect.any(Date));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ classified: 1, failed: 1 });
      expect(result.value.classifiedArticleIds).toEqual([a2]);
    }
  });

  it('要約が見つからない記事は分類を試みず failed に数える(categorizedAt も更新しない)', async () => {
    const a1 = asArticleId('a1');
    const summaries = fakeRepo([a1], new Map());
    const classifier = fakeClassifier(async () => 'ai');

    const result = await classifyPendingCategories({
      summaries,
      classifier,
      getTitlesByIds: vi.fn(async () => new Map([[a1, '記事1']])),
    })({ limit: 10 });

    expect(classifier.classify).not.toHaveBeenCalled();
    expect(summaries.updateCategory).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ classified: 0, failed: 1 });
    }
  });
});
