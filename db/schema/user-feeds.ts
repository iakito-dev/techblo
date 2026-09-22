import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { userFeedArticles } from './user-feed-articles';

/**
 * ユーザーが自分用に登録したRSSフィード(プライベート)。companies と違い登録者本人にだけ見える。
 * 取得ステータス列(last_fetched_at 等)は companies と同型で、即時取得・定期バッチが更新する。
 */
export const userFeeds = pgTable(
  'user_feeds',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    rssUrl: text('rss_url').notNull(),
    // 取得したフィードのタイトル。記事カードの企業名位置に表示する(取得不能時はホスト名で代替)
    title: text('title').notNull(),
    siteUrl: text('site_url'),

    enabled: boolean('enabled').notNull().default(true),

    // 取得ステータス(companies と同型)
    lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
    lastError: text('last_error'),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // 同一ユーザーが同じURLを重複登録するのを防ぐ
    uniqueIndex('user_feeds_user_url_uq').on(t.userId, t.rssUrl),
    // ユーザーの登録一覧・有効フィード解決用
    index('user_feeds_user_idx').on(t.userId),
  ],
);

export const userFeedsRelations = relations(userFeeds, ({ one, many }) => ({
  user: one(user, {
    fields: [userFeeds.userId],
    references: [user.id],
  }),
  articles: many(userFeedArticles),
}));

export type UserFeed = typeof userFeeds.$inferSelect;
export type NewUserFeed = typeof userFeeds.$inferInsert;
