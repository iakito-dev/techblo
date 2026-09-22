import type { CommonError } from '@/shared/error';
import { ok, type Result } from '@/shared/result';
import type { ArticleId } from '@/shared/type-utils';
import { parseCategory } from '../domain/article-summary';
import type { ArticleSummaryRepository } from '../domain/article-summary-repository';
import type { CategoryClassifier } from '../domain/category-classifier';

export type ClassifyPendingCategoriesResult = {
  requested: number;
  classified: number;
  failed: number;
  classifiedArticleIds: ArticleId[];
};

/**
 * 未分類(status='ready' かつ category が null、または前回試行から1日以上経過した再試行対象)の
 * 記事を小さなバッチでカテゴリ分類する(取込バッチとは別ステップ。
 * ADR-0034)。
 *
 * 保存済み要約(title + overview + tags)だけを入力にするため、本文の再取得は行わない。
 * 分類が壊れている・classifier が失敗した場合も category=null のまま categorizedAt だけ更新し、
 * 「試行済み」を記録する(同じ記事を毎回叩き続けない)。
 */
export const classifyPendingCategories =
  (deps: {
    summaries: ArticleSummaryRepository;
    classifier: CategoryClassifier;
    getTitlesByIds: (ids: ArticleId[]) => Promise<Map<ArticleId, string>>;
  }) =>
  async (input: {
    limit: number;
  }): Promise<Result<ClassifyPendingCategoriesResult, CommonError>> => {
    const pendingIds = await deps.summaries.listUncategorizedArticleIds(input.limit);
    const titles = await deps.getTitlesByIds(pendingIds);
    const classifiedArticleIds: ArticleId[] = [];
    let classified = 0;
    let failed = 0;

    for (const articleId of pendingIds) {
      const title = titles.get(articleId);
      const summary = await deps.summaries.findByArticleId(articleId);

      // 記事タイトルまたは要約(overview/tags)が引けない場合は分類対象にできない。
      // 試行そのものが成立していないため categorizedAt は更新しない。
      if (title === undefined || !summary) {
        failed += 1;
        continue;
      }

      const now = new Date();
      const raw = await deps.classifier
        .classify({ title, overview: summary.overview, tags: summary.tags })
        .catch(() => '');
      const parsed = parseCategory(raw);

      if (parsed.ok) {
        await deps.summaries.updateCategory(articleId, parsed.category, now);
        classified += 1;
        classifiedArticleIds.push(articleId);
      } else {
        await deps.summaries.updateCategory(articleId, null, now);
        failed += 1;
      }
    }

    return ok({
      requested: input.limit,
      classified,
      failed,
      classifiedArticleIds,
    });
  };
