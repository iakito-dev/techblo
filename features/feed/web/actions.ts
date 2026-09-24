'use server';

import { revalidateTag } from 'next/cache';
import { db } from '@/db/client';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { fetchBookmarkCounts } from '@/lib/hatena/count-client';
import { logger } from '@/lib/observability/logger';
import { ingestAllCompanies } from '@/lib/rss/ingest';
import type { Result } from '@/shared/result';
import { trackView } from '../application/track-view';
import { updateArticleMetrics } from '../application/update-article-metrics';
import { upsertArticles } from '../application/upsert-articles';
import type { FeedError } from '../domain/errors';
import { canRefreshNow } from '../domain/refresh-cooldown';
import { DrizzleArticleRepository } from '../infrastructure/drizzle-article-repository';
import { DrizzleCompanyRepository } from '../infrastructure/drizzle-company-repository';

const articleRepo = new DrizzleArticleRepository(db);
const companyRepo = new DrizzleCompanyRepository(db);

export type RefreshResult = {
  /** 取り込めた(新規 upsert された)記事数の合計。 */
  ingested: number;
  /** 取得に失敗した企業数。 */
  failed: number;
  /** 直近に取込済み(クールダウン中)のためクロールを省略したか。 */
  skipped: boolean;
};

/**
 * 「更新」ボタン用の Server Action。全企業の RSS をその場でクロール→upsert し、新着を取り込む。
 * 通常は毎時 cron(trigger/fetch-feed-articles.ts)が取り込むが、待たずに手動で最新を引きたい時用。
 * cron と同じ取込 + はてブ数更新を行い、最後に feed キャッシュを無効化して即反映する。
 * cron(Next ランタイム外)と違いここは Next ランタイムなので revalidateTag を直接呼べる。
 *
 * 注意: 全企業を同期クロールするため数秒〜十数秒かかる(Vercel の関数実行時間内)。
 * 1社の失敗・メトリクス取得失敗は全体を止めない。
 * 直近の取込試行(cron 含む)からクールダウン内なら何もせず skipped を返す(domain/refresh-cooldown.ts)。
 */
export async function refreshFeed(): Promise<RefreshResult> {
  const lastAttemptAt = await companyRepo.findLastIngestAttemptAt();
  if (!canRefreshNow(lastAttemptAt, new Date())) {
    return { ingested: 0, failed: 0, skipped: true };
  }

  const sink = upsertArticles({ articles: articleRepo });
  const results = await ingestAllCompanies(sink);

  const ingested = results.reduce((sum, r) => sum + r.count, 0);
  const failed = results.filter((r) => !r.ok).length;
  if (failed > 0) {
    logger.warn('refreshFeed: 一部の企業フィード取得に失敗', { failed, companies: results.length });
  }

  // 新着の人気スコア材料として、はてブ数も更新する(失敗しても止めない)。
  const metrics = await updateArticleMetrics({
    articles: articleRepo,
    fetchCounts: fetchBookmarkCounts,
  })();
  if (!metrics.ok) {
    logger.warn('refreshFeed: はてブ数の更新に失敗', { error: metrics.error });
  }

  // フィードキャッシュを無効化して、直後の再描画で新着を反映する(全バリアント)。
  revalidateTag(CACHE_TAGS.feed, 'max');
  return { ingested, failed, skipped: false };
}

/**
 * 記事の表示回数を加算する Server Action。
 * 未ログインでもカウントする(docs/features/feed.md)。
 * UI(記事カードクリック時の計測)への接続は M5。
 */
export async function trackArticleView(input: {
  articleId: string;
}): Promise<Result<void, FeedError>> {
  const result = await trackView({ articles: articleRepo })(input);
  if (!result.ok) {
    logger.error('trackView failed', { error: result.error, articleId: input.articleId });
  }
  return result;
}
