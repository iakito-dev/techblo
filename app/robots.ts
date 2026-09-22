import type { MetadataRoute } from 'next';
import { isProductionDeployment, resolveBaseUrl } from '@/lib/site-url';

/**
 * robots.txt を生成する(App Router のファイル規約)。
 *
 * プレビュー/開発デプロイは全拒否にして、本番ドメイン以外が検索結果に出るのを防ぐ
 * (重複コンテンツ・誤クロール対策)。本番は公開ページのみ許可し、ユーザー固有・
 * 認証・API のパスはクロール対象から外す。
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = resolveBaseUrl();

  if (!isProductionDeployment()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 認証・ユーザー固有ページ・内部 API はインデックスさせない(検索流入の価値がなく、
        // ?q= 等のパラメータ違いでクロール枠を浪費させない)。
        disallow: ['/api/', '/login', '/signup', '/settings', '/bookmarks', '/favorites'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
