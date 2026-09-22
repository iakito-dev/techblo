import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type { Database } from '@/db/client';
import { type ArticleSummaryRow, articleSummaries } from '@/db/schema/article-summaries';
import { articles } from '@/db/schema/articles';
import { type ArticleId, asArticleId } from '@/shared/type-utils';
import {
  type ArticleCategory,
  type ArticleSummary,
  type ArticleSummaryBullet,
  parseCategory,
} from '../domain/article-summary';
import type { ArticleSummaryRepository } from '../domain/article-summary-repository';

/** 分類の再試行間隔。この期間を過ぎた未分類は再度分類対象にする(連続失敗の抑制)。 */
const RECLASSIFY_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * 保存済み bullets をドメイン形({heading, detail})へ。
 * 旧データ(見出しのみの string[])は detail 空で吸収し、UI 側で見出しだけ表示できるようにする。
 */
function toBullets(raw: unknown): ArticleSummaryBullet[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b) =>
    typeof b === 'string'
      ? { heading: b, detail: '' }
      : {
          heading: String((b as ArticleSummaryBullet).heading ?? ''),
          detail: String((b as ArticleSummaryBullet).detail ?? ''),
        },
  );
}

/** 保存済み category を検証して domain へ。不正値(スキーマ変更前の値等)は null にフォールバック。 */
function toCategory(raw: unknown): ArticleCategory | null {
  if (raw === null || raw === undefined) return null;
  const parsed = parseCategory(raw);
  return parsed.ok ? parsed.category : null;
}

function toDomain(row: ArticleSummaryRow): ArticleSummary {
  return {
    articleId: asArticleId(row.articleId),
    overview: row.overview ?? '',
    bullets: toBullets(row.bullets),
    tags: row.tags,
    category: toCategory(row.category),
    model: row.model,
    source: row.source,
    status: row.status,
    generatedAt: row.generatedAt,
  };
}

/**
 * ArticleSummaryRepository の Drizzle 実装(Driven Adapter)。
 * upsert は article_summaries_article_uq を衝突キーにした冪等更新(単一文で完結。元は neon-http のトランザクション非対応に合わせた形だが postgres-js 移行後もそのまま有効。ADR-0033)。
 */
export class DrizzleArticleSummaryRepository implements ArticleSummaryRepository {
  constructor(private readonly db: Database) {}

  async findByArticleId(articleId: ArticleId): Promise<ArticleSummary | null> {
    const rows = await this.db
      .select()
      .from(articleSummaries)
      .where(eq(articleSummaries.articleId, articleId))
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async upsert(summary: ArticleSummary): Promise<void> {
    const now = new Date();
    await this.db
      .insert(articleSummaries)
      .values({
        articleId: summary.articleId,
        overview: summary.overview,
        bullets: summary.bullets,
        tags: summary.tags,
        model: summary.model,
        source: summary.source,
        status: summary.status,
        generatedAt: summary.generatedAt,
      })
      .onConflictDoUpdate({
        target: articleSummaries.articleId,
        set: {
          overview: summary.overview,
          bullets: summary.bullets,
          tags: summary.tags,
          model: summary.model,
          source: summary.source,
          status: summary.status,
          generatedAt: summary.generatedAt,
          updatedAt: now,
        },
      });
  }

  async listPendingArticleIds(limit: number): Promise<ArticleId[]> {
    // 未要約(LEFT JOIN で要約行が無い)または status='failed'(再試行対象)を新着順で。
    const rows = await this.db
      .select({ id: articles.id })
      .from(articles)
      .leftJoin(articleSummaries, eq(articleSummaries.articleId, articles.id))
      .where(
        and(
          isNull(articles.deletedAt),
          or(isNull(articleSummaries.id), eq(articleSummaries.status, 'failed')),
        ),
      )
      .orderBy(sql`${articles.publishedAt} desc`)
      .limit(limit);
    return rows.map((r) => asArticleId(r.id));
  }

  async listUncategorizedArticleIds(limit: number): Promise<ArticleId[]> {
    // 要約が ready(overview/tags が揃っている)かつ、未分類 or 前回試行から1日以上経過した再試行対象。
    const retryBefore = new Date(Date.now() - RECLASSIFY_AFTER_MS);
    const rows = await this.db
      .select({ articleId: articleSummaries.articleId })
      .from(articleSummaries)
      .where(
        and(
          eq(articleSummaries.status, 'ready'),
          isNull(articleSummaries.category),
          or(
            isNull(articleSummaries.categorizedAt),
            lt(articleSummaries.categorizedAt, retryBefore),
          ),
        ),
      )
      .orderBy(sql`${articleSummaries.generatedAt} desc`)
      .limit(limit);
    return rows.map((r) => asArticleId(r.articleId));
  }

  async updateCategory(
    articleId: ArticleId,
    category: ArticleCategory | null,
    categorizedAt: Date,
  ): Promise<void> {
    await this.db
      .update(articleSummaries)
      .set({ category, categorizedAt, updatedAt: new Date() })
      .where(eq(articleSummaries.articleId, articleId));
  }
}
