import { asArticleId, asCompanyId } from '@/shared/type-utils';
import type { Article } from '../domain/article';

/**
 * DrizzleArticleRepository の select が返す行の形。
 * articles と companies を join した生の列。
 */
export type ArticleRow = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  ogImage: string | null;
  author: string | null;
  publishedAt: Date;
  viewCount: number;
  bookmarkCount: number;
  favoriteCount: number;
  hatenaBookmarkCount: number;
  companyId: string;
  companySlug: string;
  companyName: string;
  companyBrandColor: string;
};

/**
 * DB 行 → ドメイン Article。マッピングはここが唯一の集約点。
 */
export const toArticle = (r: ArticleRow): Article => ({
  id: asArticleId(r.id),
  url: r.url,
  title: r.title,
  description: r.description,
  ogImage: r.ogImage,
  author: r.author,
  publishedAt: r.publishedAt,
  counts: {
    view: r.viewCount,
    bookmark: r.bookmarkCount,
    favorite: r.favoriteCount,
    hatena: r.hatenaBookmarkCount,
  },
  company: {
    id: asCompanyId(r.companyId),
    slug: r.companySlug,
    name: r.companyName,
    brandColor: r.companyBrandColor,
  },
});
