import { relations, sql } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { articles } from './articles';
import { subscriptions } from './subscriptions';

/**
 * 企業マスタ。MVPでは6社固定。ユーザーは編集不可、開発者が追加(docs/guides/adding-a-company.md)。
 */
export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // 表示用名前(例: "メルカリ")
    name: text('name').notNull(),
    // URL や identifier 用(例: "mercari")
    slug: text('slug').notNull().unique(),

    rssUrl: text('rss_url').notNull(),
    // フィードの pubDate が壁時計時刻のみ/TZ を誤記している場合の補正用 IANA タイムゾーン
    // (例: 'Asia/Tokyo')。null なら宣言 TZ を信用。指定時は宣言 TZ を無視し壁時計をこの TZ で
    // 解釈する(ADR-0025)。
    feedTimezone: text('feed_timezone'),
    siteUrl: text('site_url').notNull(),
    // ブランドカラー(HEX、例: "#ff0211")
    brandColor: text('brand_color').notNull(),

    description: text('description'),

    // 取得対象として有効か。問題発生時に false にして取り込み停止
    enabled: boolean('enabled').notNull().default(true),

    // 取得ステータス
    lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
    lastError: text('last_error'),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),

    // 非正規化された記事数(夜次バッチで更新)。フィルタUI用
    articleCount: integer('article_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('companies_enabled_idx').on(t.enabled).where(sql`${t.enabled} = true`)],
);

export const companiesRelations = relations(companies, ({ many }) => ({
  articles: many(articles),
  subscriptions: many(subscriptions),
}));

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
