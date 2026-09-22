import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { articles } from './articles';
import { user } from './auth';

/**
 * 既読マーク(記事ダイアログを開いたタイミングで記録)。
 * ブックマーク/お気に入りと違い「全記事に及びうる」per-user 状態なので、
 * 一覧で全件返すのではなく「表示中の記事 ID 集合に絞って既読判定する」(ADR-0021)。
 */
export const reads = pgTable(
  'reads',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),

    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // unique 索引 (userId, articleId) が重複防止に加え、「表示中の記事のうち既読はどれか」の
  // 絞り込み(EXISTS/NOT EXISTS)・per-page 既読判定の索引も兼ねる(同一列の非 unique 索引は冗長)。
  (t) => [uniqueIndex('reads_user_article_uq').on(t.userId, t.articleId)],
);

export const readsRelations = relations(reads, ({ one }) => ({
  user: one(user, {
    fields: [reads.userId],
    references: [user.id],
  }),
  article: one(articles, {
    fields: [reads.articleId],
    references: [articles.id],
  }),
}));

export type Read = typeof reads.$inferSelect;
export type NewRead = typeof reads.$inferInsert;
