import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { JsonLd } from '@/components/seo/json-ld';
import { getPopularTags, type TagIndex } from '@/features/feed/web/queries';
import { breadcrumbJsonLd } from '@/lib/seo';
import { resolveBaseUrl } from '@/lib/site-url';

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
 */
export default function TagsPage() {
  return (
    <div className="min-h-dvh pb-24 lg:pb-12">
      <Suspense fallback={<div className="h-16 border-border-default border-b bg-bg-surface" />}>
        <Header />
      </Suspense>

      <main className="mx-auto max-w-[84rem] px-4 py-8 md:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="font-bold text-2xl tracking-tight md:text-3xl">{TITLE}</h1>
          <p className="mt-3 max-w-2xl text-fg-muted leading-relaxed">{DESCRIPTION}</p>
        </header>

        <Suspense fallback={<TagsSkeleton />}>
          <TagSections />
        </Suspense>
      </main>
    </div>
  );
}

function TagsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 24 }, (_, i) => i).map((i) => (
        <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-bg-surface" />
      ))}
    </div>
  );
}

async function TagSections() {
  // ビルド時プリレンダで DB を叩かないよう動的化する(/companies と同じ扱い)。
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
        <p className="rounded-xl border border-border-card bg-bg-surface p-8 text-center text-fg-muted">
          まだタグがありません。記事の AI 要約が生成されると、ここに表示されます。
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {recent.length > 0 && (
            <TagSection heading="最近よく書かれているタグ" note="直近90日" tags={recent} />
          )}
          <TagSection heading="すべてのタグ" note="全期間" tags={all} />
        </div>
      )}
    </>
  );
}

function TagSection({
  heading,
  note,
  tags,
}: {
  heading: string;
  note: string;
  tags: TagIndex['all'];
}) {
  return (
    <section>
      <h2 className="mb-4 font-semibold text-fg-default text-lg">
        {heading}
        <span className="ml-2 font-normal text-fg-subtle text-xs">{note}</span>
      </h2>
      <ul className="flex flex-wrap gap-2">
        {tags.map(({ tag, count }) => (
          <li key={tag}>
            <Link
              href={`/?tag=${encodeURIComponent(tag)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-default px-3 py-1 text-fg-muted text-sm transition-colors hover:border-accent hover:text-accent"
            >
              {tag}
              <span className="text-fg-subtle text-xs tabular-nums">{count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
