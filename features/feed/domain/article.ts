import type { ArticleId, CompanyId } from '@/shared/type-utils';

/**
 * 記事の集計値(非正規化)。人気スコア計算の入力。
 */
export type ArticleCounts = {
  view: number;
  bookmark: number;
  favorite: number;
  /** はてなブックマーク数(外部シグナル)。人気スコアの主成分。ADR-0014。 */
  hatena: number;
};

/**
 * 記事に紐づく企業の表示情報。
 */
export type ArticleCompany = {
  id: CompanyId;
  slug: string;
  name: string;
  brandColor: string;
};

/**
 * フィードの記事(ドメインエンティティ)。
 * DB 行でも表示 DTO でもなく、ビジネスロジックが扱う中核表現。
 * 永続化の詳細(カラム名等)から独立している。
 */
export type Article = {
  id: ArticleId;
  url: string;
  title: string;
  description: string | null;
  ogImage: string | null;
  author: string | null;
  publishedAt: Date;
  counts: ArticleCounts;
  company: ArticleCompany;
};

/**
 * RSS 取得後・永続化前の記事(まだ ID と集計値を持たない)。
 * lib/rss の ArticleInput に対応する書き込み用ドラフト。
 */
export type ArticleDraft = {
  url: string;
  title: string;
  description: string | null;
  ogImage: string | null;
  author: string | null;
  publishedAt: Date;
};
