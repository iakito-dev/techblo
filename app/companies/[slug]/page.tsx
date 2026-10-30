import { ArrowRight, ExternalLink, Rss } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { CompanyArticleGrid } from '@/app/_composition/article/company-article-grid';
import { COMPANY_PAGE_SIZE } from '@/app/_composition/article/company-page-size';
import { getCompanyArticles } from '@/app/_composition/article/feed-load-more';
import { Header } from '@/components/layout/header';
import { ScrollToTop } from '@/components/layout/scroll-to-top';
import { SkipLink } from '@/components/layout/skip-link';
import { JsonLd } from '@/components/seo/json-ld';
import { CompanyFavicon } from '@/components/ui/company-favicon';
import { FeedGridSkeleton } from '@/features/feed/web/components/feed-grid';
import { getCompanyBySlug } from '@/features/feed/web/queries';
import { breadcrumbJsonLd, companyCollectionJsonLd } from '@/lib/seo';
import { resolveBaseUrl } from '@/lib/site-url';

// 企業ページに初期表示する記事数。SEO 上「中身のある一覧」にしつつ、初回ペイロードを抑える。
// 「もっと読む」の1ページ分と同じ値(オフセットの整合)。
const PAGE_SIZE = COMPANY_PAGE_SIZE;

/**
 * 企業ページの説明文(meta description / ページ本文 / JSON-LD で共有)。
 * マスタの description はブログ名そのもの(「DevelopersIO」「Blog on DeNA Engineering」等)で
 * 説明文として機能しないため使わず、検索語(テックブログ / 技術ブログ)を含む文を組み立てる。
 */
function companyDescription(name: string): string {
  return `${name}のテックブログ(技術ブログ)の新着記事を毎日自動で集約。AI要約で要点をつかんでから、気になる記事だけ元記事で読めます。`;
}

/**
 * 企業詳細を取得(generateMetadata と本体で共有)。
 * getCompanyBySlug は 'use cache' 済みなので二重呼び出しでも往復は1回。
 */
async function loadCompany(slug: string) {
  return getCompanyBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await loadCompany(slug);
  if (!company) return { title: '企業が見つかりません' };

  const title = `${company.name}のテックブログ新着記事まとめ`;
  const description = companyDescription(company.name);

  return {
    title,
    description,
    alternates: {
      canonical: `/companies/${slug}`,
      types: {
        'application/rss+xml': [
          { url: `/companies/${slug}/feed.xml`, title: `${company.name}の新着` },
        ],
      },
    },
    openGraph: {
      type: 'website',
      url: `/companies/${slug}`,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

/**
 * 企業ページ(/companies/[slug])。企業ごとの記事まとめ(公開)。
 * 「〇〇 技術ブログ」のロングテール検索の着地先で、当該企業の全記事を購読スコープ非依存で見せる。
 * 静的シェルは即表示し、企業情報・記事(動的)は Suspense 境界内に閉じる(cacheComponents)。
 */
export default function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <div className="min-h-dvh pb-24 lg:pb-12">
      <SkipLink />
      <Suspense fallback={<div className="h-16 border-border-default border-b bg-bg-surface" />}>
        <Header />
      </Suspense>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-[84rem] px-4 py-8 focus:outline-none md:px-6 lg:px-8"
      >
        <Suspense fallback={<CompanyPageSkeleton />}>
          <CompanyContent params={params} />
        </Suspense>
      </main>
      <ScrollToTop />
    </div>
  );
}

function CompanyPageSkeleton() {
  return (
    <>
      <div className="mb-8 space-y-3">
        <div className="h-7 w-48 animate-pulse rounded bg-bg-surface-2" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-bg-surface-2" />
      </div>
      <FeedGridSkeleton count={PAGE_SIZE} />
    </>
  );
}

async function CompanyContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await loadCompany(slug);
  if (!company) notFound();

  const baseUrl = resolveBaseUrl();
  const description = companyDescription(company.name);
  const { items, hasMore, isGuest } = await getCompanyArticles({ slug, page: 1, limit: PAGE_SIZE });

  return (
    <div style={{ ['--brand' as string]: company.brandColor }}>
      <JsonLd
        data={companyCollectionJsonLd({
          url: `${baseUrl}/companies/${slug}`,
          companyName: company.name,
          description,
          companySiteUrl: company.siteUrl,
          articles: items.map((it) => ({
            url: `${baseUrl}/a/${it.article.id}`,
            title: it.article.title,
          })),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'ホーム', url: `${baseUrl}/` },
          { name: '企業一覧', url: `${baseUrl}/companies` },
          { name: company.name, url: `${baseUrl}/companies/${slug}` },
        ])}
      />

      {/* パンくず(ユーザー向け。JSON-LD と二重だが SERP/画面の両方をカバー) */}
      <nav aria-label="パンくず" className="mb-4 flex items-center gap-1.5 text-fg-muted text-xs">
        <Link href="/" className="transition-colors hover:text-fg-default">
          ホーム
        </Link>
        <span aria-hidden>/</span>
        <Link href="/companies" className="transition-colors hover:text-fg-default">
          企業一覧
        </Link>
        <span aria-hidden>/</span>
        <span className="text-fg-default">{company.name}</span>
      </nav>

      <header className="mb-8">
        <div className="flex items-center gap-2.5">
          <CompanyFavicon url={company.siteUrl} name={company.name} />
          {/* ブランド色は明るい色(黄・水色など)だと白背景で読めず、黒など暗い色だと暗背景で読めない。
              見出しは本文色に固定し、ブランド色は下のアクセントバーで出す。 */}
          <h1 className="font-bold text-2xl text-fg-default tracking-tight md:text-3xl">
            {company.name}の技術ブログ
          </h1>
        </div>
        <span aria-hidden className="mt-3 block h-1 w-10 rounded-full bg-(--brand)" />
        <p className="mt-3 max-w-2xl text-fg-muted leading-relaxed">{description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-fg-muted">記事 {company.articleCount} 件</span>
          <a
            href={company.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-fg-muted transition-colors hover:text-fg-default"
          >
            公式ブログを開く
            <ExternalLink className="size-3.5" />
          </a>
          <a
            href={`/companies/${slug}/feed.xml`}
            className="inline-flex items-center gap-1 font-medium text-fg-muted transition-colors hover:text-fg-default"
          >
            <Rss className="size-3.5" />
            RSS
          </a>
        </div>
      </header>

      {items.length > 0 ? (
        <CompanyArticleGrid slug={slug} items={items} initialHasMore={hasMore} isGuest={isGuest} />
      ) : (
        <p className="rounded-md border border-border-default bg-bg-surface p-12 text-center text-fg-muted">
          まだ記事がありません。
        </p>
      )}

      <div className="mt-10 border-border-default border-t pt-6">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1 font-medium text-fg-muted text-sm transition-colors hover:text-fg-default"
        >
          ほかの企業を見る
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
