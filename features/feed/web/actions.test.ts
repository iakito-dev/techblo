import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';

const h = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  findLastIngestAttemptAt: vi.fn(),
  ingestAllCompanies: vi.fn(),
  updateMetrics: vi.fn(),
  track: vi.fn(),
  sink: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidateTag: h.revalidateTag }));
vi.mock('@/db/client', () => ({ db: {} }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { info: vi.fn(), warn: h.warn, error: h.error },
}));
vi.mock('@/lib/hatena/count-client', () => ({ fetchBookmarkCounts: vi.fn() }));
vi.mock('@/lib/rss/ingest', () => ({ ingestAllCompanies: h.ingestAllCompanies }));
vi.mock('../infrastructure/drizzle-article-repository', () => ({
  DrizzleArticleRepository: class {},
}));
vi.mock('../infrastructure/drizzle-company-repository', () => ({
  DrizzleCompanyRepository: class {
    findLastIngestAttemptAt = h.findLastIngestAttemptAt;
  },
}));
vi.mock('../application/upsert-articles', () => ({ upsertArticles: () => h.sink }));
vi.mock('../application/update-article-metrics', () => ({
  updateArticleMetrics: () => h.updateMetrics,
}));
vi.mock('../application/track-view', () => ({ trackView: () => h.track }));

const { refreshFeed, trackArticleView } = await import('./actions');
const { REFRESH_COOLDOWN_MS } = await import('../domain/refresh-cooldown');

beforeEach(() => {
  vi.resetAllMocks();
  h.findLastIngestAttemptAt.mockResolvedValue(null);
  h.ingestAllCompanies.mockResolvedValue([]);
  h.updateMetrics.mockResolvedValue(ok(undefined));
});

describe('refreshFeed', () => {
  it('直近の取込試行がクールダウン内なら、クロールもキャッシュ無効化もせず skipped を返す', async () => {
    h.findLastIngestAttemptAt.mockResolvedValue(new Date(Date.now() - REFRESH_COOLDOWN_MS / 2));

    expect(await refreshFeed()).toEqual({ ingested: 0, failed: 0, skipped: true });
    expect(h.ingestAllCompanies).not.toHaveBeenCalled();
    expect(h.updateMetrics).not.toHaveBeenCalled();
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it('クールダウンを過ぎていれば全企業を取り込み、件数と失敗数を集計して feed キャッシュを無効化する', async () => {
    h.findLastIngestAttemptAt.mockResolvedValue(new Date(Date.now() - REFRESH_COOLDOWN_MS - 1000));
    h.ingestAllCompanies.mockResolvedValue([
      { companyId: 'c1', slug: 'a', ok: true, count: 3 },
      { companyId: 'c2', slug: 'b', ok: true, count: 2 },
      { companyId: 'c3', slug: 'c', ok: false, count: 0, error: 'timeout' },
    ]);

    expect(await refreshFeed()).toEqual({ ingested: 5, failed: 1, skipped: false });
    // 取り込みは upsertArticles の sink に流す
    expect(h.ingestAllCompanies).toHaveBeenCalledWith(h.sink);
    expect(h.updateMetrics).toHaveBeenCalledTimes(1);
    expect(h.revalidateTag).toHaveBeenCalledWith('feed', 'max');
    expect(h.warn).toHaveBeenCalledWith(
      'refreshFeed: 一部の企業フィード取得に失敗',
      expect.objectContaining({ failed: 1, companies: 3 }),
    );
  });

  it('取込試行の記録が無ければ(初回)クロールする', async () => {
    expect(await refreshFeed()).toEqual({ ingested: 0, failed: 0, skipped: false });
    expect(h.ingestAllCompanies).toHaveBeenCalledTimes(1);
    expect(h.warn).not.toHaveBeenCalled();
  });

  it('はてブ数の更新に失敗しても取り込み結果を返し、キャッシュは無効化する', async () => {
    h.ingestAllCompanies.mockResolvedValue([{ companyId: 'c1', slug: 'a', ok: true, count: 1 }]);
    h.updateMetrics.mockResolvedValue(err('hatena down'));

    expect(await refreshFeed()).toEqual({ ingested: 1, failed: 0, skipped: false });
    expect(h.revalidateTag).toHaveBeenCalledWith('feed', 'max');
    expect(h.warn).toHaveBeenCalledWith('refreshFeed: はてブ数の更新に失敗', {
      error: 'hatena down',
    });
  });
});

describe('trackArticleView', () => {
  it('加算に成功したら結果をそのまま返し、エラーログは出さない', async () => {
    h.track.mockResolvedValue(ok(undefined));

    expect(await trackArticleView({ articleId: 'a1' })).toEqual(ok(undefined));
    expect(h.track).toHaveBeenCalledWith({ articleId: 'a1' });
    expect(h.error).not.toHaveBeenCalled();
  });

  it('加算に失敗したらエラーを返し、記事 id 付きでログに残す', async () => {
    const failure = err({ kind: 'NOT_FOUND' as const });
    h.track.mockResolvedValue(failure);

    expect(await trackArticleView({ articleId: 'a1' })).toBe(failure);
    expect(h.error).toHaveBeenCalledWith(
      'trackView failed',
      expect.objectContaining({ articleId: 'a1' }),
    );
  });
});
