import type { Article } from '../domain/article';
import type { FeedSort, PopularPeriod } from '../domain/feed-sort';

/**
 * 外部(RSC/Action)から受け取る生の入力。未正規化。
 * page は 1 始まり(?page=N)。period は popular のときの集計期間。
 */
export type ListFeedInput = {
  sort?: FeedSort;
  period?: PopularPeriod;
  page?: number;
  limit?: number;
  companyIds?: string[];
  // 未読/既読フィルタ(ログイン時のみ)。指定時はそのユーザーの reads で絞る(ADR-0021)。
  readFilter?: { userId: string; mode: 'unread' | 'read' };
  // 検索語(?q=)。未正規化の生入力(trim・長さ上限は usecase が行う。ADR-0022)。
  query?: string;
  // タグ絞り込み(?tag=)。canonical なキュレーションタグ。Repository が lib/tags の
  // 類義語群へ展開し、いずれかを含む記事に絞る(ADR-0027)。
  tag?: string;
  // カテゴリ絞り込み(?category=)。職能軸7種(shared/categories.ts)の完全一致(ADR-0034)。
  // 未正規化の生入力。不正なキーは usecase が無視する。
  category?: string;
  // ユーザー登録RSS(プライベート)のフィード id 群。指定時は公開記事にマージする(新着順専用。ADR-0014)。
  userFeedIds?: string[];
  // 公開記事を含めるか。既定 true。?feed のみのフィルタでは false(マイフィード単独表示)。
  includePublicArticles?: boolean;
};

export type TrackViewCommand = { articleId: string };

/**
 * 表示 DTO。UI が必要とする形だけを持つ(ドメイン Article から変換)。
 */
export type ArticleCard = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  ogImage: string | null;
  author: string | null;
  publishedAt: Date;
  viewCount: number;
  bookmarkCount: number;
  hatenaBookmarkCount: number;
  company: { slug: string; name: string; brandColor: string };
};

export type FeedPage = {
  items: ArticleCard[];
  page: number;
  /** さらに次ページがあるか(limit+1 取得の余りで判定。総件数は数えない。ADR-0013 追補)。 */
  hasMore: boolean;
};

export type CompanyWithCount = {
  id: string;
  slug: string;
  name: string;
  brandColor: string;
  /** 企業サイト URL。ファビコン表示のドメイン導出に使う */
  siteUrl: string;
  articleCount: number;
};

/**
 * 企業ページ(/companies/[slug])用の企業詳細 DTO。
 * 一覧用 CompanyWithCount に紹介文を加えたもの。
 */
export type CompanyDetailDto = CompanyWithCount & {
  /** 企業紹介文(無ければ null)。 */
  description: string | null;
};

/**
 * ドメイン Article → 表示 DTO。
 * favorite 数や company.id など UI が使わない情報はここで落とす。
 */
export const toArticleCard = (a: Article): ArticleCard => ({
  id: a.id,
  url: a.url,
  title: a.title,
  description: a.description,
  ogImage: a.ogImage,
  author: a.author,
  publishedAt: a.publishedAt,
  viewCount: a.counts.view,
  bookmarkCount: a.counts.bookmark,
  hatenaBookmarkCount: a.counts.hatena,
  company: { slug: a.company.slug, name: a.company.name, brandColor: a.company.brandColor },
});
