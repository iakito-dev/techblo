import { err, ok, type Result } from '@/shared/result';
import type { ArticleRepository } from '../domain/article-repository';

/**
 * URL 群のはてなブックマーク数を取得する関数(Driven Port の関数版)。
 * 実装(lib/hatena)は web 層から注入する(application → lib の依存を避ける)。
 */
export type BookmarkCountFetcher = (urls: string[]) => Promise<Result<Map<string, number>, string>>;

/**
 * 直近 sinceDays 日の記事について、外部メトリクス(はてブ数)を取得して上書きし、
 * 時系列スナップショットを追記して伸び速度(velocity)ベースの trend_score を再計算する(ADR-0018)。
 * 「更新」ボタンと定期取得タスク(trigger.dev)の両方から呼ばれる。
 * throw せず Result を返す(失敗しても呼び出し側のフロー全体は止めない)。
 * API レスポンスに無い URL はブックマーク 0 として記録する。
 *
 * @param retentionDays スナップショットの保持日数。これを過ぎた行は間引く。
 */
export const updateArticleMetrics =
  (deps: { articles: ArticleRepository; fetchCounts: BookmarkCountFetcher }) =>
  async (
    input: { sinceDays?: number; retentionDays?: number } = {},
  ): Promise<Result<{ updated: number }, string>> => {
    const sinceDays = input.sinceDays ?? 30;
    const retentionDays = input.retentionDays ?? 35;
    try {
      const targets = await deps.articles.listRecentForMetrics(sinceDays);
      if (targets.length === 0) return ok({ updated: 0 });

      const counts = await deps.fetchCounts(targets.map((t) => t.url));
      if (!counts.ok) return err(counts.error);

      const withCount = targets.map((t) => ({ ...t, count: counts.value.get(t.url) ?? 0 }));

      // 現在値を上書き → 取得時点のスナップショットを追記 → 過去値との差分で trend_score を再計算 → 古い履歴を間引く。
      // 各文は独立(メトリクスは厳密な原子性を要しない)。元は neon-http のトランザクション不可に合わせた形(ADR-0033)。
      await deps.articles.updateHatenaCounts(
        withCount.map((t) => ({ url: t.url, count: t.count })),
      );
      await deps.articles.appendMetricSnapshots(
        withCount.map((t) => ({ id: t.id, count: t.count })),
      );
      await deps.articles.recomputeTrendScores(sinceDays);
      await deps.articles.pruneMetricSnapshots(retentionDays);

      return ok({ updated: withCount.length });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  };
