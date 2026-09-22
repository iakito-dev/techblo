import { describe, expect, it, vi } from 'vitest';
import { ok, type Result } from '@/shared/result';
import { type ArticleId, asArticleId } from '@/shared/type-utils';
import type { ArticleSummary } from '../domain/article-summary';
import type { ArticleSummaryRepository } from '../domain/article-summary-repository';
import { generatePendingSummaries, type SummaryInputArticle } from './generate-pending-summaries';

function fakeSummary(articleId: ArticleId): ArticleSummary {
  return {
    articleId,
    overview: '概要',
    bullets: [{ heading: 'a', detail: 'aの説明です。' }],
    tags: ['AI'],
    category: null,
    model: 'test',
    source: 'rss_excerpt',
    status: 'ready',
    generatedAt: new Date('2026-06-15T00:00:00Z'),
  };
}

function fakeRepo(ids: ArticleId[]): ArticleSummaryRepository {
  return {
    findByArticleId: vi.fn(),
    upsert: vi.fn(),
    listPendingArticleIds: vi.fn(async (limit: number) => ids.slice(0, limit)),
    listUncategorizedArticleIds: vi.fn(),
    updateCategory: vi.fn(),
  };
}

const articles = new Map<ArticleId, SummaryInputArticle>([
  [
    asArticleId('a1'),
    {
      id: asArticleId('a1'),
      url: 'https://example.com/1',
      title: '記事1',
      rssExcerpt: '抜粋1',
    },
  ],
  [
    asArticleId('a2'),
    {
      id: asArticleId('a2'),
      url: 'https://example.com/2',
      title: '記事2',
      rssExcerpt: null,
    },
  ],
]);

function pickArticles(ids: ArticleId[]): SummaryInputArticle[] {
  return ids.flatMap((id) => {
    const article = articles.get(id);
    return article ? [article] : [];
  });
}

describe('generatePendingSummaries', () => {
  it('未生成記事を指定件数だけ取得して要約生成し、生成済み article id を返す', async () => {
    const a1 = asArticleId('a1');
    const a2 = asArticleId('a2');
    const summaries = fakeRepo([a1, a2]);
    const generateOne = vi.fn(async ({ articleId }) => ok(fakeSummary(articleId)));

    const result = await generatePendingSummaries({
      summaries,
      getArticlesByIds: vi.fn(async (ids) => pickArticles(ids)),
      generateOne,
    })({ limit: 1 });

    expect(summaries.listPendingArticleIds).toHaveBeenCalledWith(1);
    expect(generateOne).toHaveBeenCalledTimes(1);
    expect(generateOne).toHaveBeenCalledWith({
      articleId: a1,
      url: 'https://example.com/1',
      title: '記事1',
      rssExcerpt: '抜粋1',
    });
    expect(result).toEqual({
      ok: true,
      value: { requested: 1, found: 1, generated: 1, failed: 0, generatedArticleIds: [a1] },
    });
  });

  it('記事本体が見つからない pending id は失敗として数える', async () => {
    const a1 = asArticleId('a1');
    const missing = asArticleId('missing');
    const summaries = fakeRepo([a1, missing]);

    const result = await generatePendingSummaries({
      summaries,
      getArticlesByIds: vi.fn(async () => pickArticles([a1])),
      generateOne: vi.fn(async ({ articleId }) => ok(fakeSummary(articleId))),
    })({ limit: 10 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ requested: 10, found: 2, generated: 1, failed: 1 });
      expect(result.value.generatedArticleIds).toEqual([a1]);
    }
  });

  it('個別生成が失敗しても残りの記事を処理する', async () => {
    const a1 = asArticleId('a1');
    const a2 = asArticleId('a2');
    const summaries = fakeRepo([a1, a2]);
    const generateOne = vi.fn(
      async ({ articleId }): Promise<Result<ArticleSummary, { kind: 'INTERNAL' }>> =>
        articleId === a1 ? { ok: false, error: { kind: 'INTERNAL' } } : ok(fakeSummary(articleId)),
    );

    const result = await generatePendingSummaries({
      summaries,
      getArticlesByIds: vi.fn(async (ids) => pickArticles(ids)),
      generateOne,
    })({ limit: 10 });

    expect(generateOne).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ generated: 1, failed: 1 });
      expect(result.value.generatedArticleIds).toEqual([a2]);
    }
  });

  it('個別生成が例外を投げても残りの記事を処理する', async () => {
    const a1 = asArticleId('a1');
    const a2 = asArticleId('a2');
    const summaries = fakeRepo([a1, a2]);
    const generateOne = vi.fn(async ({ articleId }) => {
      if (articleId === a1) throw new Error('LLM failed');
      return ok(fakeSummary(articleId));
    });

    const result = await generatePendingSummaries({
      summaries,
      getArticlesByIds: vi.fn(async (ids) => pickArticles(ids)),
      generateOne,
    })({ limit: 10 });

    expect(generateOne).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ generated: 1, failed: 1 });
      expect(result.value.generatedArticleIds).toEqual([a2]);
    }
  });
});
