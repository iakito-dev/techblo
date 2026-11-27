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
 * 企業の詳細(フィードの企業絞り込み `/?company=` と企業別 RSS 用。企業ページは ADR-0048 で廃止)。
 * 一覧用の CompanyWithCounts に説明文を加えた読み取りビュー。
 */
export type CompanyDetail = CompanyWithCounts & {
  /** 企業紹介文(無ければ null)。 */
  description: string | null;
};

/**
 * Driven Port。企業マスタの読み取りインターフェース。
 */
export interface CompanyRepository {
  /** 有効な企業を記事数つきで返す(記事数の多い順、同数は企業名順)。 */
  listEnabledWithCounts(): Promise<CompanyWithCounts[]>;
  /** slug で1社を引く(有効な企業のみ)。無ければ null。 */
  findBySlug(slug: string): Promise<CompanyDetail | null>;
  /**
   * 企業フィードの直近の取込試行時刻(成功・失敗の新しい方、全企業の最大)。未取込なら null。
   * 手動更新のクールダウン判定に使う。
   */
  findLastIngestAttemptAt(): Promise<Date | null>;
}
