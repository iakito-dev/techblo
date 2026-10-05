import {
  and,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  notExists,
  or,
  sql,
} from 'drizzle-orm';
import type { Database } from '@/db/client';
import { articleMetricSnapshots } from '@/db/schema/article-metric-snapshots';
import { articleSummaries } from '@/db/schema/article-summaries';
import { articles } from '@/db/schema/articles';
import { companies } from '@/db/schema/companies';
import { reads } from '@/db/schema/reads';
// ユーザー登録RSS(プライベート)はメインフィードに UNION ALL でマージする(ADR-0014)。
// db/schema は共有インフラなので feed の Repository から読んでよい(features 間 import 禁止はコード依存の話)。
import { userFeedArticles } from '@/db/schema/user-feed-articles';
import { userFeeds } from '@/db/schema/user-feeds';
// タグ絞り込みの canonical→類義語展開(キュレーションは lib/tags が真実源。ADR-0027)。
import { expandTag } from '@/lib/tags/curated';
import type { ArticleCategory } from '@/shared/categories';
import { type ArticleId, asArticleId, type CompanyId } from '@/shared/type-utils';
import type { Article, ArticleDraft } from '../domain/article';
import type {
  ArticleMetricsTarget,
  ArticleRepository,
  CategorizedArticle,
  CategoryCounts,
  HatenaCount,
  ListCriteria,
  ListLatestByCategoriesCriteria,
  MetricSnapshotInput,
  SitemapArticle,
} from '../domain/article-repository';
import { PERIOD_DAYS } from '../domain/feed-sort';
import {
  POPULARITY_GRAVITY,
  POPULARITY_WEIGHTS,
  TREND_GRAVITY,
  VELOCITY_WINDOW_HOURS,
} from '../domain/popularity';
import { type ArticleRow, toArticle } from './article-mapper';
import { escapeLike } from './escape-like';

// list / findById で共有する select 列(articles + companies join)
const ARTICLE_COLUMNS = {
  id: articles.id,
  url: articles.url,
  title: articles.title,
  description: articles.description,
  ogImage: articles.ogImage,
  author: articles.author,
  publishedAt: articles.publishedAt,
  viewCount: articles.viewCount,
  bookmarkCount: articles.bookmarkCount,
  favoriteCount: articles.favoriteCount,
  hatenaBookmarkCount: articles.hatenaBookmarkCount,
  companyId: articles.companyId,
  companySlug: companies.slug,
  companyName: companies.name,
  companyBrandColor: companies.brandColor,
};

/**
 * ArticleRepository の Drizzle 実装(Driven Adapter)。
 * SQL 組立はこの層に閉じ込め、ドメイン/アプリケーション層は DB を知らない。
 */
export class DrizzleArticleRepository implements ArticleRepository {
  constructor(private readonly db: Database) {}

  /**
   * 共通の WHERE 条件: 削除除外 + 企業フィルタ + 期間ウィンドウ(today/week/month) + 未読/既読フィルタ。
   * readFilter は (userId, articleId) の reads 行に対する相関サブクエリ(reads_user_article_uq に乗る)。
   * unread = NOT EXISTS、read = EXISTS。全記事に及ぶ既読集合を取得せず SQL 側で絞るのが肝(ADR-0021)。
   * query は title/description の ILIKE 部分一致(pg_trgm GIN が効く。ADR-0022)。
   */
  private filters(
    criteria: Pick<
      ListCriteria,
      'companyIds' | 'period' | 'readFilter' | 'query' | 'tag' | 'category'
    >,
  ) {
    const conditions = [isNull(articles.deletedAt)];
    if (criteria.companyIds && criteria.companyIds.length > 0) {
      conditions.push(inArray(articles.companyId, criteria.companyIds));
    }
    if (criteria.period && criteria.period !== 'all') {
      const days = PERIOD_DAYS[criteria.period];
      conditions.push(gte(articles.publishedAt, sql`now() - make_interval(days => ${days})`));
    }
    if (criteria.readFilter) {
      const { userId, mode } = criteria.readFilter;
      const readRow = this.db
        .select({ one: sql`1` })
        .from(reads)
        .where(and(eq(reads.userId, userId), eq(reads.articleId, articles.id)));
      conditions.push(mode === 'read' ? exists(readRow) : notExists(readRow));
    }
    if (criteria.query) {
      const pattern = `%${escapeLike(criteria.query)}%`;
      const match = or(ilike(articles.title, pattern), ilike(articles.description, pattern));
      // or() の戻りは SQL | undefined(引数ありなら実際は常に定義される)
      if (match) conditions.push(match);
    }
    if (criteria.tag) {
      // ready な要約が、canonical タグの類義語のいずれかを含む記事に絞る(ADR-0027)。
      // canonical(?tag=)を lib/tags の固定キュレーションで生タグ群へ展開し、各タグの jsonb @>
      // 包含判定を OR する(完全一致の OR なので各項とも tags の GIN が効く)。
      // タグは ai-summary の所有だが、db/schema は共有インフラなので Repository から参照してよい(companies/reads と同様)。
      const tagMatch = or(
        ...expandTag(criteria.tag).map(
          (t) => sql`${articleSummaries.tags} @> ${JSON.stringify([t])}::jsonb`,
        ),
      );
      const tagRow = this.db
        .select({ one: sql`1` })
        .from(articleSummaries)
        .where(
          and(
            eq(articleSummaries.articleId, articles.id),
            eq(articleSummaries.status, 'ready'),
            tagMatch,
          ),
        );
      conditions.push(exists(tagRow));
    }
    if (criteria.category) {
      // タグ絞り込みと同型の EXISTS(article_summaries が ready かつ category 完全一致。ADR-0034)。
      const categoryRow = this.db
        .select({ one: sql`1` })
        .from(articleSummaries)
        .where(
          and(
            eq(articleSummaries.articleId, articles.id),
            eq(articleSummaries.status, 'ready'),
            eq(articleSummaries.category, criteria.category),
          ),
        );
      conditions.push(exists(categoryRow));
    }
    return conditions;
  }

  async list(criteria: ListCriteria): Promise<Article[]> {
    // ユーザー登録RSS をマージする主経路(新着順・フィルタ/検索なし)。ADR-0014。
    // タグ絞り込みは公開記事のみ対象なのでマージ経路に乗せない(usecase 側でも userFeedIds を落としている)。
    if (
      criteria.userFeedIds &&
      criteria.userFeedIds.length > 0 &&
      criteria.sort !== 'popular' &&
      !criteria.tag
    ) {
      return this.listMerged(criteria, criteria.userFeedIds);
    }

    let orderBy: ReturnType<typeof desc>[];
    if (criteria.sort !== 'popular') {
      orderBy = [desc(articles.publishedAt), desc(articles.id)];
    } else if (criteria.period === 'today' || criteria.period === 'week') {
      // 短期は「今伸びている」= 伸び速度(velocity)。定期取得タスクが事前計算した
      // trend_score 列で並べる(now() 非依存・索引可。ADR-0018)。同点は新着順
      orderBy = [desc(articles.trendScore), desc(articles.publishedAt)];
    } else {
      // 長期(今月 / 全期間)は単純なはてブ数(累計の絶対値)。殿堂的な人気を見る。同点は新着順
      orderBy = [desc(articles.hatenaBookmarkCount), desc(articles.publishedAt)];
    }

    const rows: ArticleRow[] = await this.db
      .select(ARTICLE_COLUMNS)
      .from(articles)
      .innerJoin(companies, eq(articles.companyId, companies.id))
      .where(and(...this.filters(criteria)))
      .orderBy(...orderBy)
      .limit(criteria.limit)
      .offset(criteria.offset);

    return rows.map(toArticle);
  }

  /**
   * 公開記事(articles)とユーザー登録RSS(user_feed_articles)を新着順でオフセットページネーションする(ADR-0014)。
   * 2ソースを跨いだ正しいページ境界には DB の UNION が必須(アプリ側で2クエリを手マージするとページ境界が破綻する)。
   * includePublicArticles=false(?feed のみのフィルタ)では公開ブランチを省き user_feed_articles 単独で引く。
   *
   * ユーザー記事は表示 DTO(ArticleCard)の company 欄を擬似的に埋める:
   * name=フィードタイトル, slug='user-feed', brandColor=中立色。ファビコンは記事 URL から導出される。
   * popular の人気シグナル(trend_score/はてブ)は持たないため、この経路は新着順専用。
   */
  private async listMerged(criteria: ListCriteria, userFeedIds: string[]): Promise<Article[]> {
    const companyIds = criteria.companyIds;
    const includePublic = criteria.includePublicArticles !== false;
    const periodDays =
      criteria.period && criteria.period !== 'all' ? PERIOD_DAYS[criteria.period] : null;

    const inUuids = (ids: string[]) =>
      sql.join(
        ids.map((id) => sql`${id}::uuid`),
        sql`, `,
      );
    const periodCond = (col: string) =>
      periodDays === null
        ? sql``
        : sql` and ${sql.raw(col)} >= now() - make_interval(days => ${periodDays})`;
    const companyCond =
      companyIds && companyIds.length > 0
        ? sql` and a.company_id in (${inUuids(companyIds)})`
        : sql``;

    // 列順・別名を両ブランチで揃える(UNION では先頭 select の別名が採用される。単独でも引けるよう双方に付ける)。
    const publicSelect = sql`
      select
        a.id as "id", a.url as "url", a.title as "title", a.description as "description",
        a.og_image as "ogImage", a.author as "author", a.published_at as "publishedAt",
        a.view_count as "viewCount", a.bookmark_count as "bookmarkCount",
        a.favorite_count as "favoriteCount", a.hatena_bookmark_count as "hatenaBookmarkCount",
        a.company_id as "companyId", c.slug as "companySlug", c.name as "companyName",
        c.brand_color as "companyBrandColor"
      from ${articles} as a
      join ${companies} as c on c.id = a.company_id
      where a.deleted_at is null${companyCond}${periodCond('a.published_at')}`;
    const userSelect = sql`
      select
        ufa.id as "id", ufa.url as "url", ufa.title as "title", ufa.description as "description",
        ufa.og_image as "ogImage", ufa.author as "author", ufa.published_at as "publishedAt",
        0 as "viewCount", 0 as "bookmarkCount", 0 as "favoriteCount", 0 as "hatenaBookmarkCount",
        uf.id as "companyId", 'user-feed' as "companySlug", uf.title as "companyName",
        '#64748b' as "companyBrandColor"
      from ${userFeedArticles} as ufa
      join ${userFeeds} as uf on uf.id = ufa.user_feed_id
      where ufa.user_feed_id in (${inUuids(userFeedIds)})${periodCond('ufa.published_at')}`;

    const inner = includePublic ? sql`${publicSelect} union all ${userSelect}` : userSelect;

    const result = await this.db.execute(sql`
      select * from (${inner}) m
      order by m."publishedAt" desc, m."id" desc
      limit ${criteria.limit} offset ${criteria.offset}
    `);
    // postgres-js は db.execute(raw) で行配列を直返しする。
    const rows = result as unknown as ArticleRow[];

    return rows.map(toArticle);
  }

  async findById(id: ArticleId): Promise<Article | null> {
    const rows: ArticleRow[] = await this.db
      .select(ARTICLE_COLUMNS)
      .from(articles)
      .innerJoin(companies, eq(articles.companyId, companies.id))
      .where(and(isNull(articles.deletedAt), eq(articles.id, id)))
      .limit(1);
    const row = rows[0];
    return row ? toArticle(row) : null;
  }

  async listByIds(ids: ArticleId[]): Promise<Article[]> {
    if (ids.length === 0) return [];
    const rows: ArticleRow[] = await this.db
      .select(ARTICLE_COLUMNS)
      .from(articles)
      .innerJoin(companies, eq(articles.companyId, companies.id))
      .where(and(isNull(articles.deletedAt), inArray(articles.id, ids)));
    return rows.map(toArticle);
  }

  async listForSitemap(limit: number): Promise<SitemapArticle[]> {
    const rows = await this.db
      .select({ id: articles.id, updatedAt: articles.updatedAt })
      .from(articles)
      .where(isNull(articles.deletedAt))
      .orderBy(desc(articles.publishedAt), desc(articles.id))
      .limit(limit);
    return rows.map((r) => ({ id: asArticleId(r.id), updatedAt: r.updatedAt }));
  }

  /**
   * カテゴリ別セクション(棚)用に、カテゴリごとの新着記事をまとめて1クエリで取得する(ADR-0034)。
   * article_summaries を status='ready' かつ category が対象群のものに絞って articles と join し、
   * row_number() over (partition by category order by published_at desc) <= perCategory の
   * ウィンドウ関数で「カテゴリごとの上位 N 件」を1クエリに集約する(カテゴリ数ぶんのクエリを避ける)。
   * 呼び出し側(application)が新着記事との重複除外後に3本へ切り詰めるため、perCategory には
   * 表示件数より多めの値を渡す想定(ここでは削らない)。
   */
  async listLatestByCategories(
    criteria: ListLatestByCategoriesCriteria,
  ): Promise<CategorizedArticle[]> {
    if (criteria.categories.length === 0) return [];

    const categoriesCond = sql.join(
      criteria.categories.map((c) => sql`${c}`),
      sql`, `,
    );
    const companyCond =
      criteria.companyIds && criteria.companyIds.length > 0
        ? sql`and a.company_id in (${sql.join(
            criteria.companyIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})`
        : sql``;

    const result = await this.db.execute(sql`
      select * from (
        select
          a.id as "id", a.url as "url", a.title as "title", a.description as "description",
          a.og_image as "ogImage", a.author as "author", a.published_at as "publishedAt",
          a.view_count as "viewCount", a.bookmark_count as "bookmarkCount",
          a.favorite_count as "favoriteCount", a.hatena_bookmark_count as "hatenaBookmarkCount",
          a.company_id as "companyId", c.slug as "companySlug", c.name as "companyName",
          c.brand_color as "companyBrandColor",
          s.category as "category",
          row_number() over (partition by s.category order by a.published_at desc) as "rn"
        from ${articles} as a
        join ${companies} as c on c.id = a.company_id
        join ${articleSummaries} as s on s.article_id = a.id
        where a.deleted_at is null
          and s.status = 'ready'
          and s.category in (${categoriesCond})
          ${companyCond}
      ) ranked
      where ranked."rn" <= ${criteria.perCategory}
      order by ranked."category", ranked."publishedAt" desc
    `);
    // postgres-js は db.execute(raw) で行配列を直返しする。
    const rows = result as unknown as (ArticleRow & { category: ArticleCategory; rn: number })[];

    return rows.map((r) => ({ ...toArticle(r), category: r.category }));
  }

  /**
   * 関連記事用に、対象記事と AI要約タグを共有する記事を共有タグ数の多い順で取得する(ADR-0037)。
   * 対象タグを CTE に展開し、各候補の tags と lateral で突き合わせて重なり数を数える。
   * tags に索引は張らず全 ready 要約を走査するが、記事ページ側が 'use cache'(days)で
   * 1記事あたり実質1回に抑える前提(GIN は @> 向きで「重なり数」の集計には効かない)。
   * 同一記事内でタグが重複しても二重計上しないよう distinct で数える。
   */
  async listByTagOverlap(id: ArticleId, limit: number): Promise<Article[]> {
    const result = await this.db.execute(sql`
      with target as (
        select distinct jsonb_array_elements_text(s.tags) as tag
        from ${articleSummaries} as s
        where s.article_id = ${id}::uuid and s.status = 'ready'
      )
      select
        a.id as "id", a.url as "url", a.title as "title", a.description as "description",
        a.og_image as "ogImage", a.author as "author", a.published_at as "publishedAt",
        a.view_count as "viewCount", a.bookmark_count as "bookmarkCount",
        a.favorite_count as "favoriteCount", a.hatena_bookmark_count as "hatenaBookmarkCount",
        a.company_id as "companyId", c.slug as "companySlug", c.name as "companyName",
        c.brand_color as "companyBrandColor",
        m.overlap as "overlap"
      from ${articles} as a
      join ${companies} as c on c.id = a.company_id
      join ${articleSummaries} as s on s.article_id = a.id
      cross join lateral (
        select count(distinct t.tag)::int as overlap
        from jsonb_array_elements_text(s.tags) as t(tag)
        where t.tag in (select tag from target)
      ) as m
      where a.deleted_at is null
        and s.status = 'ready'
        and a.id <> ${id}::uuid
        and m.overlap > 0
      order by m.overlap desc, a.published_at desc, a.id desc
      limit ${limit}
    `);
    // postgres-js は db.execute(raw) で行配列を直返しする。
    const rows = result as unknown as ArticleRow[];

    return rows.map(toArticle);
  }

  /**
   * カテゴリ別の記事数(モバイルの件数表示用)。article_summaries を status='ready' に絞って
   * category で group by し、削除済み記事は除外する(article_summaries_category_ready_idx が効く)。
   * companyIds 指定時は購読スコープ/企業フィルタと同じ絞り込みを適用する(既存の件数表示と揃える)。
   */
  async countByCategory(companyIds?: CompanyId[]): Promise<CategoryCounts> {
    const conditions = [isNull(articles.deletedAt), eq(articleSummaries.status, 'ready')];
    if (companyIds && companyIds.length > 0) {
      conditions.push(inArray(articles.companyId, companyIds));
    }

    const rows = await this.db
      .select({ category: articleSummaries.category, count: count() })
      .from(articleSummaries)
      .innerJoin(articles, eq(articles.id, articleSummaries.articleId))
      .where(and(...conditions))
      .groupBy(articleSummaries.category);

    const out: CategoryCounts = {};
    for (const r of rows) {
      if (r.category) out[r.category] = r.count;
    }
    return out;
  }

  async upsertMany(companyId: string, items: ArticleDraft[]): Promise<number> {
    if (items.length === 0) return 0;

    const rows = items.map((a) => ({
      companyId,
      url: a.url,
      title: a.title,
      description: a.description,
      ogImage: a.ogImage,
      author: a.author,
      publishedAt: a.publishedAt,
    }));

    // xmax = 0 の行は新規 INSERT、それ以外は ON CONFLICT による UPDATE。
    // これで「処理した行数」ではなく「実際に追加された新着数」を返す。
    const result = await this.db
      .insert(articles)
      .values(rows)
      .onConflictDoUpdate({
        target: articles.url,
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          ogImage: sql`excluded.og_image`,
          author: sql`excluded.author`,
          // 再取込時に published_at も上書きする。これがないと feed_timezone(ADR-0025)の
          // TZ 補正が既存行に反映されず、補正前に取り込んだ記事が 9h ずれたまま固定される。
          publishedAt: sql`excluded.published_at`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` });

    return result.filter((r) => r.inserted).length;
  }

  async incrementView(id: ArticleId): Promise<void> {
    await this.db
      .update(articles)
      .set({ viewCount: sql`${articles.viewCount} + 1` })
      .where(eq(articles.id, id));
  }

  async listRecentForMetrics(sinceDays: number): Promise<ArticleMetricsTarget[]> {
    const rows = await this.db
      .select({ id: articles.id, url: articles.url })
      .from(articles)
      .where(
        and(
          isNull(articles.deletedAt),
          gte(articles.publishedAt, sql`now() - make_interval(days => ${sinceDays})`),
        ),
      );
    return rows.map((r) => ({ id: asArticleId(r.id), url: r.url }));
  }

  async updateHatenaCounts(entries: HatenaCount[]): Promise<void> {
    if (entries.length === 0) return;
    // 1 文で一括更新: VALUES と join して url で突き合わせる。
    const values = sql.join(
      entries.map((e) => sql`(${e.url}::text, ${e.count}::int)`),
      sql`, `,
    );
    await this.db.execute(sql`
      update ${articles} as a
      set hatena_bookmark_count = v.count, metrics_fetched_at = now()
      from (values ${values}) as v(url, count)
      where a.url = v.url
    `);
  }

  async appendMetricSnapshots(snapshots: MetricSnapshotInput[]): Promise<void> {
    if (snapshots.length === 0) return;
    await this.db.insert(articleMetricSnapshots).values(
      snapshots.map((s) => ({
        articleId: s.id as string,
        hatenaCount: s.count,
      })),
    );
  }

  async recomputeTrendScores(sinceDays: number): Promise<void> {
    // 直近 sinceDays 日の記事について trend_score を1文で再計算する(単一文。元は neon-http のトランザクション不可に合わせた形。ADR-0033)。
    // prev = captured_at が「現在 - 窓時間」以前で最も新しいスナップショット(= 約24h前のはてブ数)。
    // prev があれば velocity(増加分の減衰)、無ければ(公開直後)減衰つき累計にフォールバックする(ADR-0018)。
    const ageHours = sql`greatest(extract(epoch from (now() - art.published_at)) / 3600, 0)`;
    const rawScore = sql`(
      art.view_count * ${POPULARITY_WEIGHTS.view}
      + art.bookmark_count * ${POPULARITY_WEIGHTS.bookmark}
      + art.favorite_count * ${POPULARITY_WEIGHTS.favorite}
      + art.hatena_bookmark_count * ${POPULARITY_WEIGHTS.hatena}
    )`;
    await this.db.execute(sql`
      update ${articles} as a
      set trend_score = sub.score
      from (
        select
          art.id,
          case
            when prev.hatena_count is null
              then (${rawScore} + 1) / power(${ageHours} + 2, ${POPULARITY_GRAVITY})
            else (greatest(art.hatena_bookmark_count - prev.hatena_count, 0) + 1)
              / power(${ageHours} + 2, ${TREND_GRAVITY})
          end as score
        from ${articles} as art
        left join lateral (
          select s.hatena_count
          from ${articleMetricSnapshots} as s
          where s.article_id = art.id
            and s.captured_at <= now() - make_interval(hours => ${VELOCITY_WINDOW_HOURS})
          order by s.captured_at desc
          limit 1
        ) as prev on true
        where art.deleted_at is null
          and art.published_at >= now() - make_interval(days => ${sinceDays})
      ) as sub
      where a.id = sub.id
    `);
  }

  async pruneMetricSnapshots(retentionDays: number): Promise<void> {
    await this.db
      .delete(articleMetricSnapshots)
      .where(
        lt(articleMetricSnapshots.capturedAt, sql`now() - make_interval(days => ${retentionDays})`),
      );
  }
}
