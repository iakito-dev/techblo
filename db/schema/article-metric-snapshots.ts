import { relations } from 'drizzle-orm';
import { index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { articles } from './articles';

/**
 * 外部メトリクス(はてブ数)の時系列スナップショット(ADR-0018)。
 * 定期取得(trigger.dev)のたびに1行 append し、過去値との差分から
 * 伸び速度(velocity)= Δはてブ / 経過時間 を算出して articles.trend_score に焼く。
 * 対象は直近記事のみで、保持期間を過ぎた行は取得タスクが間引く。
 */
export const articleMetricSnapshots = pgTable(
  'article_metric_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),

    // 取得時点のはてなブックマーク数
    hatenaCount: integer('hatena_count').notNull(),

    // 取得時刻。velocity の窓(約24h前のスナップショット)を実時刻で引くためのキー
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // 「ある記事の captured_at が約24h前に最も近い行」を引く用 + 間引きの範囲スキャン用
    index('article_metric_snapshots_article_captured_idx').on(t.articleId, t.capturedAt.desc()),
  ],
);

export const articleMetricSnapshotsRelations = relations(articleMetricSnapshots, ({ one }) => ({
  article: one(articles, {
    fields: [articleMetricSnapshots.articleId],
    references: [articles.id],
  }),
}));

export type ArticleMetricSnapshot = typeof articleMetricSnapshots.$inferSelect;
export type NewArticleMetricSnapshot = typeof articleMetricSnapshots.$inferInsert;
