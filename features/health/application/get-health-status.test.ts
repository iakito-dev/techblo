import { describe, expect, it } from 'vitest';
import type { FeedHealthSnapshot, HealthRepository } from '../domain/health-repository';
import { getHealthStatus } from './get-health-status';

const NOW = new Date('2026-06-20T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

const okEnv: [string, string | undefined][] = [
  ['DATABASE_URL', 'postgres://example'],
  ['BETTER_AUTH_SECRET', 'secret'],
];

function snapshot(overrides: Partial<FeedHealthSnapshot> = {}): FeedHealthSnapshot {
  return {
    enabledCompanies: 6,
    staleCompanies: 0,
    failingCompanies: 0,
    newestFetchedAt: new Date(NOW.getTime() - 10 * 60 * 1000),
    ...overrides,
  };
}

// インメモリのフェイク Repository
function fakeRepo(options: {
  dbFails?: boolean;
  feed?: FeedHealthSnapshot;
  feedThrows?: boolean;
}): HealthRepository & { feedCalls: number } {
  const repo = {
    feedCalls: 0,
    async checkDb() {
      if (options.dbFails) throw new Error('db down');
    },
    async getFeedSnapshot() {
      repo.feedCalls++;
      if (options.feedThrows) throw new Error('query failed');
      return options.feed ?? snapshot();
    },
  };
  return repo;
}

describe('getHealthStatus', () => {
  it('全チェックが正常なら healthy', async () => {
    const result = await getHealthStatus({ health: fakeRepo({}), requiredEnv: okEnv, now: NOW });

    expect(result.ok).toBe(true);
    expect(result.status).toBe('healthy');
    expect(result.checkedAt).toBe(NOW.toISOString());
    expect(result.checks.env).toEqual({ ok: true, missing: [] });
    expect(result.checks.db).toEqual({ ok: true });
    expect(result.checks.feed.ok).toBe(true);
    expect(result.checks.feed.message).toBeUndefined();
  });

  it('必須 env が欠落していたら unhealthy で欠落名を返す', async () => {
    const result = await getHealthStatus({
      health: fakeRepo({}),
      requiredEnv: [...okEnv, ['GITHUB_CLIENT_ID', undefined]],
      now: NOW,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('unhealthy');
    expect(result.checks.env.ok).toBe(false);
    expect(result.checks.env.missing).toEqual(['GITHUB_CLIENT_ID']);
  });

  it('DB が失敗したら feed チェックはスキップする', async () => {
    const repo = fakeRepo({ dbFails: true });
    const result = await getHealthStatus({ health: repo, requiredEnv: okEnv, now: NOW });

    expect(result.ok).toBe(false);
    expect(result.checks.db).toEqual({ ok: false, message: 'database query failed' });
    expect(result.checks.feed.ok).toBe(false);
    expect(result.checks.feed.message).toBe('skipped because database check failed');
    expect(repo.feedCalls).toBe(0);
  });

  it('有効企業が0なら unhealthy', async () => {
    const repo = fakeRepo({
      feed: snapshot({ enabledCompanies: 0, newestFetchedAt: null }),
    });
    const result = await getHealthStatus({ health: repo, requiredEnv: okEnv, now: NOW });

    expect(result.ok).toBe(false);
    expect(result.checks.feed.ok).toBe(false);
    expect(result.checks.feed.message).toBe('no enabled companies');
  });

  it('newest が3時間より古ければ unhealthy(feed ingestion stalled)', async () => {
    const repo = fakeRepo({
      feed: snapshot({ newestFetchedAt: new Date(NOW.getTime() - 3 * HOUR - 1000) }),
    });
    const result = await getHealthStatus({ health: repo, requiredEnv: okEnv, now: NOW });

    expect(result.ok).toBe(false);
    expect(result.checks.feed.ok).toBe(false);
    expect(result.checks.feed.message).toBe('feed ingestion stalled');
  });

  it('newestFetchedAt が null なら unhealthy', async () => {
    const repo = fakeRepo({ feed: snapshot({ newestFetchedAt: null }) });
    const result = await getHealthStatus({ health: repo, requiredEnv: okEnv, now: NOW });

    expect(result.checks.feed.ok).toBe(false);
    expect(result.checks.feed.message).toBe('feed ingestion stalled');
    expect(result.checks.feed.newestFetchedAt).toBeNull();
  });

  it('一部企業が stale / failing でも newest が新しければ healthy(カウントは返す)', async () => {
    const repo = fakeRepo({ feed: snapshot({ staleCompanies: 2, failingCompanies: 1 }) });
    const result = await getHealthStatus({ health: repo, requiredEnv: okEnv, now: NOW });

    expect(result.ok).toBe(true);
    expect(result.checks.feed.ok).toBe(true);
    expect(result.checks.feed.staleCompanies).toBe(2);
    expect(result.checks.feed.failingCompanies).toBe(1);
  });

  it('feed クエリが throw したら unhealthy', async () => {
    const repo = fakeRepo({ feedThrows: true });
    const result = await getHealthStatus({ health: repo, requiredEnv: okEnv, now: NOW });

    expect(result.ok).toBe(false);
    expect(result.checks.db.ok).toBe(true);
    expect(result.checks.feed.ok).toBe(false);
    expect(result.checks.feed.message).toBe('feed freshness query failed');
  });

  it('newestFetchedAt が文字列でも判定できる', async () => {
    const fresh = new Date(NOW.getTime() - HOUR).toISOString();
    const stale = new Date(NOW.getTime() - 4 * HOUR).toISOString();

    const freshResult = await getHealthStatus({
      health: fakeRepo({ feed: snapshot({ newestFetchedAt: fresh }) }),
      requiredEnv: okEnv,
      now: NOW,
    });
    const staleResult = await getHealthStatus({
      health: fakeRepo({ feed: snapshot({ newestFetchedAt: stale }) }),
      requiredEnv: okEnv,
      now: NOW,
    });

    expect(freshResult.checks.feed.ok).toBe(true);
    expect(freshResult.checks.feed.newestFetchedAt).toBe(fresh);
    expect(staleResult.checks.feed.ok).toBe(false);
  });
});
