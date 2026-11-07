import { describe, expect, it, vi } from 'vitest';
import { asArticleId } from '@/shared/type-utils';
import type { ArticleSummary } from '../domain/article-summary';
import type { ArticleSummaryRepository } from '../domain/article-summary-repository';
import { getSummary } from './get-summary';

const articleId = asArticleId('article-1');

const summary = (status: ArticleSummary['status']): ArticleSummary => ({
  articleId,
  overview: '概要',
  bullets: [{ heading: '背景', detail: '詳細です。' }],
  tags: ['React'],
  category: null,
  model: 'test-model',
  source: 'rss_excerpt',
  status,
  generatedAt: new Date('2026-01-01T00:00:00Z'),
});

const run = (found: ArticleSummary | null) => {
  const findByArticleId = vi.fn().mockResolvedValue(found);
  const summaries = { findByArticleId } as unknown as ArticleSummaryRepository;
  return { findByArticleId, result: getSummary({ summaries })({ articleId }) };
};

describe('getSummary', () => {
  it('status=ready の要約は表示 DTO に変換して返す(category/source は含めない)', async () => {
    const { findByArticleId, result } = run(summary('ready'));
    expect(await result).toEqual({
      ok: true,
      value: {
        articleId,
        overview: '概要',
        bullets: [{ heading: '背景', detail: '詳細です。' }],
        tags: ['React'],
        model: 'test-model',
        generatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    });
    expect(findByArticleId).toHaveBeenCalledExactlyOnceWith(articleId);
  });

  it('status=failed の要約は null(UI がセクションを出さない)', async () => {
    expect(await run(summary('failed')).result).toEqual({ ok: true, value: null });
  });

  it('要約が無ければ null', async () => {
    expect(await run(null).result).toEqual({ ok: true, value: null });
  });
});
