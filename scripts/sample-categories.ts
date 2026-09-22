/**
 * カテゴリ分布の確認スクリプト(読み取り専用・DBには一切書き込まない)。
 * 実行: bun run scripts/sample-categories.ts
 *
 * 直近30日の記事を企業ごとに上限件数で抽出し、article_summaries.category の分布
 * (件数・割合・未分類数)を表示する(design/category-taxonomy.md §5 の検証と同じ観点)。
 * バックフィル・分類バッチ実行後に「棚の偏りが無いか」を素早く確認する用途。
 */
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { articleSummaries } from '@/db/schema/article-summaries';
import { articles } from '@/db/schema/articles';
import { companies } from '@/db/schema/companies';
import { type ArticleCategory, CATEGORY_DEFINITIONS } from '@/shared/categories';

/** 企業ごとの偏りを抑えるための上限件数(母集団比重の大きい企業がサンプルを支配しないよう抑える)。 */
const LIMIT_PER_COMPANY = 20;
const LOOKBACK_DAYS = 30;

type SampleRow = {
  companyName: string;
  category: ArticleCategory | null;
};

async function fetchSample(): Promise<SampleRow[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // 企業ごとに新着順で上限件数だけ拾う(PARTITION BY company_id の window 関数を使う)。
  const ranked = db.$with('ranked').as(
    db
      .select({
        companyId: articles.companyId,
        category: articleSummaries.category,
        rank: sql<number>`row_number() over (partition by ${articles.companyId} order by ${articles.publishedAt} desc)`.as(
          'rank',
        ),
      })
      .from(articles)
      .leftJoin(articleSummaries, eq(articleSummaries.articleId, articles.id))
      .where(and(isNull(articles.deletedAt), gte(articles.publishedAt, since))),
  );

  const rows = await db
    .with(ranked)
    .select({
      companyName: companies.name,
      category: ranked.category,
    })
    .from(ranked)
    .innerJoin(companies, eq(companies.id, ranked.companyId))
    .where(sql`${ranked.rank} <= ${LIMIT_PER_COMPANY}`)
    .orderBy(desc(companies.name));

  return rows.map((r) => ({
    companyName: r.companyName,
    category: (r.category as ArticleCategory | null) ?? null,
  }));
}

function printDistribution(sample: SampleRow[]): void {
  const total = sample.length;
  const counts = new Map<string, number>();
  let uncategorized = 0;

  for (const row of sample) {
    if (!row.category) {
      uncategorized += 1;
      continue;
    }
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }

  console.log(
    `サンプル件数: ${total}(直近${LOOKBACK_DAYS}日・企業ごと上限${LIMIT_PER_COMPANY}件)\n`,
  );
  console.log('カテゴリ別分布:');
  for (const def of CATEGORY_DEFINITIONS) {
    const count = counts.get(def.key) ?? 0;
    const pct = total === 0 ? 0 : (count / total) * 100;
    console.log(
      `  ${def.isShelf ? '棚' : '別枠'} ${def.label.padEnd(14, '　')} ${String(count).padStart(4)}件  ${pct.toFixed(1)}%`,
    );
  }
  const uncategorizedPct = total === 0 ? 0 : (uncategorized / total) * 100;
  console.log(`\n未分類: ${uncategorized}件(${uncategorizedPct.toFixed(1)}%)`);
}

async function main() {
  const sample = await fetchSample();
  printDistribution(sample);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
