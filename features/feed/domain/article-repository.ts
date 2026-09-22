import type { ArticleCategory } from '@/shared/categories';
import type { ArticleId, CompanyId, UserId } from '@/shared/type-utils';
import type { Article, ArticleDraft } from './article';
import type { FeedSort, PopularPeriod } from './feed-sort';

/**
 * 記事一覧の取得条件(オフセットページネーション)。
 * period は popular のときの集計期間(today/week/month は公開日で絞る。all/未指定は全期間)。
 * readFilter は未読/既読フィルタ。指定時はそのユーザーの reads との EXISTS/NOT EXISTS で絞る(ADR-0021)。
 * query は検索語(?q=)。title/description の部分一致(大文字小文字非区別)で絞る(ADR-0022)。
 * 正規化(trim・長さ上限・空→undefined)は application 層の責務で、ここには
 * trim 済み・非空の文字列だけが渡る契約。
 */
export type ListCriteria = {
  sort: FeedSort;
  period?: PopularPeriod;
  companyIds?: CompanyId[];
  readFilter?: { userId: UserId; mode: 'unread' | 'read' };
  query?: string;
  // AI生成の表示タグでの絞り込み。canonical なキュレーションタグ(?tag=)を受け取り、
  // Repository が lib/tags の類義語群へ展開して article_summaries.tags の包含を EXISTS する。
  // 正規化検索基盤ではなく固定キュレーションでの「ゆるい絞り込み」(ADR-0027)。
  tag?: string;
  // カテゴリ絞り込み(?category=)。職能軸7種の完全一致(ADR-0034)。article_summaries が
  // status='ready' かつ category = 指定値の記事に絞る(tag と同じ EXISTS の形)。
  category?: ArticleCategory;
  // ユーザー登録RSS(プライベート)のフィード id 群。指定時は公開記事に UNION ALL でマージする。
  // sort='latest' かつ readFilter/query なしの主経路でのみ有効(ADR-0014)。
  userFeedIds?: string[];
  // 公開記事(articles)を含めるか。既定 true。false かつ userFeedIds 指定時は
  // マイフィード単独表示(?feed のみのフィルタ)になる。
  includePublicArticles?: boolean;
  // 0 始まりのスキップ件数。page から (page-1)*limit で算出。
  offset: number;
  limit: number;
};

/** 外部メトリクス取得の対象記事(id と URL のみ)。 */
export type ArticleMetricsTarget = {
  id: ArticleId;
  url: string;
};

/** URL ごとのはてなブックマーク数(更新入力)。 */
export type HatenaCount = {
  url: string;
  count: number;
};

/** メトリクススナップショット1件の入力(article_id ごとの取得時点はてブ数)。 */
export type MetricSnapshotInput = {
  id: ArticleId;
  count: number;
};

/** サイトマップ用の最小限の記事情報(URL と lastmod のみ。本文は引かない)。 */
export type SitemapArticle = {
  id: ArticleId;
  updatedAt: Date;
};

/** カテゴリ別セクション(棚)用の記事。要約が ready でカテゴリ確定済みの記事のみ対象(ADR-0034)。 */
export type CategorizedArticle = Article & { category: ArticleCategory };

/**
 * カテゴリ別の記事数(モバイルのカテゴリ絞り込みの件数表示用)。
 * 分類未確定(category が null / status≠'ready')の記事は含めないため、キーが無いカテゴリは 0 件。
 */
export type CategoryCounts = Partial<Record<ArticleCategory, number>>;

/** listLatestByCategories の取得条件。 */
export type ListLatestByCategoriesCriteria = {
  /** 対象カテゴリ群。 */
  categories: ArticleCategory[];
  /** カテゴリごとの最大取得件数。新着との重複除外後も十分な数が残るよう、表示件数より多めに渡す想定。 */
  perCategory: number;
  /** 購読スコープ等の企業フィルタ。未指定は全企業。 */
  companyIds?: CompanyId[];
};

/**
 * Driven Port。記事永続化に対するドメイン側のインターフェース。
 * 実装(Drizzle 等)は infrastructure 層に置き、ドメインは実装を知らない。
 */
export interface ArticleRepository {
  // criteria.offset から limit 件を取得する
  list(criteria: ListCriteria): Promise<Article[]>;
  findById(id: ArticleId): Promise<Article | null>;
  // 指定 id 群の記事を取得(削除済みは除外)。順序は保証しない(呼び出し側で整列)。
  listByIds(ids: ArticleId[]): Promise<Article[]>;
  // サイトマップ用に直近の公開記事を新着順で最大 limit 件(id と updatedAt のみ)
  listForSitemap(limit: number): Promise<SitemapArticle[]>;
  // カテゴリ別セクション(棚)用に、カテゴリごとの新着記事を取得する(要約 ready かつ分類済みのみ。ADR-0034)。
  // 1クエリで全カテゴリぶんをまとめて取り、カテゴリ内は publishedAt 降順。
  listLatestByCategories(criteria: ListLatestByCategoriesCriteria): Promise<CategorizedArticle[]>;
  // カテゴリ別の記事数(status='ready' の要約を持つ記事のみ、削除済み除外)。companyIds 指定時はその企業に絞る。
  countByCategory(companyIds?: CompanyId[]): Promise<CategoryCounts>;
  upsertMany(companyId: CompanyId, items: ArticleDraft[]): Promise<number>;
  incrementView(id: ArticleId): Promise<void>;
  // 直近 sinceDays 日に公開された記事の id/url(外部メトリクス再取得の対象)
  listRecentForMetrics(sinceDays: number): Promise<ArticleMetricsTarget[]>;
  // URL でマッチする記事のはてブ数を一括更新し、metrics_fetched_at を now にする
  updateHatenaCounts(entries: HatenaCount[]): Promise<void>;
  // 取得時点のはてブ数を時系列スナップショットとして1回ぶん追加する(ADR-0018)
  appendMetricSnapshots(snapshots: MetricSnapshotInput[]): Promise<void>;
  // 直近 sinceDays 日の記事の trend_score を、約24h前のスナップショットとの差分から再計算する。
  // 窓ぶんのスナップショットが無い記事は減衰つき累計スコアにフォールバックする(ADR-0018)
  recomputeTrendScores(sinceDays: number): Promise<void>;
  // 保持期間(retentionDays 日)を過ぎたスナップショットを間引く
  pruneMetricSnapshots(retentionDays: number): Promise<void>;
}
