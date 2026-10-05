import type { FeedHealthSnapshot, HealthRepository } from '../domain/health-repository';

type Check = {
  ok: boolean;
  message?: string;
};

type FeedCheck = Check & {
  enabledCompanies: number;
  staleCompanies: number;
  failingCompanies: number;
  newestFetchedAt: string | null;
};

export type HealthStatus = {
  ok: boolean;
  status: 'healthy' | 'unhealthy';
  checkedAt: string;
  checks: {
    env: Check & { missing: string[] };
    db: Check;
    feed: FeedCheck;
  };
};

const FEED_STALE_AFTER_HOURS = 3;
const FAILING_AFTER_COUNT = 3;

export async function getHealthStatus(input: {
  health: HealthRepository;
  requiredEnv: [name: string, value: string | undefined][];
  now?: Date;
}): Promise<HealthStatus> {
  const now = input.now ?? new Date();
  const checkedAt = now.toISOString();
  const envCheck = checkEnv(input.requiredEnv);
  const dbCheck = await checkDb(input.health);
  const feedCheck = dbCheck.ok ? await checkFeedFreshness(input.health, now) : skippedFeedCheck();
  const ok = envCheck.ok && dbCheck.ok && feedCheck.ok;

  return {
    ok,
    status: ok ? 'healthy' : 'unhealthy',
    checkedAt,
    checks: {
      env: envCheck,
      db: dbCheck,
      feed: feedCheck,
    },
  };
}

function checkEnv(requiredEnv: [name: string, value: string | undefined][]): Check & {
  missing: string[];
} {
  const missing = requiredEnv.filter(([, value]) => !value).map(([name]) => name);

  return {
    ok: missing.length === 0,
    missing,
    ...(missing.length > 0 ? { message: 'required environment variables are missing' } : {}),
  };
}

async function checkDb(health: HealthRepository): Promise<Check> {
  try {
    await health.checkDb();
    return { ok: true };
  } catch {
    return { ok: false, message: 'database query failed' };
  }
}

async function checkFeedFreshness(health: HealthRepository, now: Date): Promise<FeedCheck> {
  try {
    const snapshot = await health.getFeedSnapshot({
      staleAfterHours: FEED_STALE_AFTER_HOURS,
      failingAfterCount: FAILING_AFTER_COUNT,
    });
    return buildFeedCheck(snapshot, now);
  } catch {
    return {
      ok: false,
      enabledCompanies: 0,
      staleCompanies: 0,
      failingCompanies: 0,
      newestFetchedAt: null,
      message: 'feed freshness query failed',
    };
  }
}

// 取込 cron 全体が止まっているときだけ unhealthy にする。
// 外部ブログの RSS が1社壊れても全体は落とさないので、stale / failing は参考値として返すのみ。
function buildFeedCheck(snapshot: FeedHealthSnapshot, now: Date): FeedCheck {
  const newestFetchedAt = toIsoString(snapshot.newestFetchedAt);
  const hasCompanies = snapshot.enabledCompanies > 0;
  const staleBoundary = now.getTime() - FEED_STALE_AFTER_HOURS * 60 * 60 * 1000;
  const fresh = newestFetchedAt !== null && new Date(newestFetchedAt).getTime() >= staleBoundary;
  const ok = hasCompanies && fresh;

  return {
    ok,
    enabledCompanies: snapshot.enabledCompanies,
    staleCompanies: snapshot.staleCompanies,
    failingCompanies: snapshot.failingCompanies,
    newestFetchedAt,
    ...(!ok ? { message: hasCompanies ? 'feed ingestion stalled' : 'no enabled companies' } : {}),
  };
}

function skippedFeedCheck(): FeedCheck {
  return {
    ok: false,
    enabledCompanies: 0,
    staleCompanies: 0,
    failingCompanies: 0,
    newestFetchedAt: null,
    message: 'skipped because database check failed',
  };
}

function toIsoString(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
