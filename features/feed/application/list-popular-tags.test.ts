import { describe, expect, it } from 'vitest';
import { isOk } from '@/shared/result';
import type { ArticleRepository, PopularTag } from '../domain/article-repository';
import { ALL_TAGS_LIMIT, listPopularTags, MAX_TAGS_LIMIT } from './list-popular-tags';

const setup = (rows: PopularTag[]) => {
  const calls: { limit: number; sinceDays?: number }[] = [];
  const articles = {
    async listPopularTags(limit: number, sinceDays?: number) {
      calls.push({ limit, sinceDays });
      return rows;
    },
  } as unknown as ArticleRepository;
  return { articles, calls };
};

const run = async (rows: PopularTag[], limit?: number, sinceDays?: number) => {
  const s = setup(rows);
  const result = await listPopularTags({ articles: s.articles })(limit, sinceDays);
  if (!isOk(result)) throw new Error('expected ok');
  return { value: result.value, calls: s.calls };
};

describe('listPopularTags', () => {
  it('Repository の並び順をそのまま返す', async () => {
    const rows = [
      { tag: 'React', count: 9 },
      { tag: 'Go', count: 3 },
    ];
    const r = await run(rows);
    expect(r.value).toEqual(rows);
  });

  it('limit 未指定は既定値を渡し、sinceDays は素通しする', async () => {
    const r = await run([], undefined, 90);
    expect(r.calls).toEqual([{ limit: ALL_TAGS_LIMIT, sinceDays: 90 }]);
  });

  it('limit は 1 以上 MAX_TAGS_LIMIT 以下に丸める', async () => {
    expect((await run([], 100_000)).calls[0]?.limit).toBe(MAX_TAGS_LIMIT);
    expect((await run([], 0)).calls[0]?.limit).toBe(1);
    expect((await run([], -5)).calls[0]?.limit).toBe(1);
    expect((await run([], Number.NaN)).calls[0]?.limit).toBe(1);
  });

  it('空白だけのタグは除外する', async () => {
    const r = await run([
      { tag: ' ', count: 5 },
      { tag: '', count: 4 },
      { tag: 'AWS', count: 2 },
    ]);
    expect(r.value).toEqual([{ tag: 'AWS', count: 2 }]);
  });
});
