import { describe, expect, it, vi } from 'vitest';
import { ok, type Result } from '@/shared/result';
import { asArticleId } from '@/shared/type-utils';
import type {
  ArticleMetricsTarget,
  HatenaCount,
  MetricSnapshotInput,
} from '../domain/article-repository';
import { type BookmarkCountFetcher, updateArticleMetrics } from './update-article-metrics';

/** updateArticleMetrics が触る最小限のメソッドだけを記録する fake。 */
function makeDeps(
  targets: ArticleMetricsTarget[],
  counts: Map<string, number>,
  fetchOverride?: BookmarkCountFetcher,
) {
  const calls = {
    updateHatenaCounts: [] as HatenaCount[][],
    appendMetricSnapshots: [] as MetricSnapshotInput[][],
    recomputeTrendScores: [] as number[],
    pruneMetricSnapshots: [] as number[],
  };
  const articles = {
    async listRecentForMetrics() {
      return targets;
    },
    async updateHatenaCounts(entries: HatenaCount[]) {
      calls.updateHatenaCounts.push(entries);
    },
    async appendMetricSnapshots(snapshots: MetricSnapshotInput[]) {
      calls.appendMetricSnapshots.push(snapshots);
    },
    async recomputeTrendScores(sinceDays: number) {
      calls.recomputeTrendScores.push(sinceDays);
    },
    async pruneMetricSnapshots(retentionDays: number) {
      calls.pruneMetricSnapshots.push(retentionDays);
    },
  };
  const fetchCounts: BookmarkCountFetcher =
    fetchOverride ?? (async (): Promise<Result<Map<string, number>, string>> => ok(counts));
  // 使わないメソッドは any で省略(このユースケースは上記5メソッドのみ呼ぶ)
  return {
    deps: { articles: articles as never, fetchCounts },
    calls,
  };
}

const target = (id: string, url: string): ArticleMetricsTarget => ({ id: asArticleId(id), url });

describe('updateArticleMetrics', () => {
  it('対象が無ければ何もしない(updated: 0)', async () => {
    const { deps, calls } = makeDeps([], new Map());
    const result = await updateArticleMetrics(deps)();
    expect(result).toEqual(ok({ updated: 0 }));
    expect(calls.updateHatenaCounts).toHaveLength(0);
    expect(calls.appendMetricSnapshots).toHaveLength(0);
  });

  it('現在値の上書き → スナップショット追記 → 再計算 → 間引き を順に呼ぶ', async () => {
    const targets = [target('00000000-0000-0000-0000-000000000001', 'https://a.example/1')];
    const counts = new Map([['https://a.example/1', 7]]);
    const { deps, calls } = makeDeps(targets, counts);

    const result = await updateArticleMetrics(deps)();

    expect(result.ok).toBe(true);
    expect(calls.updateHatenaCounts[0]).toEqual([{ url: 'https://a.example/1', count: 7 }]);
    expect(calls.appendMetricSnapshots[0]).toEqual([
      { id: asArticleId('00000000-0000-0000-0000-000000000001'), count: 7 },
    ]);
    expect(calls.recomputeTrendScores).toEqual([30]);
    expect(calls.pruneMetricSnapshots).toEqual([35]);
  });

  it('API レスポンスに無い URL は 0 として記録する', async () => {
    const targets = [target('00000000-0000-0000-0000-000000000002', 'https://a.example/2')];
    const { deps, calls } = makeDeps(targets, new Map());

    await updateArticleMetrics(deps)();

    expect(calls.updateHatenaCounts[0]).toEqual([{ url: 'https://a.example/2', count: 0 }]);
    expect(calls.appendMetricSnapshots[0]?.[0]?.count).toBe(0);
  });

  it('sinceDays / retentionDays は入力で上書きできる', async () => {
    const targets = [target('00000000-0000-0000-0000-000000000003', 'https://a.example/3')];
    const { deps, calls } = makeDeps(targets, new Map([['https://a.example/3', 1]]));

    await updateArticleMetrics(deps)({ sinceDays: 7, retentionDays: 14 });

    expect(calls.recomputeTrendScores).toEqual([7]);
    expect(calls.pruneMetricSnapshots).toEqual([14]);
  });

  it('はてブ取得に失敗したら err を返し、書き込みはしない', async () => {
    const targets = [target('00000000-0000-0000-0000-000000000004', 'https://a.example/4')];
    const failing: BookmarkCountFetcher = vi.fn(async () => ({
      ok: false as const,
      error: 'boom',
    }));
    const { deps, calls } = makeDeps(targets, new Map(), failing);

    const result = await updateArticleMetrics(deps)();

    expect(result.ok).toBe(false);
    expect(calls.updateHatenaCounts).toHaveLength(0);
    expect(calls.recomputeTrendScores).toHaveLength(0);
  });
});
