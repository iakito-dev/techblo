import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { articles } from './articles';
import { user } from './auth';

/**
 * お気に入り。良かった記事を永続的に保存(ADR-0006)。
 * スキーマ的には bookmarks とほぼ同一だが、用途が異なるため別テーブル。
 */
export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('favorites_user_article_uq').on(t.userId, t.articleId),
    index('favorites_user_created_idx').on(t.userId, t.createdAt.desc()),
  ],
);

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(user, {
    fields: [favorites.userId],
    references: [user.id],
  }),
  article: one(articles, {
    fields: [favorites.articleId],
    references: [articles.id],
  }),
}));

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
