import { beforeEach, describe, expect, it, vi } from 'vitest';

const getHealthStatus = vi.fn();

vi.mock('@/features/health/web/queries', () => ({
  getHealthStatus,
}));

// connection() はリクエストスコープ外(テスト)では throw するので無害化する
vi.mock('next/server', () => ({
  connection: vi.fn(async () => {}),
}));

describe('/api/healthz', () => {
  beforeEach(() => {
    vi.resetModules();
    getHealthStatus.mockReset();
  });

  it('全チェックが正常なら 200 を返す', async () => {
    getHealthStatus.mockResolvedValueOnce({
      ok: true,
      status: 'healthy',
      checkedAt: '2026-06-20T00:00:00.000Z',
      checks: {
        env: { ok: true, missing: [] },
        db: { ok: true },
        feed: {
          ok: true,
          enabledCompanies: 6,
          staleCompanies: 0,
          failingCompanies: 0,
          newestFetchedAt: '2026-06-20T00:00:00.000Z',
        },
      },
    });
    const { GET } = await import('./route');

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe('healthy');
    expect(body.checks.db.ok).toBe(true);
    expect(body.checks.feed.ok).toBe(true);
  });

  it('DB チェックに失敗したら 503 を返す', async () => {
    getHealthStatus.mockResolvedValueOnce({
      ok: false,
      status: 'unhealthy',
      checkedAt: '2026-06-20T00:00:00.000Z',
      checks: {
        env: { ok: true, missing: [] },
        db: { ok: false, message: 'database query failed' },
        feed: {
          ok: false,
          enabledCompanies: 0,
          staleCompanies: 0,
          failingCompanies: 0,
          newestFetchedAt: null,
          message: 'skipped because database check failed',
        },
      },
    });
    const { GET } = await import('./route');

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.checks.db.ok).toBe(false);
    expect(body.checks.feed.message).toBe('skipped because database check failed');
  });

  it('RSS 取込全体が止まっていたら 503 を返す', async () => {
    getHealthStatus.mockResolvedValueOnce({
      ok: false,
      status: 'unhealthy',
      checkedAt: '2026-06-20T00:00:00.000Z',
      checks: {
        env: { ok: true, missing: [] },
        db: { ok: true },
        feed: {
          ok: false,
          enabledCompanies: 6,
          staleCompanies: 1,
          failingCompanies: 0,
          newestFetchedAt: '2026-06-20T00:00:00.000Z',
          message: 'feed ingestion stalled',
        },
      },
    });
    const { GET } = await import('./route');

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.checks.feed.ok).toBe(false);
    expect(body.checks.feed.staleCompanies).toBe(1);
  });
});
