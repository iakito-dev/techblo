import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { JsonLd } from '@/components/seo/json-ld';
import { getPopularTags } from '@/features/feed/web/queries';
import { breadcrumbJsonLd } from '@/lib/seo';
import { resolveBaseUrl } from '@/lib/site-url';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';
import { isSameTagList } from './same-tag-list';
import { TagBrowser } from './tag-browser';

const TITLE = 'タグから探す';
const DESCRIPTION =
  '企業テックブログの記事に付いたタグを、記事数の多い順に一覧。気になる技術やテーマのタグから、関連する記事をまとめて探せます。';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/tags' },
  openGraph: {
    type: 'website',
    url: '/tags',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

/**
 * タグ一覧ページ(/tags。公開・SEO 対象。ADR-0040)。
 * 各タグはフィードの ?tag= 絞り込みへのリンクで、クローラへの内部リンク集約点を兼ねる。
 *
 * (app) のシェル(サイドバー・モバイル下部ナビ)の中に置く。以前はシェル外の単独ページで、
 * モバイルの設定メニューやサイドバーの「タグから探す」から来ると下部ナビ・サイドバーが消え、
 * フィードや保存一覧へ戻る手段がロゴだけになっていた。
 */
export default function TagsPage() {
  return (
    <div className="min-h-dvh pb-24 lg:pt-6 lg:pb-12 lg:pl-64">
      <div className={`mx-auto max-w-[84rem] ${MOBILE_GUTTER_CLASS} md:px-6 lg:px-8`}>
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{TITLE}</h1>
          <p className="text-fg-muted mt-3 max-w-2xl leading-relaxed">{DESCRIPTION}</p>
        </header>

        <Suspense fallback={<TagsSkeleton />}>
          <TagSections />
        </Suspense>
      </div>
    </div>
  );
}

function TagsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 24 }, (_, i) => i).map((i) => (
        <div key={i} className="bg-bg-surface h-7 w-24 animate-pulse rounded-full" />
      ))}
    </div>
  );
}

async function TagSections() {
  // ビルド時プリレンダで DB を叩かないよう動的化する。
  // 外枠(見出し・説明・skeleton)は静的シェルに残り、集計は 'use cache' でリクエスト時にストリームされる。
  await connection();
  const { recent, all } = await getPopularTags();
  const baseUrl = resolveBaseUrl();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'ホーム', url: `${baseUrl}/` },
          { name: TITLE, url: `${baseUrl}/tags` },
        ])}
      />
      {all.length === 0 ? (
        <p className="border-border-card bg-bg-surface text-fg-muted rounded-xl border p-8 text-center">
          まだタグがありません。記事の AI 要約が生成されると、ここに表示されます。
        </p>
      ) : (
        <TagBrowser recent={isSameTagList(recent, all) ? null : recent} all={all} />
      )}
    </>
  );
}
