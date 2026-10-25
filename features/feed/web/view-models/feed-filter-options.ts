/** 企業フィルタのチップ1件分(購読スコープに絞った企業)。 */
export type FilterCompany = {
  slug: string;
  name: string;
  /** 企業サイト URL。ファビコン表示のドメイン導出に使う */
  siteUrl: string;
  /** 記事数。モバイルのフィルタシートで企業ごとに件数を出すのに使う。 */
  articleCount: number;
};

/** マイフィードのフィルタ1件分(サイドバー/チップ/シートで企業と並べる)。 */
export type FilterUserFeed = {
  id: string;
  title: string;
  siteUrl: string | null;
  articleCount: number;
};
