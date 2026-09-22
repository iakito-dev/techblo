/**
 * 手動取り込みスクリプト: 全企業のRSSを取得して articles に投入。
 * 実行: bun run scripts/ingest.ts
 *
 * 本番では trigger/fetch-feed-articles.ts(Trigger.dev schedule)が ingestAllCompanies を呼ぶ。
 * このスクリプトはローカル検証用。
 */

import { db } from '@/db/client';
import { upsertArticles } from '@/features/feed/application/upsert-articles';
import { DrizzleArticleRepository } from '@/features/feed/infrastructure/drizzle-article-repository';
import { logger } from '@/lib/observability/logger';
import { ingestAllCompanies } from '@/lib/rss/ingest';

async function main() {
  // composition root: repository を組み立て、保存ユースケースを sink として注入する
  const sink = upsertArticles({ articles: new DrizzleArticleRepository(db) });
  const results = await ingestAllCompanies(sink);
  const total = results.reduce((sum, r) => sum + r.count, 0);
  const failed = results.filter((r) => !r.ok);

  logger.info('ingest done', {
    companies: results.length,
    totalArticles: total,
    failed: failed.length,
  });

  for (const r of results) {
    const status = r.ok ? `✅ ${r.count}件` : `❌ ${r.error}`;
    console.log(`  ${r.slug.padEnd(14)} ${status}`);
  }

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  logger.error('ingest script failed', { error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
});
