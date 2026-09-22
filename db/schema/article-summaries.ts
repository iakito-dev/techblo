import { relations, sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { ArticleCategory } from '@/shared/categories';
import { articles } from './articles';

/**
 * AI記事要約(ADR-0026)。記事 1:1。
 *
 * 本文は保存しない。取込時に本文(または RSS 抜粋)を一時取得して LLM で3行要約とタグを生成し、
 * 派生物である要約(bullets)と表示用タグ(tags)だけを永続化する。
 *
 * 記事カテゴリ(職能軸。design/category-taxonomy.md, ADR-0034)は保存済み要約(title/overview/tags)を
 * 入力にした別ステップで分類するため、要約生成とは非同期に埋まる(category/categorized_at は nullable)。
 */
export const articleSummaries = pgTable(
  'article_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // 1記事1要約。記事削除で要約も物理削除。
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),

    // 記事全体を1文で表す概要(TL;DR)。列追加以前の既存行は NULL のため nullable。
    overview: text('overview'),

    // 補足の箇条書き(見出し+説明。domain で件数 1〜3・各長さに制約)。
    // 旧データは string[] のことがあり、Repository の toDomain で吸収する。
    bullets: jsonb('bullets').$type<{ heading: string; detail: string }[]>().notNull(),

    // 表示用の関連タグ(domain で最大5件に制約)。検索/分類の正規化タグではない。
    tags: jsonb('tags').$type<string[]>().notNull().default([]),

    // 記事カテゴリ(職能軸、7種。定義は shared/categories.ts)。分類ステップ未実行 or 分類失敗は null。
    category: text('category').$type<ArticleCategory>(),

    // カテゴリ分類を試みた時刻。成功・失敗どちらでも記録し、無限リトライ・毎回全件再試行を防ぐ
    // (application 層が「未分類 かつ 未試行 or 試行から1日以上経過」を再試行対象にする)。
    categorizedAt: timestamp('categorized_at', { withTimezone: true }),

    // 生成に使ったモデル ID(例: 'claude-haiku-4-5')。再現性・モデル移行の判別用。
    model: text('model').notNull(),

    // 入力ソース。本文取得成功は 'full_text'、フォールバックは 'rss_excerpt'。
    source: text('source').$type<'full_text' | 'rss_excerpt'>().notNull(),

    // 生成状態。失敗を記録して無限リトライ・再課金を防ぐ。
    status: text('status').$type<'ready' | 'failed'>().notNull(),

    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // ダイアログ表示時の単発参照キー兼、1記事1要約の冪等性キー(upsert の onConflict 対象)。
    uniqueIndex('article_summaries_article_uq').on(t.articleId),
    // 棚(カテゴリ別セクション)の取得用。要約が ready の行だけが表示対象なので部分インデックスで絞る。
    index('article_summaries_category_ready_idx').on(t.category).where(sql`${t.status} = 'ready'`),
  ],
);

export const articleSummariesRelations = relations(articleSummaries, ({ one }) => ({
  article: one(articles, {
    fields: [articleSummaries.articleId],
    references: [articles.id],
  }),
}));

export type ArticleSummaryRow = typeof articleSummaries.$inferSelect;
export type NewArticleSummaryRow = typeof articleSummaries.$inferInsert;
