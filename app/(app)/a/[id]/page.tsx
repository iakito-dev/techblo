import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ArticleDetailActions } from '@/app/_composition/article/article-detail-actions';
import { ArticleViewTracker } from '@/app/_composition/article/article-view-tracker';
import { ResetScrollOnMount } from '@/components/layout/reset-scroll-on-mount';
import { JsonLd } from '@/components/seo/json-ld';
import { CompanyFavicon } from '@/components/ui/company-favicon';
import { SummaryView } from '@/features/ai-summary/web/components/summary-view';
import { getSummaryByArticleId } from '@/features/ai-summary/web/queries';
import { articleFallbackImage } from '@/features/feed/web/article-image';
import { ArticleBackLink } from '@/features/feed/web/components/article-back-link';
import { ArticleDetailSkeleton } from '@/features/feed/web/components/article-detail-skeleton';
import { ArticleHeroImage } from '@/features/feed/web/components/article-hero-image';
import { ArticleSourceLink } from '@/features/feed/web/components/article-link';
import { RelatedArticles } from '@/features/feed/web/components/related-articles';
import { ShareButton } from '@/features/feed/web/components/share-button';
import { getArticleById, getRelatedArticles } from '@/features/feed/web/queries';
import { toExcerpt } from '@/features/feed/web/strip-html';
import { articleJsonLd } from '@/lib/seo';
import { resolveBaseUrl } from '@/lib/site-url';
import { formatRelative } from '@/shared/date';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';

// article.id は uuid。不正な形式は DB エラーになるため事前に弾いて not-found 扱いにする。
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 主アクションの遷移先を示すドメイン表示。`www.` は情報量が無いので落とす。
 * URL は取込時に検証済みだが、壊れた値で記事ページ全体を落とさないよう失敗時は空にする
 * (表示が1行消えるだけで、ボタン自体は href をそのまま使う)。
 */
function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * 記事取得。cacheComponents 下では generateMetadata からの取得も「キャッシュ済み」である
 * 必要があるためキャッシュする(id ごと。記事内容はほぼ不変)。
 *
 * 記事ページはリクエスト時に描画される(id が動的で静的シェルに入らない)ので、in-memory の
 * 'use cache' はサーバーレスのインスタンスごとに空から始まり、ほぼ毎回 Supabase まで往復していた。
 * インスタンス間で共有される 'use cache: remote'(Vercel Runtime Cache)にする(ADR-0042)。
 */
async function loadArticle(id: string) {
  'use cache: remote';
  cacheLife('hours');
  return getArticleById(id);
}

/**
 * 記事と AI要約を並列に取得する。どちらも id だけで引けるので、記事の取得を待ってから
 * 要約を引く直列(キャッシュミス時は DB 往復2回ぶん)にしない。
 * 不正な id は DB エラーになるため、どちらも呼ぶ前に弾く(要約側には UUID 検証が無い)。
 */
async function loadArticleWithSummary(id: string) {
  if (!UUID_RE.test(id)) return { article: null, summary: null };
  const [article, summary] = await Promise.all([loadArticle(id), getSummaryByArticleId(id)]);
  return { article, summary };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { article, summary } = await loadArticleWithSummary(id);
  if (!article) return { title: '記事が見つかりません' };

  // 説明文は AI要約(独自テキスト)を最優先し、無ければ RSS 抜粋で代替する。
  // アグリゲータの薄い複製ページにならないよう、要約があればそれを meta description にする。
  const description = summary?.overview
    ? toExcerpt(summary.overview, 160)
    : article.description
      ? toExcerpt(article.description, 120)
      : undefined;
  // 元記事に OGP 画像があればそのままホットリンクで使う(任意比率のまま共有される)。
  // 無い記事だけ自前生成の 1200x630 カード(/api/og、AI要約 or タイトル主役)で代替する(ADR-0029)。
  const image = article.ogImage
    ? { url: article.ogImage, alt: article.title }
    : { url: articleFallbackImage(article.id), width: 1200, height: 630, alt: article.title };

  return {
    title: article.title,
    description,
    alternates: { canonical: `/a/${id}` },
    openGraph: {
      type: 'article',
      url: `/a/${id}`,
      title: article.title,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: [image],
    },
  };
}

/**
 * 記事ページ(/a/[id])。一覧のカードをタップした時の遷移先であり、共有リンクの着地先でもある
 * (X / Threads と同じ「タイムライン → 個別ページ」の形。ADR-0036)。
 *
 * シェル(Header / Sidebar / MobileNav)は (app)/layout.tsx が保持するため、遷移で
 * 差し替わるのはこのコンテンツ領域だけになる。記事本体はユーザーに依存せず 'use cache: remote' で
 * 取得するので、カード側の prefetch でほぼ即時に描画できる。保存状態(ユーザー依存)だけを
 * 別の Suspense 境界に隔離し、本文の表示を待たせない。
 */
export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="min-h-dvh pb-[calc(var(--mobile-nav-h)+1rem)] lg:pb-12 lg:pl-64">
      {/* 幅は 2xl(672px)。一覧の3列時のカード幅(約 490px)より少し広い「1枚を開いた」幅で、
          和文 15px の本文が 40 字前後/行に収まり読みやすい。xl 以上は右レール(18rem)を足した
          66rem の2カラムにする(本文は 608px のまま)。lg 以上のガター(lg:px-8)は
          フィード(page.tsx)と揃え、戻る操作で左端が動かないようにする。 */}
      {/* 上部の余白は「共有 Header の mb-8 + main の上余白 + 戻る行」で三重に積み上がっていた。
          記事は上から読み始めるものなので、戻る行をヘッダー直下に寄せて本文の頭出しを早める。
          max-lg の -mt-4 は Header の mb-8 を半分食う分(lg+ は Header 自体が出ないため
          lg:pt-6 で自前の上余白を持つ)。 */}
      <main
        className={`mx-auto max-w-2xl max-lg:-mt-4 xl:max-w-[66rem] ${MOBILE_GUTTER_CLASS} pb-8 md:px-6 md:pb-10 lg:px-8 lg:pt-6`}
      >
        {/* フィードの途中から来ても記事の頭から開く(Next の遷移時スクロールの補正)。 */}
        <ResetScrollOnMount />
        <ArticleBackLink className="mb-1 max-lg:hidden" />
        <Suspense fallback={<ArticleDetailSkeleton />}>
          <ArticleContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function ArticleContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 関連記事は本文の下(右レール)で別にストリームするが、本文の取得を待ってから引き始めると
  // 往復が直列に積まれる。ここで先に投げて、表示側(Suspense の内側)では結果を待つだけにする。
  // getRelatedArticles は失敗時も [] を返す(reject しない)ので、notFound で捨てても安全。
  const relatedPromise = UUID_RE.test(id) ? getRelatedArticles(id) : Promise.resolve([]);
  const { article, summary } = await loadArticleWithSummary(id);
  if (!article) notFound();

  const baseUrl = resolveBaseUrl();
  // JSON-LD/meta の説明文も AI要約を優先(generateMetadata と同方針)。
  const jsonLdDescription = summary?.overview
    ? toExcerpt(summary.overview, 160)
    : article.description
      ? toExcerpt(article.description, 120)
      : undefined;

  return (
    // xl 以上は「本文 | 右レール(元記事 + 関連記事)」の2カラム。DOM は1つで、並びは CSS だけで
    // 切り替える(xl 未満は従来どおり 本文 → 画像 → ドメイン → アクション行 → 関連記事 の1カラム)。
    // data-article-main はキーボードショートカット(o / b / f)の対象。保存アクションは右レール(aside)に
    // あるため、article ではなく両カラムを包むこの要素に付ける。
    <div
      data-article-main
      data-article-url={article.url}
      className="xl:grid xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start xl:gap-x-12"
    >
      {/* 一覧のカード(ArticleCard)を「1枚開いた」続きに見せるため、カードと同じ上罫(1.5px の
        hairline)+ 見出し行 + タイトル + 抜粋 の骨格をそのまま拡大する。面・影・角丸は使わない
        (ADR-0035)。企業のブランド色は使わず、カードと同じくファビコンで出典を示す。 */}
      <article className="border-border-default border-t-[1.5px] pt-4">
        {/* 表示回数の加算と既読マーク。ダイアログ起動時ではなく着地側で行う(ADR-0036)。 */}
        <ArticleViewTracker articleId={article.id} />
        <JsonLd
          data={articleJsonLd(
            {
              url: `${baseUrl}/a/${article.id}`,
              title: article.title,
              description: jsonLdDescription,
              imageUrl: `${baseUrl}${articleFallbackImage(article.id)}`,
              publishedAt: article.publishedAt,
              author: article.author ?? undefined,
              companyName: article.company.name,
            },
            baseUrl,
          )}
        />
        {/* 見出し行: カードと同じ「ファビコン 20px + 企業名 11.5px 太字 / 右端に相対日時」。
          企業名は企業ページへのリンク(下線は hover 時だけ。常時下線だとカードの見出し行と
          見た目が変わる)。著者は記事ページにしか無い情報で、企業名より従属的なので
          企業名の後ろに通常ウェイト・muted で添える。 */}
        <div className="mb-3 flex items-center gap-[7px] font-semibold text-[11.5px] text-fg-default">
          <CompanyFavicon url={article.url} name={article.company.name} size={20} />
          <Link
            href={`/companies/${article.company.slug}`}
            className="min-w-0 truncate transition-colors hover:text-accent hover:underline hover:decoration-[1.5px] hover:underline-offset-4"
          >
            {article.company.name}
          </Link>
          {article.author && (
            <span className="min-w-0 truncate font-normal text-fg-muted">
              <span aria-hidden="true">・</span>
              {article.author}
            </span>
          )}
          <span className="ml-auto shrink-0 font-normal text-fg-muted">
            {formatRelative(article.publishedAt)}
          </span>
        </div>

        {/* タイトル: カード(18px・3行クランプ)の拡大版。クランプは外し、字間・行送りは
          カードと同じ比率(tracking -0.015em)にして「同じ活字の続き」に見せる。 */}
        <h1 className="font-bold text-[1.375rem] text-fg-default leading-[1.4] tracking-[-0.015em] md:text-[1.625rem]">
          {article.title}
        </h1>

        {/* AI要約。元記事の抜粋(複製)ではない独自テキストでページに価値を持たせる(ADR-0026/0031)。 */}
        {summary && (
          <div className="mt-5">
            <SummaryView
              overview={summary.overview}
              bullets={summary.bullets}
              tags={summary.tags}
            />
          </div>
        )}

        {/* RSS 抜粋は要約が無い時だけ出す。RSS の description は目次をつなげただけの文字列に
          なりがちで、要約の直下に置くとノイズになるため。カードの抜粋(13.5px・muted・1.75)と
          同じ声色で、本文として読める 15px に上げる。 */}
        {!summary && article.description && (
          <p className="mt-5 text-[15px] text-fg-muted leading-[1.8]">
            {toExcerpt(article.description, 200)}
          </p>
        )}
      </article>

      {/* 右レール(xl 以上)/ 本文の続き(xl 未満)。xl では article の上罫と頭を揃えるため、
        aside 側にも同じ上罫 + pt-4 を付け、元記事ブロックの mt-6 を外す。sticky にしないのは、
        aside が viewport より高い時に下が見えなくなるため。 */}
      <aside className="xl:border-border-default xl:border-t-[1.5px] xl:pt-4">
        {/* 元記事ブロック: プレビュー画像(OGP がある時だけ)+ 遷移先ドメイン + アクション行を
          1つの塊にする。画像は一覧のカードが持たない要素(ADR-0011)なので、タイトル直下ではなく
          本文の後ろ(X のリンクカードの位置)に「元記事へ」の入口として出す(画像全体が
          元記事へのリンク)。OGP が無い記事で自前生成カードを出すと、タイトルの繰り返しが
          画面を占有するだけなので出さない。角丸・影は使わず、白地の OGP が地色に溶けないよう
          hairline の輪郭だけ付ける。ドメインは遷移先が外部だと押す前に分かるようにするため。 */}
        <div className="mt-6 xl:mt-0">
          {article.ogImage && (
            <ArticleHeroImage
              article={article}
              href={article.url}
              className="aspect-[1200/630] w-full object-cover ring-1 ring-border-default ring-inset"
            />
          )}
          <p className={`truncate text-[11.5px] text-fg-subtle ${article.ogImage ? 'mt-2' : ''}`}>
            {hostname(article.url)}
          </p>
        </div>

        {/* アクション行: xl 未満は左に保存・お気に入り・共有のアイコン、右端に「元記事を開く」
          (旧ダイアログのフッターと同じ並び。読み終えた視線の終点=右下に外部への出口が来る)。
          xl 以上は右レール幅(288px)に収まらないので、「元記事を開く」を幅いっぱいで先頭に
          出し、アイコン3つをその下の行に折り返す(order-first + flex-wrap)。上罫は xl では外す
          (aside の上罫と二重になるため)。
          主アクションなので ink の塗りにする(design.md がプライマリボタンへの ink 塗りを
          許容する範囲。teal の塗りは引き続き使わない)。 */}
        <div className="mt-6 flex flex-wrap items-center gap-1 border-border-default border-t pt-4 xl:mt-3 xl:border-t-0 xl:pt-0">
          {/* 保存系だけがユーザー依存。ここだけをストリームさせ、本文は待たせない。
            fallback はボタン2つ分(size-11 + gap-1)の枠で、解決時に共有ボタンが動かないようにする。 */}
          <Suspense fallback={<div className="h-11 w-[5.75rem]" />}>
            <div className="flex items-center gap-1">
              <ArticleDetailActions articleId={article.id} />
            </div>
          </Suspense>
          <ShareButton articleId={article.id} title={article.title} />
          <ArticleSourceLink
            article={article}
            className="ml-auto inline-flex min-h-12 touch-manipulation items-center gap-2 rounded-md bg-primary px-5 font-semibold text-fg-inverse text-sm transition-colors hover:bg-primary-hover xl:order-first xl:ml-0 xl:w-full xl:justify-center"
          >
            元記事を開く
            <ExternalLink aria-hidden="true" className="size-4" />
          </ArticleSourceLink>
        </div>
        {/* 関連記事は補助情報。本文・保存状態とは独立にストリームし、表示を待たせない。 */}
        <Suspense fallback={null}>
          <RelatedArticlesSection articles={relatedPromise} />
        </Suspense>
      </aside>
    </div>
  );
}

async function RelatedArticlesSection({
  articles,
}: {
  articles: ReturnType<typeof getRelatedArticles>;
}) {
  return <RelatedArticles articles={await articles} />;
}
