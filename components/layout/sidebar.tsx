import { connection } from 'next/server';
import { Suspense } from 'react';
import { getFeedFilterUserFeeds } from '@/components/article/feed-load-more';
import { getSidebarCompanies } from '@/features/feed/web/queries';
import { AppSidebar } from './app-sidebar';

/**
 * サイドバーの composition root(Server Component)。
 * 企業一覧(件数付き・認証不要・cache)を取得し、クライアントの AppSidebar に渡す。
 *
 * 枠(fallback の aside)は静的シェルに置き、中身は connection() で動的化してストリームする。
 * DB 系の 'use cache' をビルド時プリレンダから呼ぶと、DB 非到達の CI でビルドが落ちる
 * (cache fill の reject/タイムアウトは呼び出し側の try/catch では防げない)ため、
 * 「ビルド時には DB クエリを実行しない」既存契約(ADR-0016 / ci.yml)に合わせる。
 * Suspense は AppSidebar の useSearchParams の境界も兼ねる。
 */
export function Sidebar() {
  return (
    <Suspense
      fallback={
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-border-default border-r bg-bg-surface/80 lg:block" />
      }
    >
      <SidebarContent />
    </Suspense>
  );
}

async function SidebarContent() {
  // ビルド時プリレンダから除外する(リクエスト時のみ実行)。
  await connection();
  // マイフィードはログイン時のみ(未ログインは空)。企業一覧と並列取得。
  const [companies, userFeeds] = await Promise.all([
    getSidebarCompanies(),
    getFeedFilterUserFeeds(),
  ]);
  const sidebarCompanies = companies.map((c) => ({
    slug: c.slug,
    name: c.name,
    siteUrl: c.siteUrl,
    articleCount: c.articleCount,
  }));

  return <AppSidebar companies={sidebarCompanies} userFeeds={userFeeds} />;
}
