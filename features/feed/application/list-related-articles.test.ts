import { describe, expect, it } from 'vitest';
import { isOk } from '@/shared/result';
import { asArticleId, asCompanyId } from '@/shared/type-utils';
import type { Article } from '../domain/article';
import type { ArticleRepository, ListCriteria } from '../domain/article-repository';
import { listRelatedArticles } from './list-related-articles';

const makeArticle = (i: number): Article => ({
  id: asArticleId(`id-${i}`),
  url: `https://example.com/${i}`,
  title: `記事${i}`,
  description: null,
  ogImage: null,
  author: null,
  publishedAt: new Date(2026, 0, 1, 12, 0, i),
  counts: { view: 0, bookmark: 0, favorite: 0, hatena: 0 },
  company: {
    id: asCompanyId('c1'),
    slug: 'classmethod',
    name: 'クラスメソッド',
    brandColor: '#000',
  },
});

type Fixture = {
  target: Article | null;
  overlap: Article[];
  latest: Article[];
};

const setup = (f: Fixture) => {
  const listCalls: ListCriteria[] = [];
  const overlapCalls: { id: string; limit: number }[] = [];
  const unused = async () => {
    throw new Error('unexpected call');
  };
  const repo: ArticleRepository = {
    async list(c: ListCriteria) {
      listCalls.push(c);
      return f.latest.slice(c.offset, c.offset + c.limit);
    },
    async findById() {
      return f.target;
    },
    async listByTagOverlap(id, limit) {
      overlapCalls.push({ id, limit });
      return f.overlap.slice(0, limit);
    },
    listByIds: unused,
    listForSitemap: unused,
    listLatestByCategories: unused,
    countByCategory: unused,
    upsertMany: unused,
    incrementView: unused,
    listRecentForMetrics: unused,
    updateHatenaCounts: unused,
    appendMetricSnapshots: unused,
    recomputeTrendScores: unused,
    pruneMetricSnapshots: unused,
  };
  return { repo, listCalls, overlapCalls };
};

const run = async (f: Fixture, limit?: number) => {
  const s = setup(f);
  const result = await listRelatedArticles({ articles: s.repo })('id-0', limit);
  if (!isOk(result)) throw new Error('expected ok');
  return { ids: result.value.map((c) => c.id), ...s };
};

describe('listRelatedArticles', () => {
  it('対象記事が無ければ空配列で、検索も行わない', async () => {
    const r = await run({ target: null, overlap: [makeArticle(1)], latest: [] });
    expect(r.ids).toEqual([]);
    expect(r.overlapCalls).toHaveLength(0);
    expect(r.listCalls).toHaveLength(0);
  });

  it('タグ一致だけで limit を満たす時は同企業新着を引かない', async () => {
    const overlap = [1, 2, 3].map(makeArticle);
    const r = await run({ target: makeArticle(0), overlap, latest: [makeArticle(9)] }, 3);
    expect(r.ids).toEqual(['id-1', 'id-2', 'id-3']);
    expect(r.listCalls).toHaveLength(0);
  });

  it('不足分を同企業の新着で補い、自身とタグ一致済みの記事を除外する', async () => {
    const target = makeArticle(0);
    const overlap = [makeArticle(1), makeArticle(2)];
    // 新着は自身(0)とタグ一致済み(1)を含む
    const latest = [target, makeArticle(1), makeArticle(5), makeArticle(6), makeArticle(7)];
    const r = await run({ target, overlap, latest }, 4);
    expect(r.ids).toEqual(['id-1', 'id-2', 'id-5', 'id-6']);
    expect(r.listCalls).toHaveLength(1);
    expect(r.listCalls[0]).toMatchObject({
      sort: 'latest',
      companyIds: [target.company.id],
      offset: 0,
      limit: 5,
    });
  });

  it('タグ一致が無ければ同企業新着だけで埋める', async () => {
    const target = makeArticle(0);
    const latest = [target, makeArticle(3), makeArticle(2)];
    const r = await run({ target, overlap: [], latest }, 2);
    expect(r.ids).toEqual(['id-3', 'id-2']);
  });

  it('タグ一致が limit を超えて返っても limit 件に切る', async () => {
    const overlap = [1, 2, 3, 4].map(makeArticle);
    const r = await run({ target: makeArticle(0), overlap, latest: [] }, 2);
    expect(r.ids).toEqual(['id-1', 'id-2']);
  });

  it('limit を省略すると 6 件が上限になる', async () => {
    const target = makeArticle(0);
    const latest = [target, ...[1, 2, 3, 4, 5, 6, 7, 8].map(makeArticle)];
    const r = await run({ target, overlap: [], latest });
    expect(r.ids).toHaveLength(6);
  });
});
