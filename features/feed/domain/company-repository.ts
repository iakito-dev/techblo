import type { CompanyId } from '@/shared/type-utils';

/**
 * 記事数つきの企業(サイドバーの購読企業リスト用)。
 */
export type CompanyWithCounts = {
  id: CompanyId;
  slug: string;
  name: string;
  brandColor: string;
  /** 企業サイト URL。ファビコン表示のドメイン導出に使う */
  siteUrl: string;
  articleCount: number;
};

/**
 * 企業の詳細(企業ページ /companies/[slug] 用)。
 * 一覧用の CompanyWithCounts に説明文を加えた読み取りビュー。
 */
export type CompanyDetail = CompanyWithCounts & {
  /** 企業紹介文(無ければ null)。ページ本文・meta description に使う */
  description: string | null;
};

/**
 * Driven Port。企業マスタの読み取りインターフェース。
 */
export interface CompanyRepository {
  listEnabledWithCounts(): Promise<CompanyWithCounts[]>;
  /** slug で1社を引く(有効な企業のみ)。無ければ null。企業ページ用。 */
  findBySlug(slug: string): Promise<CompanyDetail | null>;
}
