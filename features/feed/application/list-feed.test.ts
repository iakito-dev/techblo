import { describe, expect, it } from 'vitest';
import { isOk } from '@/shared/result';
import { asArticleId, asCompanyId } from '@/shared/type-utils';
import type { Article } from '../domain/article';
import type { ArticleRepository, ListCriteria } from '../domain/article-repository';
import { listFeed } from './list-feed';

const makeArticle = (i: number): Article => ({
  id: asArticleId(`id-${i}`),
  url: `https://example.com/${i}`,
  title: `記事${i}`,
  description: null,
  ogImage: null,
  author: null,
  publishedAt: new Date(2026, 0, 1, 12, 0, i),
  counts: { view: i, bookmark: 0, favorite: 0, hatena: 0 },
  company: {
    id: asCompanyId('c1'),
    slug: 'classmethod',
    name: 'クラスメソッド',
    brandColor: '#000',
  },
});

// オフセットの契約を満たす fake(DB なしで usecase を検証)。
// usecase は hasMore 判定のため limit+1 を要求する点に注意。
const fakeRepo = (all: Article[]): ArticleRepository => ({
  async list(c: ListCriteria) {
    return all.slice(c.offset, c.offset + c.limit);
  },
  async findById() {
    return null;
  },
  async listByIds() {
    return [];
  },
  async listForSitemap() {
    return [];
  },
  async listLatestByCategories() {
    return [];
  },
  async listByTagOverlap() {
    return [];
  },
  async countByCategory() {
    return {};
  },
  async upsertMany() {
    return 0;
  },
  async incrementView() {},
  async listRecentForMetrics() {
    return [];
  },
  async updateHatenaCounts() {},
  async appendMetricSnapshots() {},
  async recomputeTrendScores() {},
  async pruneMetricSnapshots() {},
});

// list に渡る criteria を記録する fake(period 伝播・limit+1 の検証用)
const capturingRepo = (): { repo: ArticleRepository; listCalls: ListCriteria[] } => {
  const listCalls: ListCriteria[] = [];
  const repo: ArticleRepository = {
    async list(c: ListCriteria) {
      listCalls.push(c);
      return [];
    },
    async findById() {
      return null;
    },
    async listByIds() {
      return [];
    },
    async listForSitemap() {
      return [];
    },
    async listLatestByCategories() {
      return [];
    },
    async listByTagOverlap() {
      return [];
    },
    async countByCategory() {
      return {};
    },
    async upsertMany() {
      return 0;
    },
    async incrementView() {},
    async listRecentForMetrics() {
      return [];
    },
    async updateHatenaCounts() {},
    async appendMetricSnapshots() {},
    async recomputeTrendScores() {},
    async pruneMetricSnapshots() {},
  };
  return { repo, listCalls };
};

describe('listFeed', () => {
  it('page1: items を limit 件返し、続きがあれば hasMore=true', async () => {
    const repo = fakeRepo(Array.from({ length: 25 }, (_, i) => makeArticle(i)));
    const r = await listFeed({ articles: repo })({ sort: 'latest', limit: 20 });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.items).toHaveLength(20);
      expect(r.value.page).toBe(1);
      expect(r.value.hasMore).toBe(true);
    }
  });

  it('page2: オフセット分を飛ばして残りを返し、最終ページなら hasMore=false', async () => {
    const repo = fakeRepo(Array.from({ length: 25 }, (_, i) => makeArticle(i)));
    const r = await listFeed({ articles: repo })({ sort: 'latest', limit: 20, page: 2 });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.items).toHaveLength(5);
      expect(r.value.page).toBe(2);
      expect(r.value.hasMore).toBe(false);
    }
  });

  it('範囲外の page は空 + hasMore=false を返す(総数依存のクランプは廃止)', async () => {
    const repo = fakeRepo(Array.from({ length: 25 }, (_, i) => makeArticle(i)));
    const r = await listFeed({ articles: repo })({ sort: 'latest', limit: 20, page: 99 });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.page).toBe(99);
      expect(r.value.items).toHaveLength(0);
      expect(r.value.hasMore).toBe(false);
    }
  });

  it('件数が limit 以下なら hasMore は false', async () => {
    const repo = fakeRepo(Array.from({ length: 5 }, (_, i) => makeArticle(i)));
    const r = await listFeed({ articles: repo })({ sort: 'latest', limit: 20 });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.hasMore).toBe(false);
      expect(r.value.items).toHaveLength(5);
    }
  });

  it('hasMore 判定のため list には limit+1 を要求する', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', limit: 20 });
    expect(listCalls[0]?.limit).toBe(21);
  });

  it('popular もオフセットでページングできる', async () => {
    const repo = fakeRepo(Array.from({ length: 25 }, (_, i) => makeArticle(i)));
    const r = await listFeed({ articles: repo })({ sort: 'popular', limit: 20, page: 2 });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.items).toHaveLength(5);
      expect(r.value.hasMore).toBe(false);
    }
  });

  it('popular のとき period を list へ渡す', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'popular', period: 'week', limit: 20 });
    expect(listCalls[0]?.period).toBe('week');
  });

  it('popular で period 未指定なら all を既定にする', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'popular', limit: 20 });
    expect(listCalls[0]?.period).toBe('all');
  });

  it('latest でも period を list へ渡す(期間は sort と直交するフィルタ)', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', period: 'week', limit: 20 });
    expect(listCalls[0]?.period).toBe('week');
  });

  it('latest で period 未指定なら all を既定にする', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', limit: 20 });
    expect(listCalls[0]?.period).toBe('all');
  });

  it('query は trim して list へ渡す', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', query: '  React  ' });
    expect(listCalls[0]?.query).toBe('React');
  });

  it('空白のみの query は undefined に正規化する', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', query: '   ' });
    expect(listCalls[0]?.query).toBeUndefined();
  });

  it('query は 100 文字に切り詰める', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', query: 'あ'.repeat(150) });
    expect(listCalls[0]?.query).toBe('あ'.repeat(100));
  });

  it('query は他のフィルタ(companyIds/readFilter)と同時に渡る', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({
      sort: 'latest',
      query: 'LLM',
      companyIds: ['c1'],
      readFilter: { userId: 'u1', mode: 'unread' },
    });
    expect(listCalls[0]?.query).toBe('LLM');
    expect(listCalls[0]?.companyIds).toEqual(['c1']);
    expect(listCalls[0]?.readFilter?.mode).toBe('unread');
  });

  // ユーザー登録RSS のマージは新着順・フィルタ/検索なしの主経路のみ(ADR-0014)
  it('latest・フィルタなしのとき userFeedIds を list へ渡す', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', userFeedIds: ['f1', 'f2'] });
    expect(listCalls[0]?.userFeedIds).toEqual(['f1', 'f2']);
  });

  it('popular では userFeedIds を渡さない(公開記事のみ)', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'popular', userFeedIds: ['f1'] });
    expect(listCalls[0]?.userFeedIds).toBeUndefined();
  });

  it('検索時は userFeedIds を渡さない', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', query: 'React', userFeedIds: ['f1'] });
    expect(listCalls[0]?.userFeedIds).toBeUndefined();
  });

  it('未読/既読フィルタ時は userFeedIds を渡さない', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({
      sort: 'latest',
      readFilter: { userId: 'u1', mode: 'unread' },
      userFeedIds: ['f1'],
    });
    expect(listCalls[0]?.userFeedIds).toBeUndefined();
  });

  it('includePublicArticles は主経路でのみ list へ渡す', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({
      sort: 'latest',
      userFeedIds: ['f1'],
      includePublicArticles: false,
    });
    expect(listCalls[0]?.includePublicArticles).toBe(false);
  });

  it('popular では includePublicArticles を渡さない', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({
      sort: 'popular',
      userFeedIds: ['f1'],
      includePublicArticles: false,
    });
    expect(listCalls[0]?.includePublicArticles).toBeUndefined();
  });

  it('tag は trim して list へ渡す', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', tag: '  生成AI  ' });
    expect(listCalls[0]?.tag).toBe('生成AI');
  });

  it('空白のみの tag は undefined に正規化する', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', tag: '   ' });
    expect(listCalls[0]?.tag).toBeUndefined();
  });

  it('タグ絞り込み時は公開記事のみ対象にし userFeedIds を渡さない', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', tag: 'AWS', userFeedIds: ['f1'] });
    expect(listCalls[0]?.tag).toBe('AWS');
    expect(listCalls[0]?.userFeedIds).toBeUndefined();
  });

  it('category は list へそのまま渡す', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', category: 'ai' });
    expect(listCalls[0]?.category).toBe('ai');
  });

  it('不正な category は無視する(enum 外は undefined に正規化)', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', category: 'not-a-category' });
    expect(listCalls[0]?.category).toBeUndefined();
  });

  it('カテゴリ絞り込み時は公開記事のみ対象にし userFeedIds を渡さない', async () => {
    const { repo, listCalls } = capturingRepo();
    await listFeed({ articles: repo })({ sort: 'latest', category: 'ai', userFeedIds: ['f1'] });
    expect(listCalls[0]?.category).toBe('ai');
    expect(listCalls[0]?.userFeedIds).toBeUndefined();
  });
});
