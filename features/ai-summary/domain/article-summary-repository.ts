import type { ArticleId } from '@/shared/type-utils';
import type { ArticleCategory, ArticleSummary } from './article-summary';

/**
 * Driven Port。要約の永続化インターフェース。実装は infrastructure 層(Drizzle)。
 */
export interface ArticleSummaryRepository {
  /** 記事ページ表示用。要約が無ければ null。 */
  findByArticleId(articleId: ArticleId): Promise<ArticleSummary | null>;

  /** 1記事1要約で upsert(冪等。article_summaries_article_uq が衝突キー)。 */
  upsert(summary: ArticleSummary): Promise<void>;

  /**
   * まだ要約が無い(または status='failed' で再試行対象の)記事 id を返す。
   * 取込バッチが「未要約だけ処理する」ために使う。
   */
  listPendingArticleIds(limit: number): Promise<ArticleId[]>;

  /**
   * カテゴリ未分類(または前回の分類試行から1日以上経過した再試行対象)の記事 id を返す。
   * 要約が status='ready' の記事のみ対象(概要・タグが揃っていないと分類できないため)。
   */
  listUncategorizedArticleIds(limit: number): Promise<ArticleId[]>;

  /**
   * 分類結果を保存する。category は分類失敗時 null を許容し、その場合も categorizedAt だけ
   * 更新して「試行済み」を記録する(同じ記事への無限リトライを防ぐ)。
   */
  updateCategory(
    articleId: ArticleId,
    category: ArticleCategory | null,
    categorizedAt: Date,
  ): Promise<void>;
}
