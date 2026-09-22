import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { CompanyFavicon } from '@/components/article/company-favicon';
import { Header } from '@/components/layout/header';
import { JsonLd } from '@/components/seo/json-ld';
import { getCompanies } from '@/features/feed/web/queries';
import { companyListJsonLd } from '@/lib/seo';
import { resolveBaseUrl } from '@/lib/site-url';

const TITLE = '技術ブログを持つ企業一覧';
const DESCRIPTION =
  '有名テック企業の公式技術ブログを一覧でチェック。企業ごとの新着記事まとめへ。テクブロなら気になる記事を保存して、あとからじっくり読めます。';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/companies' },
  openGraph: {
    type: 'website',
    url: '/companies',
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
 * 企業一覧ページ(/companies)。各企業ページ(/companies/[slug])へのハブ(公開)。
 * クローラへの内部リンク集約点であり、それ自体「技術ブログ 一覧」のインデックス対象でもある。
 */
export default function CompaniesPage() {
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

        <Suspense fallback={<CompaniesListSkeleton />}>
          <CompaniesList />
        </Suspense>
      </main>
    </div>
  );
}

function CompaniesListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }, (_, i) => i).map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-xl border border-border-card bg-bg-surface"
        />
      ))}
    </div>
  );
}

async function CompaniesList() {
  // ビルド時プリレンダで DB を叩かないよう動的化する(Sidebar と同じ扱い)。
  // getCompanies は DB 障害時に throw するため、静的シェルに含めると DB 非到達のビルド
  // (CI はダミーの DATABASE_URL を渡す)が prerender error で落ちる。
  // 外枠(見出し・説明・skeleton)は静的シェルに残り、一覧はリクエスト時にストリームされる
  // ('use cache' + cacheLife('days') が効くので DB 負荷は増えない)。
  await connection();
  const companies = await getCompanies();
  const baseUrl = resolveBaseUrl();

  return (
    <>
      <JsonLd
        data={companyListJsonLd({
          url: `${baseUrl}/companies`,
          companies: companies.map((c) => ({
            url: `${baseUrl}/companies/${c.slug}`,
            name: c.name,
          })),
        })}
      />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <li key={company.id}>
            <Link
              href={`/companies/${company.slug}`}
              className="flex items-center gap-3 rounded-xl border border-border-card bg-bg-surface p-4 shadow-card transition-colors hover:border-border-default"
              style={{ ['--brand' as string]: company.brandColor }}
            >
              <CompanyFavicon url={company.siteUrl} name={company.name} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-fg-default">{company.name}</p>
                <p className="text-fg-muted text-xs">記事 {company.articleCount} 件</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
