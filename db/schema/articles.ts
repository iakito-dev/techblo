import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { articleMetricSnapshots } from './article-metric-snapshots';
import { bookmarks } from './bookmarks';
import { companies } from './companies';
import { favorites } from './favorites';

/**
 * 記事本体。RSS取得時に upsert される(url unique がキー)。
 *
 * 集計カラム(view_count / bookmark_count / favorite_count)は INSERT/DELETE 時に増減更新する。
 * Race condition で多少ズレる可能性があるため、夜次バッチで定期的に再計算する想定。
 */
export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // RSS取得時の重複排除キー。同じ記事が複数回フィードに流れても1レコードに収束
    url: text('url').notNull().unique(),

    title: text('title').notNull(),
    // RSSの description / summary。HTMLを含む可能性があるため表示前にサニタイズ
    description: text('description'),
    // OGP og:image 等。取得時に試みて見つからなければ null
    ogImage: text('og_image'),
    author: text('author'),

    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),

    // 集計値(非正規化)
    viewCount: integer('view_count').notNull().default(0),
    bookmarkCount: integer('bookmark_count').notNull().default(0),
    favoriteCount: integer('favorite_count').notNull().default(0),

    // 外部シグナル: はてなブックマーク数(人気順の主シグナル。ADR-0014)。
    // 「更新」時にはてな公開APIから取得して上書きする。
    hatenaBookmarkCount: integer('hatena_bookmark_count').notNull().default(0),
    // 外部メトリクスを最後に取得した時刻(未取得は null)。再取得対象の判定に使う。
    metricsFetchedAt: timestamp('metrics_fetched_at', { withTimezone: true }),

    // 伸び速度(velocity)ベースの人気スコア(ADR-0018)。定期取得タスクが
    // 「Δはてブ / 経過時間」を計算して焼く。人気順(all)はこの列で並べる。
    // 事前計算列にすることで now() 非依存・索引可にしている。
    trendScore: doublePrecision('trend_score').notNull().default(0),

    // 論理削除(企業が記事を取り下げた等)
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // 「企業フィルタ後の新着順」用
    index('articles_company_published_idx').on(t.companyId, t.publishedAt.desc()),
    // 「全体の新着順」用
    index('articles_published_idx').on(t.publishedAt.desc()),
    // 「人気順」用
    index('articles_popularity_idx').on(t.viewCount.desc(), t.publishedAt.desc()),
    // 「人気順(velocity)」用。ORDER BY trend_score DESC, published_at DESC(ADR-0018)
    index('articles_trend_idx').on(t.trendScore.desc(), t.publishedAt.desc()),
    // ほかに検索(?q=)用の pg_trgm GIN(title/description)がカスタムマイグレーション
    // 0004_article_search_trgm.sql にある(gin_trgm_ops は drizzle-kit で表現できないため)
  ],
);

export const articlesRelations = relations(articles, ({ one, many }) => ({
  company: one(companies, {
    fields: [articles.companyId],
    references: [companies.id],
  }),
  bookmarks: many(bookmarks),
  favorites: many(favorites),
  metricSnapshots: many(articleMetricSnapshots),
}));

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
