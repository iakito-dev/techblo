import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';

const h = vi.hoisted(() => ({
  fetchFeed: vi.fn(),
  parseFeed: vi.fn(),
  setCalls: [] as Record<string, unknown>[],
  rows: [] as { id: string; slug: string; rssUrl: string; feedTimezone: string | null }[],
}));

vi.mock('./fetcher', () => ({ fetchFeed: h.fetchFeed }));
vi.mock('./parser', () => ({ parseFeed: h.parseFeed }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/db/client', () => ({
  db: {
    update: () => ({
      set: (values: Record<string, unknown>) => {
        h.setCalls.push(values);
        return { where: () => Promise.resolve() };
      },
    }),
    select: () => ({ from: () => ({ where: () => Promise.resolve(h.rows) }) }),
  },
}));

const { ingestAllCompanies, ingestCompanies, ingestCompany } = await import('./ingest');

const company = { id: 'c1', slug: 'acme', rssUrl: 'https://acme.example/feed', feedTimezone: null };

beforeEach(() => {
  h.fetchFeed.mockReset();
  h.parseFeed.mockReset();
  h.setCalls.length = 0;
  h.rows = [];
});

describe('ingestCompany', () => {
  it('取得・パース・保存に成功したら件数を返し、成功を記録する', async () => {
    h.fetchFeed.mockResolvedValue(ok('<rss/>'));
    h.parseFeed.mockReturnValue(ok([{ title: 'a' }, { title: 'b' }]));
    const sink = vi.fn().mockResolvedValue(ok(2));

    const result = await ingestCompany(company, sink);

    expect(result).toEqual({ companyId: 'c1', slug: 'acme', ok: true, count: 2 });
    expect(sink).toHaveBeenCalledWith('c1', [{ title: 'a' }, { title: 'b' }]);
    expect(h.parseFeed).toHaveBeenCalledWith('<rss/>', { feedTimezone: null });
    expect(h.setCalls).toHaveLength(1);
    expect(h.setCalls[0]).toMatchObject({ lastError: null, consecutiveFailures: 0 });
  });

  it('取得に失敗したら sink を呼ばず、失敗を記録して error を返す', async () => {
    h.fetchFeed.mockResolvedValue(err('timeout'));
    const sink = vi.fn();

    const result = await ingestCompany(company, sink);

    expect(result).toEqual({
      companyId: 'c1',
      slug: 'acme',
      ok: false,
      count: 0,
      error: 'timeout',
    });
    expect(sink).not.toHaveBeenCalled();
    expect(h.setCalls[0]).toHaveProperty('lastError', 'timeout');
  });

  it('パースに失敗したら sink を呼ばず、パースエラーの message を返す', async () => {
    h.fetchFeed.mockResolvedValue(ok('<broken'));
    h.parseFeed.mockReturnValue(err({ message: 'invalid xml' }));
    const sink = vi.fn();

    const result = await ingestCompany(company, sink);

    expect(result).toMatchObject({ ok: false, count: 0, error: 'invalid xml' });
    expect(sink).not.toHaveBeenCalled();
    expect(h.setCalls[0]).toHaveProperty('lastError', 'invalid xml');
  });

  it('保存に失敗したら失敗を記録して error を返す', async () => {
    h.fetchFeed.mockResolvedValue(ok('<rss/>'));
    h.parseFeed.mockReturnValue(ok([]));
    const sink = vi.fn().mockResolvedValue(err('db down'));

    const result = await ingestCompany(company, sink);

    expect(result).toMatchObject({ ok: false, count: 0, error: 'db down' });
    expect(h.setCalls[0]).toHaveProperty('lastError', 'db down');
  });
});

describe('ingestCompanies', () => {
  it('companyIds が空配列なら何も取り込まない(全件取得に化けさせない)', async () => {
    h.rows = [company];
    const sink = vi.fn();

    expect(await ingestCompanies(sink, [])).toEqual([]);
    expect(h.fetchFeed).not.toHaveBeenCalled();
  });

  it('1社が例外で落ちても他社の結果は返り、落ちた社は失敗として集計する', async () => {
    h.rows = [company, { ...company, id: 'c2', slug: 'beta' }];
    h.fetchFeed.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(ok('<rss/>'));
    h.parseFeed.mockReturnValue(ok([{ title: 'x' }]));
    const sink = vi.fn().mockResolvedValue(ok(1));

    const results = await ingestAllCompanies(sink);

    expect(results).toEqual([
      { companyId: 'c1', slug: 'acme', ok: false, count: 0, error: 'boom' },
      { companyId: 'c2', slug: 'beta', ok: true, count: 1 },
    ]);
  });
});
