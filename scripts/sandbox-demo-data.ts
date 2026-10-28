/**
 * サンドボックス用のデモ記事を投入する(scripts/sandbox.sh から呼ぶ)。
 *
 * クラウドのエージェント環境は本番 DB にも RSS の取得先にも届かないため、画面を確かめるための
 * それらしい記事・要約・カテゴリ・はてブ数を、企業マスタ(seed 済み)に紐づけて作る。
 * 本番 DB に向けて実行しないよう、localhost 以外の DATABASE_URL では止める。
 */

import { db } from '@/db/client';
import { articleSummaries } from '@/db/schema/article-summaries';
import { articles } from '@/db/schema/articles';
import { companies } from '@/db/schema/companies';
import type { ARTICLE_CATEGORIES } from '@/shared/categories';

const TOPICS = [
  ['ai', 'LLM を使った社内検索の精度を 2 倍にした話', ['LLM', 'RAG', '検索']],
  ['ai', '生成 AI でコードレビューを半自動化するまで', ['生成AI', 'コードレビュー']],
  ['infra', 'Kubernetes クラスタのアップグレードを無停止で回す運用', ['Kubernetes', 'SRE']],
  [
    'infra',
    'PostgreSQL のパーティショニングで集計を 10 倍速くした',
    ['PostgreSQL', 'パフォーマンス'],
  ],
  ['devex', 'モノレポの CI を 40 分から 8 分に縮めた取り組み', ['CI/CD', 'モノレポ']],
  ['devex', 'TypeScript の型で設計ミスを防ぐ実践', ['TypeScript', '設計']],
  ['app', 'React Server Components 移行で見えた落とし穴', ['React', 'Next.js']],
  ['app', 'iOS アプリの起動時間を 30% 改善した計測と施策', ['iOS', 'パフォーマンス']],
  ['security', 'サプライチェーン攻撃に備える依存関係の棚卸し', ['セキュリティ', '依存関係']],
  ['security', 'ゼロトラスト移行 1 年目の振り返り', ['ゼロトラスト', '認証']],
  ['org', 'エンジニア組織を 50 人から 150 人にした 2 年間', ['組織', 'マネジメント']],
  [
    'org',
    'オンボーディングを 1 か月短縮したドキュメント文化',
    ['オンボーディング', 'ドキュメント'],
  ],
  ['event', '社内ハッカソン 2026 開催レポート', ['イベント', 'ハッカソン']],
] as const satisfies readonly (readonly [
  (typeof ARTICLE_CATEGORIES)[number],
  string,
  readonly string[],
])[];

const ARTICLES_PER_COMPANY = 6;
const HOUR = 60 * 60 * 1000;

async function main(): Promise<void> {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error(`サンドボックス以外の DB には投入しません: ${url.hostname}`);
  }

  const companyRows = await db.select({ id: companies.id, slug: companies.slug }).from(companies);
  if (companyRows.length === 0)
    throw new Error('企業マスタが空です。先に bun run db:seed を実行してください');

  const now = Date.now();
  const rows = companyRows.flatMap((company, ci) =>
    Array.from({ length: ARTICLES_PER_COMPANY }, (_, ai) => {
      // 企業をまたいで交互に並べる(新着が 1 社で埋まらないように)
      const n = ai * companyRows.length + ci;
      const [category, title, tags] = TOPICS[n % TOPICS.length] ?? TOPICS[0];
      // 新着は直近数時間〜約 2 か月前に散らし、人気は一部の記事に偏らせる(棚やランキングの見え方を確かめるため)
      const publishedAt = new Date(now - (n * 7 + (n % 5)) * HOUR);
      const hatena = n % 7 === 0 ? 300 + n * 3 : (n * 37) % 90;
      return {
        article: {
          companyId: company.id,
          url: `https://example.com/${company.slug}/posts/${ai + 1}`,
          title: `${title}(${company.slug} #${ai + 1})`,
          description: `${title}についての記事です。背景・やったこと・結果をまとめています。`,
          publishedAt,
          hatenaBookmarkCount: hatena,
          trendScore: hatena / (1 + (now - publishedAt.getTime()) / HOUR),
          viewCount: (n * 13) % 200,
          metricsFetchedAt: new Date(now),
        },
        summary: { category, tags: [...tags] },
      };
    }),
  );

  const inserted = await db
    .insert(articles)
    .values(rows.map((r) => r.article))
    .onConflictDoNothing({ target: articles.url })
    .returning({ id: articles.id, url: articles.url });

  const summaryByUrl = new Map(rows.map((r) => [r.article.url, r.summary]));
  const summaries = inserted.flatMap(({ id, url }) => {
    const s = summaryByUrl.get(url);
    if (!s) return [];
    return [
      {
        articleId: id,
        overview: 'デモ用の要約です。',
        bullets: [
          { heading: '背景', detail: '既存の仕組みで困っていたこと。' },
          { heading: '取り組み', detail: '試したことと、うまくいったこと。' },
          { heading: '結果', detail: '数字で見た改善。' },
        ],
        tags: s.tags,
        category: s.category,
        categorizedAt: new Date(now),
        model: 'sandbox',
        source: 'rss_excerpt' as const,
        status: 'ready' as const,
      },
    ];
  });
  if (summaries.length > 0)
    await db.insert(articleSummaries).values(summaries).onConflictDoNothing();

  process.stdout.write(
    `デモ記事 ${inserted.length} 件(要約 ${summaries.length} 件)を投入しました\n`,
  );
}

main()
  // postgres-js の接続が開いたままだとプロセスが終了しないため、成功時も明示的に終了する
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
