import { describe, expect, it, vi } from 'vitest';
import { asArticleId } from '@/shared/type-utils';
import type { ArticleContentFetcher } from '../domain/article-content-fetcher';
import type { ArticleSummaryRepository } from '../domain/article-summary-repository';
import type { SummaryGenerator } from '../domain/summary-generator';
import { generateSummary, MAX_INPUT_CHARS } from './generate-summary';

function fakeRepo(): ArticleSummaryRepository {
  return {
    findByArticleId: vi.fn(),
    upsert: vi.fn(),
    listPendingArticleIds: vi.fn(),
    listUncategorizedArticleIds: vi.fn(),
    updateCategory: vi.fn(),
  };
}

function fakeFetcher(text: string | null): ArticleContentFetcher {
  return {
    fetch: vi.fn(async () => (text === null ? null : { text, source: 'full_text' as const })),
  };
}

function fakeGenerator(
  headings: string[],
  tags: string[] = ['AI', 'AWS'],
  overview = '記事全体の概要です',
): SummaryGenerator {
  const bullets = headings.map((h) => ({ heading: h, detail: `${h}の具体的な説明です。` }));
  return { model: 'test-model', generate: vi.fn(async () => ({ overview, bullets, tags })) };
}

const input = {
  articleId: asArticleId('a1'),
  url: 'https://example.com/post',
  title: 'タイトル',
  rssExcerpt: 'RSS 抜粋',
};

describe('generateSummary', () => {
  it('本文取得成功時は full_text を入力に ready で upsert する', async () => {
    const summaries = fakeRepo();
    const fetcher = fakeFetcher('本文テキスト');
    const generator = fakeGenerator(['行1', '行2', '行3']);

    const result = await generateSummary({ summaries, fetcher, generator })(input);

    expect(result.ok).toBe(true);
    expect(generator.generate).toHaveBeenCalledWith({ title: 'タイトル', content: '本文テキスト' });
    expect(summaries.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ready',
        source: 'full_text',
        overview: '記事全体の概要です',
        category: null,
        bullets: [
          { heading: '行1', detail: '行1の具体的な説明です。' },
          { heading: '行2', detail: '行2の具体的な説明です。' },
          { heading: '行3', detail: '行3の具体的な説明です。' },
        ],
        tags: ['AI', 'AWS'],
      }),
    );
  });

  it('概要が空なら failed を記録する', async () => {
    const summaries = fakeRepo();
    const fetcher = fakeFetcher('本文');
    const generator = fakeGenerator(['行1'], ['AI'], '');

    await generateSummary({ summaries, fetcher, generator })(input);

    expect(summaries.upsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });

  it('本文取得失敗時は RSS 抜粋へフォールバックする(source=rss_excerpt)', async () => {
    const summaries = fakeRepo();
    const fetcher = fakeFetcher(null);
    const generator = fakeGenerator(['行1']);

    await generateSummary({ summaries, fetcher, generator })(input);

    expect(generator.generate).toHaveBeenCalledWith({ title: 'タイトル', content: 'RSS 抜粋' });
    expect(summaries.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'rss_excerpt' }),
    );
  });

  it('本文も抜粋も空なら生成せず failed を記録する', async () => {
    const summaries = fakeRepo();
    const fetcher = fakeFetcher(null);
    const generator = fakeGenerator(['行1']);

    await generateSummary({ summaries, fetcher, generator })({ ...input, rssExcerpt: '' });

    expect(generator.generate).not.toHaveBeenCalled();
    expect(summaries.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', bullets: [] }),
    );
  });

  it('LLM 出力が壊れている(4行)なら failed を記録する', async () => {
    const summaries = fakeRepo();
    const fetcher = fakeFetcher('本文');
    const generator = fakeGenerator(['1', '2', '3', '4']);

    await generateSummary({ summaries, fetcher, generator })(input);

    expect(summaries.upsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });

  it('LLM 出力のタグが壊れている(6件)なら failed を記録する', async () => {
    const summaries = fakeRepo();
    const fetcher = fakeFetcher('本文');
    const generator = fakeGenerator(['行1'], ['AI', 'AWS', 'RSC', 'Next.js', 'DB', 'OAuth']);

    await generateSummary({ summaries, fetcher, generator })(input);

    expect(summaries.upsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });

  it('入力は MAX_INPUT_CHARS でクランプする', async () => {
    const summaries = fakeRepo();
    const long = 'あ'.repeat(MAX_INPUT_CHARS + 500);
    const fetcher = fakeFetcher(long);
    const generator = fakeGenerator(['行1']);

    await generateSummary({ summaries, fetcher, generator })(input);

    const call = vi.mocked(generator.generate).mock.calls[0];
    expect(call?.[0].content.length).toBe(MAX_INPUT_CHARS);
  });
});
