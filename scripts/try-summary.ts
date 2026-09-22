/**
 * AI要約の動作確認スクリプト(読み取り専用・DBには書き込まない)。
 * 実行: bun run scripts/try-summary.ts [articleId]
 *
 * 実記事1件の本文(取得失敗時は RSS 抜粋)で Gemini を呼び、生成された bullets/tags を表示する。
 * 永続化はしない(プロンプト/モデルの出力確認用)。
 */
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { articles } from '@/db/schema/articles';
import { MAX_INPUT_CHARS } from '@/features/ai-summary/application/generate-summary';
import { HtmlContentFetcher } from '@/features/ai-summary/infrastructure/html-content-fetcher';
import { LlmSummaryGenerator } from '@/features/ai-summary/infrastructure/llm-summary-generator';
import { createLlmClient } from '@/lib/ai/llm-client';
import { asArticleId } from '@/shared/type-utils';

const DEFAULT_ID = 'fa18a3fd-bed8-42c1-9280-11b5d7272783';

async function main() {
  const articleId = process.argv[2] ?? DEFAULT_ID;

  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      url: articles.url,
      description: articles.description,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  const article = rows[0];
  if (!article) {
    console.log(`記事が見つかりません: ${articleId}`);
    process.exit(1);
  }

  const fetcher = new HtmlContentFetcher();
  const fetched = await fetcher.fetch({ articleId: asArticleId(article.id), url: article.url });
  const source = fetched ? 'full_text' : 'rss_excerpt';
  const content = (fetched?.text ?? article.description ?? '').trim().slice(0, MAX_INPUT_CHARS);

  const generator = new LlmSummaryGenerator(createLlmClient());

  console.log('タイトル :', article.title);
  console.log('入力ソース:', source, `(${content.length} 文字)`);
  console.log('モデル   :', generator.model);
  console.log('生成中...\n');

  const out = await generator.generate({ title: article.title, content });

  console.log('bullets:');
  for (const b of out.bullets) console.log('  -', b);
  console.log('tags:', out.tags.join(' / '));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
