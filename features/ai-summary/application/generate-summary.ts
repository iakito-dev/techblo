import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { ArticleId } from '@/shared/type-utils';
import type { ArticleContentFetcher } from '../domain/article-content-fetcher';
import {
  type ArticleSummary,
  parseBullets,
  parseOverview,
  parseTags,
  type SummarySource,
} from '../domain/article-summary';
import type { ArticleSummaryRepository } from '../domain/article-summary-repository';
import type { SummaryGenerator } from '../domain/summary-generator';

/**
 * 入力トークン上限の代理(文字数)。日本語はおおむね 1 文字 ≈ 1 トークン弱なので
 * 8k トークン相当として保守的に 12,000 文字でクランプ(コスト上限。ADR-0026)。
 */
export const MAX_INPUT_CHARS = 12_000;

export type GenerateSummaryInput = {
  articleId: ArticleId;
  url: string;
  title: string;
  /** RSS 抜粋(本文取得が失敗したときのフォールバック入力)。null/空のこともある。 */
  rssExcerpt: string | null;
};

/**
 * 1記事の要約を生成して永続化する(取込バッチから呼ぶ)。
 *
 * 1. 本文を一時取得(失敗時は RSS 抜粋へフォールバック)。両方空なら failed。
 * 2. 入力をクランプして LLM で3行要約を生成。
 * 3. 出力を検証(parseBullets)。通れば ready、壊れていれば failed を記録。
 *
 * 全文は保存しない。依存は引数注入(LLM/DB/fetch なしで単体テスト可能)。
 * カテゴリ分類はここでは行わない(独立ステップ。ADR-0034)。新規要約は category=null で始まる。
 */
export const generateSummary =
  (deps: {
    summaries: ArticleSummaryRepository;
    fetcher: ArticleContentFetcher;
    generator: SummaryGenerator;
  }) =>
  async (input: GenerateSummaryInput): Promise<Result<ArticleSummary, CommonError>> => {
    const { articleId, url, title, rssExcerpt } = input;
    const model = deps.generator.model;

    const fetched = await deps.fetcher.fetch({ articleId, url });
    const rawContent = fetched?.text ?? rssExcerpt ?? '';
    const source: SummarySource = fetched ? 'full_text' : 'rss_excerpt';
    const content = rawContent.trim().slice(0, MAX_INPUT_CHARS);

    if (content.length === 0) {
      return ok(await persistFailed(deps, articleId, model, source));
    }

    const raw = await deps.generator.generate({ title, content });
    const parsedOverview = parseOverview(raw.overview);
    const parsedBullets = parseBullets(raw.bullets);
    const parsedTags = parseTags(raw.tags);
    if (!parsedOverview.ok || !parsedBullets.ok || !parsedTags.ok) {
      return ok(await persistFailed(deps, articleId, model, source));
    }

    const summary: ArticleSummary = {
      articleId,
      overview: parsedOverview.overview,
      bullets: parsedBullets.bullets,
      tags: parsedTags.tags,
      category: null,
      model,
      source,
      status: 'ready',
      generatedAt: new Date(),
    };
    await deps.summaries.upsert(summary);
    return ok(summary);
  };

async function persistFailed(
  deps: { summaries: ArticleSummaryRepository },
  articleId: ArticleId,
  model: string,
  source: SummarySource,
): Promise<ArticleSummary> {
  const failed: ArticleSummary = {
    articleId,
    overview: '',
    bullets: [],
    tags: [],
    category: null,
    model,
    source,
    status: 'failed',
    generatedAt: new Date(),
  };
  await deps.summaries.upsert(failed);
  return failed;
}
