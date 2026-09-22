import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { companies } from '@/db/schema/companies';
import { logger } from '@/lib/observability/logger';
import type { Result } from '@/shared/result';
import { fetchFeed } from './fetcher';
import { parseFeed } from './parser';
import type { ArticleInput } from './types';

export type IngestResult = {
  companyId: string;
  slug: string;
  ok: boolean;
  count: number;
  error?: string;
};

/**
 * 記事を永続化する保存関数(Driven Port の関数版)。
 * lib/rss は feature 実装を知らないため、保存処理は呼び出し元から注入する
 * (lib → features の逆流を避ける)。
 */
export type ArticleSink = (
  companyId: string,
  items: ArticleInput[],
) => Promise<Result<number, string>>;

/**
 * 1社のフィードを取得 → パース → upsert し、companies のステータスを更新する。
 * throw せず IngestResult を返す(呼び出し側で集計)。
 */
export async function ingestCompany(
  company: {
    id: string;
    slug: string;
    rssUrl: string;
    feedTimezone: string | null;
  },
  sink: ArticleSink,
): Promise<IngestResult> {
  const fetched = await fetchFeed(company.rssUrl);
  if (!fetched.ok) {
    await recordFailure(company.id, fetched.error);
    return { companyId: company.id, slug: company.slug, ok: false, count: 0, error: fetched.error };
  }

  const parsed = parseFeed(fetched.value, { feedTimezone: company.feedTimezone });
  if (!parsed.ok) {
    await recordFailure(company.id, parsed.error.message);
    return {
      companyId: company.id,
      slug: company.slug,
      ok: false,
      count: 0,
      error: parsed.error.message,
    };
  }

  const upserted = await sink(company.id, parsed.value);
  if (!upserted.ok) {
    await recordFailure(company.id, upserted.error);
    return {
      companyId: company.id,
      slug: company.slug,
      ok: false,
      count: 0,
      error: upserted.error,
    };
  }

  await recordSuccess(company.id);
  logger.info('ingested company feed', { slug: company.slug, count: upserted.value });
  return { companyId: company.id, slug: company.slug, ok: true, count: upserted.value };
}

/**
 * 有効な企業のフィードを取り込む。
 * companyIds を渡すとその企業のみ(かつ enabled)、null/未指定なら enabled な全企業が対象。
 * 1社の失敗が全体を止めない(Promise.allSettled 相当)。
 */
export async function ingestCompanies(
  sink: ArticleSink,
  companyIds?: string[] | null,
): Promise<IngestResult[]> {
  // companyIds が空配列のときは対象なし(全件取得に化けさせない)
  if (companyIds && companyIds.length === 0) return [];

  const scope =
    companyIds && companyIds.length > 0
      ? and(eq(companies.enabled, true), inArray(companies.id, companyIds))
      : eq(companies.enabled, true);

  const rows = await db
    .select({
      id: companies.id,
      slug: companies.slug,
      rssUrl: companies.rssUrl,
      feedTimezone: companies.feedTimezone,
    })
    .from(companies)
    .where(scope);

  const results = await Promise.allSettled(rows.map((c) => ingestCompany(c, sink)));

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const c = rows[i];
    return {
      companyId: c?.id ?? 'unknown',
      slug: c?.slug ?? 'unknown',
      ok: false,
      count: 0,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}

/** 有効な全企業を取り込む(cron / スクリプト用)。購読企業に絞る版は ingestCompanies。 */
export function ingestAllCompanies(sink: ArticleSink): Promise<IngestResult[]> {
  return ingestCompanies(sink, null);
}

async function recordSuccess(companyId: string): Promise<void> {
  await db
    .update(companies)
    .set({ lastFetchedAt: new Date(), lastError: null, consecutiveFailures: 0 })
    .where(eq(companies.id, companyId));
}

async function recordFailure(companyId: string, message: string): Promise<void> {
  await db
    .update(companies)
    .set({
      lastError: message,
      lastErrorAt: new Date(),
      consecutiveFailures: sql`${companies.consecutiveFailures} + 1`,
    })
    .where(eq(companies.id, companyId));
  logger.warn('ingest failed', { companyId, error: message });
}
