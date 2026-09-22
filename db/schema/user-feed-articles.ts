import { relations } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { userFeeds } from './user-feeds';

/**
 * ユーザー登録RSSから取り込んだ記事(プライベート)。
 *
 * 公開記事(articles)とは別テーブルに分離する。理由:
 * - 公開フィードは全ユーザー共有 + 公開キャッシュ('use cache')で、プライベートデータを混在させたくない
 * - url の一意性はフィード内(user_feed_id スコープ)に限定する。別ユーザーが同じ URL を登録できる
 */
export const userFeedArticles = pgTable(
  'user_feed_articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userFeedId: uuid('user_feed_id')
      .notNull()
      .references(() => userFeeds.id, { onDelete: 'cascade' }),

    // RSS取得時の重複排除キー(フィード内)。articles と違い global unique にはしない
    url: text('url').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    ogImage: text('og_image'),
    author: text('author'),

    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // フィード内の重複排除キー(upsert の ON CONFLICT 対象)
    uniqueIndex('user_feed_articles_feed_url_uq').on(t.userFeedId, t.url),
    // メインフィードへのマージクエリ(user_feed_id 群 × 新着順)用
    index('user_feed_articles_feed_published_idx').on(t.userFeedId, t.publishedAt.desc()),
  ],
);

export const userFeedArticlesRelations = relations(userFeedArticles, ({ one }) => ({
  feed: one(userFeeds, {
    fields: [userFeedArticles.userFeedId],
    references: [userFeeds.id],
  }),
}));

export type UserFeedArticle = typeof userFeedArticles.$inferSelect;
export type NewUserFeedArticle = typeof userFeedArticles.$inferInsert;
