import type { MetadataRoute } from 'next';
import { getSitemapArticles, getSitemapCompanies } from '@/features/feed/web/queries';
import { resolveBaseUrl } from '@/lib/site-url';

// サイトマップに載せる記事ページ数の上限。Google の 1 ファイル 50,000 URL 制限に余裕を持たせつつ、
// 新着を確実にクロールさせる。これを超えて古い記事はリンク辿りでクロールさせる。
const MAX_ARTICLES = 10_000;

/**
 * sitemap.xml を生成する(App Router のファイル規約)。
 * 公開対象の静的ページ + 直近の記事ページ(/a/[id])を列挙する。
 * 認証・ユーザー固有ページ(/settings, /bookmarks, /favorites, /login, /signup)は
 * robots.ts で拒否しているのでここにも含めない。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = resolveBaseUrl();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${baseUrl}/lp`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/companies`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/tags`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/about`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // 企業ページ(/companies/[slug])。新着が随時入るため weekly。記事一覧より上位導線なので priority 高め。
  const companies = await getSitemapCompanies();
  const companyEntries: MetadataRoute.Sitemap = companies.map((c) => ({
    url: `${baseUrl}/companies/${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const articles = await getSitemapArticles(MAX_ARTICLES);
  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${baseUrl}/a/${a.id}`,
    lastModified: a.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticEntries, ...companyEntries, ...articleEntries];
}
