import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { FeedList } from '@/app/_composition/article/feed-list';
import {
  getDefaultFilterCompanies,
  getFeedFilterCompanies,
  getFeedFilterUserFeeds,
  getFeedPageData,
  getSectionsPageData,
} from '@/app/_composition/article/feed-load-more';
import { FeedSectionsView } from '@/app/_composition/article/feed-sections-view';
import { FeedHeader, FeedTopbar } from '@/components/layout/feed-topbar';
import { JsonLd } from '@/components/seo/json-ld';
import {
  type PopularPeriod,
  parseFeedSort,
  parsePeriod,
  parseReadMode,
} from '@/features/feed/domain/feed-sort';
import { DefaultFeedControls, FeedControls } from '@/features/feed/web/components/feed-controls';
import { FeedEmptyState } from '@/features/feed/web/components/feed-empty-state';
import { FeedGridSkeleton } from '@/features/feed/web/components/feed-grid';
import { FeedPeriodEmptyState } from '@/features/feed/web/components/feed-period-empty-state';
import { FeedSearchEmptyState } from '@/features/feed/web/components/feed-search-empty-state';
import { FeedSectionsSkeleton } from '@/features/feed/web/components/feed-sections-skeleton';
import {
  DefaultMobileFeedControls,
  MobileFeedControls,
} from '@/features/feed/web/components/mobile-feed-header';
import { FeedNavProvider } from '@/features/feed/web/view-models/feed-nav-context';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo';
import { resolveBaseUrl } from '@/lib/site-url';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';

type FeedSearchParams = {
  sort?: string;
  period?: string;
  company?: string;
  feed?: string;
  read?: string;
  q?: string;
  tag?: string;
  /** カテゴリ絞り込み(?category=)。指定時は既定のセクション表示ではなく既存のリスト表示になる(ADR-0034)。 */
  category?: string;
};

/**
 * トップのメタデータ。
 * - canonical は常にクエリ無しの `/` に固定し、?sort=/?company=/?period=/?tag= などの
 *   パラメータ違いを `/` の重複として正規化する(クロール枠の浪費とインデックス分散を防ぐ)。
 *   企業/タグ別の検索面は専用ページ(/companies 等)に委ねる。
 * - 検索結果(?q=)は無限のクエリ基数でインデックス価値が無いため noindex(リンクは follow)。
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<FeedSearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const isSearch = !!sp.q?.trim();
  const tag = sp.tag?.trim();
  return {
    alternates: {
      canonical: '/',
      // alternates はルートレイアウトのものを浅く上書きするので、全体フィードも併記する。
      // タグ絞り込み中は RSS リーダーの自動検出でそのタグのフィードも見つかるようにする(ADR-0039)。
      types: {
        'application/rss+xml': [
          ...(tag
            ? [{ url: `/feed.xml?tag=${encodeURIComponent(tag)}`, title: `#${tag} の新着` }]
            : []),
          { url: '/feed.xml', title: 'テクブロ 新着' },
        ],
      },
    },
    ...(isSearch ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * トップページ(公開フィード)。
 * 見出し + 並び替え + 記事グリッド。
 * shell(Header/Sidebar/MobileNav)は (app)/layout.tsx が保持し、ここではコンテンツのみ描画する。
 * 記事グリッドは Suspense でストリーミング。
 * 詳細仕様: docs/features/feed.md
 */
export default function HomePage({ searchParams }: { searchParams: Promise<FeedSearchParams> }) {
  const baseUrl = resolveBaseUrl();
  return (
    <div className="min-h-dvh pb-[calc(var(--mobile-nav-h)+1rem)] lg:pb-12 lg:pl-64">
      {/* サイト全体の構造化データ(検索ボックス・運営者)。トップにのみ置く。 */}
      <JsonLd data={websiteJsonLd(baseUrl)} />
      <JsonLd data={organizationJsonLd(baseUrl)} />
      {/* トップは内容ファースト。見出しは SEO/スクリーンリーダー用に sr-only で保持。 */}
      <p className="sr-only">
        国内外40社以上の企業テックブログの新着記事を、毎日自動でまとめています。
      </p>

      {/*
        ツールバー(モバイル)・見出し(デスクトップ)・本文を同じ FeedNavProvider で囲み、
        フィルタ/並び替えの遷移 pending を共有する。切替中に本文(FeedList)を dim でき、
        「前の内容のまま遅れて差し替わる」見え方を抑える(PR #97)。
        トップバーも検索(?q=)の遷移 pending を本文と共有するため Provider 内に置く(ADR-0022)。
      */}
      <FeedNavProvider>
        <FeedTopbar />
        {/*
          ツールバーは本文(DefaultFeed)と同じく「既定版をフォールバックにする」(ADR-0019)。
          Default* はセッション・URL を読まない純キャッシュ RSC なので PPR が静的シェルに
          プリレンダする → リロード直後から見える。購読スコープ版がストリームで上書きする
          (ゲストは内容一致で不可視)。
        */}
        {/*
          モバイル(<md): 検索行 + sticky チップ行 + 絞り込みシート(MobileFeedControls)。
          sticky の包含ブロックを背の高い外枠 div にするため、短いラッパーで包まない
          (短い親に入れると、その親を過ぎた瞬間に sticky が解除される)。Suspense は DOM box を
          作らないので、sticky 要素の親は外枠 div のまま。md:hidden は sticky 要素自身が持つ。
        */}
        <Suspense fallback={<DefaultMobileToolbar />}>
          <MobileToolbar />
        </Suspense>

        {/*
          タブレット(md〜lg): 上部1行ツールバー。デスクトップ(lg+)はサイドバー + 見出し行へ委譲。
        */}
        <div className="hidden md:mb-6 md:block md:px-6 md:pt-2 lg:hidden">
          <Suspense fallback={<DefaultToolbar />}>
            <FeedToolbar />
          </Suspense>
        </div>

        {/* モバイルは sticky ヘッダーの区切り線と 1 枚目の間に呼吸を入れる(pt-4)。
            md は上ツールバーの mb-6 が間隔を担うので md:pt-0、lg は見出し行の上余白(lg:pt-6)。 */}
        {/*
          @container: 列数・余りの非表示(feed-grid-classes.ts の FEED_COLUMNS_CLASS /
          feedCutoffClass)はビューポートではなくこのコンテンツ領域の実幅で決める(サーバはビューポートを知らない。
          ADR-0019)。max-w は 1680px(ウルトラワイドで間延びしない上限)まで許容し、
          トップバー(FeedTopbar)も同じ幅にそろえる(ADR-0035)。
        */}
        <div
          className={`@container mx-auto max-w-[1680px] ${MOBILE_GUTTER_CLASS} pt-4 md:px-6 md:pt-0 lg:px-8 lg:pt-6`}
        >
          <Suspense fallback={<div className="hidden h-9 lg:block" />}>
            <FeedHeader icon="feed" showControls />
          </Suspense>
          {/*
            購読/フィルタ/最新DBを反映する動的な FeedBody(既定状態はモバイル=リスト表示 /
            デスクトップ=セクション型フィード、フィルタ/並び替え指定時は両方とも既存のリスト表示)
            が解決するまでは skeleton を出す。以前は既定フィード(最新・全社)の実コンテンツを
            フォールバックにしていたが(ADR-0019)、購読を絞った/並び順を変えたユーザーや、'days' で
            stale になったプリレンダで「古い記事 → 新しい記事」の内容差し替えが体感ノイズになった
            ため skeleton に戻した(ADR-0024 が ADR-0019 を supersede)。フォールバックは
            searchParams を読まない(サーバはビューポートも知らない)ため、モバイル=リスト型 /
            デスクトップ=棚型 skeleton を CSS で出し分ける(実際にはリスト表示になるケースでも
            一旦この形を見せる。ADR-0034)。
          */}
          <Suspense
            fallback={
              <>
                <div className="md:hidden">
                  <FeedGridSkeleton variant="columns" />
                </div>
                <div className="hidden md:block">
                  <FeedSectionsSkeleton />
                </div>
              </>
            }
          >
            <FeedBody searchParams={searchParams} />
          </Suspense>
        </div>
      </FeedNavProvider>
    </div>
  );
}

/**
 * 購読設定をフィードに反映し、保存系アクションを注入する app 層の合成点。
 * features 間 import 禁止(ADR-0002)のため、auth・subscriptions・bookmarks・favorites・feed を
 * ここで束ねる(ADR-0013)。
 * - 未ログイン: 全企業を表示・保存ボタンはログイン誘導モーダルを開く
 * - ログイン: 購読 ON の企業のみ + カードに保存状態を反映。全 OFF なら空状態 + 設定への導線
 */
async function FeedToolbar() {
  const [companies, userFeeds] = await Promise.all([
    getFeedFilterCompanies(),
    getFeedFilterUserFeeds(),
  ]);

  return <FeedControls companies={companies} userFeeds={userFeeds} />;
}

/**
 * モバイル(<md)のフィードヘッダー(購読スコープの企業 + マイフィードを反映)。FeedToolbar と同じ合成点。
 * searchParams は読まない(絞り込みシートの選択状態はクライアントが URL から読む)。
 */
async function MobileToolbar() {
  const [companies, userFeeds] = await Promise.all([
    getFeedFilterCompanies(),
    getFeedFilterUserFeeds(),
  ]);

  return <MobileFeedControls companies={companies} userFeeds={userFeeds} />;
}

/** MobileToolbar の Suspense フォールバック(URL を読まない既定版。DefaultToolbar と同型)。 */
function DefaultMobileToolbar() {
  return <DefaultMobileFeedControls />;
}

/**
 * 既定ツールバー(全企業)。FeedToolbar の Suspense フォールバックとして静的シェルに
 * プリレンダされる(ADR-0019 の DefaultFeed と同型)。セッション・searchParams を読まない
 * (ライブ版 FeedControls は useSearchParams を読むためフォールバック位置に置けない)。
 * DB 非到達のビルドでは企業リストが空になるが、並び替えタブは表示される。
 */
async function DefaultToolbar() {
  const companies = await getDefaultFilterCompanies();

  return <DefaultFeedControls companies={companies} />;
}

/**
 * 既定状態(フィルタ・並び替え未指定)かどうかで、セクション型フィードと既存のリスト表示を
 * 切り替える合成点。判定に searchParams を読むため、page.tsx 本体(非 async)ではなくここで
 * 一度だけ await する(Suspense フォールバックは searchParams を読まない FeedSectionsSkeleton /
 * FeedGridSkeleton に統一しているため、この await が静的シェルの PPR を妨げない)。
 *
 * 既定状態はモバイルとデスクトップで見た目が異なる(モバイル=新着順の全カテゴリ・自動読み込みの
 * リスト表示 / デスクトップ=セクション型フィード)。サーバはビューポートを知らない(UA 判定はしない。
 * ADR-0019 の静的プリレンダ方針)ため、両方を描画して CSS で出し分ける(SectionsFeed は内部で
 * getSectionsPageData を叩くため、モバイル分の SubscribedFeed とは別に DB へ問い合わせが走る。
 * 既定状態のみのオーバーヘッドとして許容する)。
 */
async function FeedBody({ searchParams }: { searchParams: Promise<FeedSearchParams> }) {
  const sp = await searchParams;
  const isDefaultState =
    !sp.sort &&
    !sp.period &&
    !sp.company &&
    !sp.feed &&
    !sp.tag &&
    !sp.read &&
    !sp.q &&
    !sp.category;

  if (isDefaultState) {
    return (
      <>
        <div className="md:hidden">
          <SubscribedFeed searchParams={searchParams} />
        </div>
        <div className="hidden md:block">
          <SectionsFeed />
        </div>
      </>
    );
  }
  return <SubscribedFeed searchParams={searchParams} />;
}

/**
 * トップの既定状態(デスクトップ): 新着 + カテゴリ別の棚 + イベントのセクション型フィード
 * (ADR-0034)。モバイルは既存のリスト表示(SubscribedFeed)を使うため、この関数はデスクトップの
 * `hidden md:block` 内でのみ呼ばれる。
 * 棚が1つも作れない(バックフィル前で category がほぼ null 等)・全企業 OFF のときは
 * getSectionsPageData が null を返すので、既存のリスト表示(SubscribedFeed)へフォールバックする
 * (空ページ化を防ぐ)。
 */
async function SectionsFeed() {
  const { sections, isGuest } = await getSectionsPageData();

  if (!sections) {
    return <SubscribedFeed searchParams={Promise.resolve({})} />;
  }

  return <FeedSectionsView sections={sections} isGuest={isGuest} />;
}

async function SubscribedFeed({ searchParams }: { searchParams: Promise<FeedSearchParams> }) {
  const sp = await searchParams;
  const sort = parseFeedSort(sp.sort);
  // period は公開日ウィンドウのフィルタ。sort と直交させ新着順でも適用する(ADR の period×sort 分離)。
  const period: PopularPeriod = parsePeriod(sp.period);
  // ?company=a,b,c のカンマ区切りを複数選択として読む(空要素は捨てる)。
  const companySlugs = sp.company
    ? sp.company
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  // ?feed=id,id のマイフィードフィルタ(ログイン時のみ作用)。
  const feedIds = sp.feed
    ? sp.feed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const readMode = parseReadMode(sp.read);
  const query = sp.q?.trim() || undefined;
  // ?tag=AI のタグ絞り込み(AI生成の表示タグでの完全一致。ADR-0027)。
  const tag = sp.tag?.trim() || undefined;
  // ?category=ai のカテゴリ絞り込み(職能軸7種の完全一致。ADR-0034)。
  const category = sp.category?.trim() || undefined;

  const { items, hasMore, allOff, isEmpty, isGuest } = await getFeedPageData({
    sort,
    period,
    page: 1,
    companySlugs,
    feedIds,
    readMode,
    query,
    tag,
    category,
  });

  if (allOff) {
    return (
      <div className="rounded-md border border-border-default bg-bg-surface p-12 text-center">
        <p className="text-fg-muted">表示する企業が選択されていません。</p>
        <Link
          href="/settings"
          className="mt-3 inline-block font-medium text-accent text-sm hover:underline"
        >
          表示する企業を選ぶ
        </Link>
      </div>
    );
  }

  if (isEmpty) {
    // 検索 0 件は「記事がまだ無い」「期間が狭い」より優先(クリアを主導線にする。ADR-0022)
    if (query) {
      return <FeedSearchEmptyState query={query} />;
    }
    // 人気順で狭い期間(今日/今週/今月)に該当 0 件 → 取得を促すのではなく期間を広げる導線。
    if (sort === 'popular' && period !== 'all') {
      return <FeedPeriodEmptyState period={period} />;
    }
    return <FeedEmptyState />;
  }

  // sort/period/company が変わったら page=1 から取り直す。
  // 再マウント(key)ではなく FeedList 内で props 変化を検知して state を同期し、
  // 既存カードの DOM を保ったまま中身だけ差し替える(切替時の全破棄→再生成を避ける)。
  return (
    <FeedList
      initialItems={items}
      initialHasMore={hasMore}
      isGuest={isGuest}
      sort={sort}
      period={period}
      companySlugs={companySlugs}
      feedIds={feedIds}
      readMode={readMode}
      query={query}
      tag={tag}
      category={category}
    />
  );
}
