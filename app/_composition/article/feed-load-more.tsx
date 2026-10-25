import { cookies } from 'next/headers';
import type { ArticleSummaryDto } from '@/features/ai-summary/application/dto';
import { getSummaryByArticleId } from '@/features/ai-summary/web/queries';
import { getSession } from '@/features/auth/server';
import { getBookmarkedArticleIds } from '@/features/bookmarks/web/queries';
import { getFavoritedArticleIds } from '@/features/favorites/web/queries';
import type { ArticleCard as ArticleCardDto } from '@/features/feed/application/dto';
import type { FeedSort, PopularPeriod, ReadFilterMode } from '@/features/feed/domain/feed-sort';
import {
  getCompanies,
  getFeed,
  getFeedSections,
  getMergedFeed,
  getReadFilteredFeed,
  getSidebarCompanies,
  searchFeed,
} from '@/features/feed/web/queries';
import type {
  FilterCompany,
  FilterUserFeed,
} from '@/features/feed/web/view-models/feed-filter-options';
import { readUnsubscribedFrom } from '@/features/subscriptions/web/guest-subscriptions';
import { getEnabledCompanyIds } from '@/features/subscriptions/web/queries';
import { getEnabledUserFeedIds, getUserFeedFilters } from '@/features/user-feeds/web/queries';
import type { ArticleCategory } from '@/shared/categories';
import { asUserId } from '@/shared/type-utils';

export type FeedPageInput = {
  sort: FeedSort;
  period: PopularPeriod;
  page: number;
  /** 企業フィルタ(?company=a,b,c)。複数選択。未指定/空はスコープ全体。 */
  companySlugs?: string[];
  /** マイフィードフィルタ(?feed=id,id)。複数選択。ログイン時のみ・新着順主経路で作用(ADR-0014)。 */
  feedIds?: string[];
  /** 未読/既読フィルタ(?read=)。ログイン時のみサーバー側で絞る。既定 all(ADR-0021)。 */
  readMode?: ReadFilterMode;
  /** 検索語(?q=)。指定時はキャッシュを通さない searchFeed で取得する(ADR-0022)。 */
  query?: string;
  /** タグ絞り込み(?tag=)。AI生成の表示タグでの完全一致。公開記事のみ対象(ADR-0027)。 */
  tag?: string;
  /** カテゴリ絞り込み(?category=)。職能軸7種の完全一致。公開記事のみ対象(ADR-0034)。 */
  category?: string;
};

/** カード1件分の表示データ + 保存状態(クライアントへ渡すシリアライズ可能な形)。 */
export type ComposedArticle = {
  article: ArticleCardDto;
  bookmarked: boolean;
  favorited: boolean;
  /** AI要約(無い / 未生成なら null)。カードの概要文とタグに使うため記事と同時に合成する。 */
  summary: ArticleSummaryDto | null;
};

export type FeedPageData = {
  items: ComposedArticle[];
  /** さらに次のページがあるか。 */
  hasMore: boolean;
  /** ログイン済みで全企業の購読が OFF か。 */
  allOff: boolean;
  /** このページに記事が無いか(page 1 の空判定用)。 */
  isEmpty: boolean;
  /** 未ログインか(ArticleActions が isGuest でローカル保存/DB を切り替える)。 */
  isGuest: boolean;
};

/**
 * 1ページの表示数。以前は userAgent から端末別(6/8/12)に出し分けていたが、
 * headers() 依存が getFeedPageData 全体を動的化し、既定フィードの静的プリレンダを妨げていた(ADR-0019)。
 * 列数の端数はレスポンシブグリッド(1/2/3 カラム)が吸収するため、全端末で固定値にする。
 * 固定化で getFeed のキャッシュも (sort,period,company) 単位に統一され断片化が減る。
 */
const INITIAL_PAGE_SIZE = 24;

/**
 * フィード1ページ分を「表示データ + 保存状態」として返す app 層の合成点(ADR-0013)。
 * features 間 import を避けるため、auth・subscriptions・bookmarks・favorites・feed をここで束ねる。
 * RSC の初期表示と「もっと読む」の Server Action の両方から呼ぶ(同じ合成を再利用)。
 * - 未ログイン: 全企業を表示・保存状態は false(ArticleActions が localStorage から復元する)
 * - ログイン: 購読 ON の企業のみ + 各記事の保存状態を付与。全 OFF なら allOff
 */
/**
 * 選択企業 slug 群をスコープ内で id に解決する(指定時のみ)。
 * 見つからない / スコープ外(購読外)の slug は落とす。1件も残らなければ空配列を返し、
 * 呼び出し側でスコープ全体にフォールバックする。
 */
async function resolveSelectedCompanyIds(
  companySlugs: string[] | undefined,
  scopeIds: string[] | null,
): Promise<string[]> {
  if (!companySlugs || companySlugs.length === 0) return [];
  const companies = await getCompanies();
  const bySlug = new Map(companies.map((c) => [c.slug, c.id]));
  const scope = scopeIds ? new Set(scopeIds) : null;
  const ids: string[] = [];
  for (const slug of companySlugs) {
    const id = bySlug.get(slug);
    if (!id) continue;
    if (scope && !scope.has(id)) continue;
    ids.push(id);
  }
  return ids;
}

/**
 * 表示中の記事の AI要約を、記事 ID 単位でキャッシュ済みのクエリで並列取得する。
 * カードデータと同時にサーバーで合成して ComposedArticle に載せることで、
 * カードの初回フレームから概要文とタグを描画でき、後から差し込まれるちらつきを防ぐ。
 * 要約が無い / 未生成の記事は null。
 */
async function resolveSummaries(articleIds: string[]): Promise<(ArticleSummaryDto | null)[]> {
  return Promise.all(articleIds.map((id) => getSummaryByArticleId(id)));
}

/** 購読スコープの解決結果。companyIds は絞り込み条件として feed クエリへそのまま渡す形。 */
type CompanyScope = {
  /**
   * 購読スコープの企業 ID。ログイン=購読 ON の企業(必ず配列。空配列もありうる)。
   * ゲスト=Cookie で OFF にした企業を除いた企業(Cookie 未設定なら絞り込みなし=undefined で全企業)。
   */
  companyIds: string[] | undefined;
  /** 表示できる企業が1つも無いか(ログイン=購読が全 OFF、ゲスト=Cookie で全社 OFF)。 */
  allOff: boolean;
};

/**
 * 購読スコープ(表示対象の企業)を解決する共通処理。getFeedPageData と getSectionsPageData の
 * 両方がこれを使うことで、リスト表示と棚(セクション表示)で表示される企業が食い違わないようにする
 * (以前はそれぞれが同じ分岐を別々に実装しており、片方だけ直すと乖離するリスクがあった)。
 *
 * session は呼び出し側が取得済みのものを渡す(ここで getSession() を呼び直さない)。
 * getFeedPageData はログイン時、保存状態(bookmark/favorite)の取得をこの解決と並行させるため
 * (コールドキャッシュ時のウォーターフォール解消。ADR-0016)、session 取得そのものの位置は
 * 呼び出し側に残し、この関数は「session が分かった後の企業スコープ解決」だけを担う。
 */
async function resolveCompanyScope(
  session: Awaited<ReturnType<typeof getSession>>,
): Promise<CompanyScope> {
  if (session) {
    const subscribedIds = await getEnabledCompanyIds(asUserId(session.user.id));
    return { companyIds: subscribedIds, allOff: subscribedIds.length === 0 };
  }

  const cookieStore = await cookies();
  const disabled = readUnsubscribedFrom((name) => cookieStore.get(name)?.value);
  if (disabled.length === 0) {
    // Cookie 未設定 = 絞り込みなし(全企業)。
    return { companyIds: undefined, allOff: false };
  }
  const all = await getCompanies();
  const enabled = all.filter((c) => !disabled.includes(c.slug));
  if (enabled.length === 0) {
    return { companyIds: [], allOff: true };
  }
  return { companyIds: enabled.map((c) => c.id), allOff: false };
}

export async function getFeedPageData({
  sort,
  period,
  page,
  companySlugs,
  feedIds,
  readMode = 'all',
  query,
  tag,
  category,
}: FeedPageInput): Promise<FeedPageData> {
  const limit = INITIAL_PAGE_SIZE;
  // 空白のみは「検索なし」扱い(キャッシュ済み getFeed の経路を維持する)
  const search = query?.trim() || undefined;
  // 空白のみは「タグ絞り込みなし」に正規化
  const tagFilter = tag?.trim() || undefined;
  // カテゴリも空白のみは「絞り込みなし」に正規化(enum 検証は application 層で行う)
  const categoryFilter = category?.trim() || undefined;
  const session = await getSession();

  if (!session) {
    // 明示フィルタ(?company)があれば優先。無ければ購読スコープ(Cookie: 全社から OFF を除く)を適用する。
    let companyIds: string[] | undefined;
    if (companySlugs && companySlugs.length > 0) {
      const ids = await resolveSelectedCompanyIds(companySlugs, null);
      companyIds = ids.length > 0 ? ids : undefined;
    } else {
      const scope = await resolveCompanyScope(null);
      // 全社 OFF はフィードが空。ログイン時の allOff と同じ空状態(設定への導線)を返す。
      if (scope.allOff) {
        return { items: [], hasMore: false, allOff: true, isEmpty: true, isGuest: true };
      }
      companyIds = scope.companyIds;
    }
    const guestInput = {
      sort,
      period,
      page,
      limit,
      companyIds,
      tag: tagFilter,
      category: categoryFilter,
    };
    const feed = search
      ? await searchFeed({ ...guestInput, query: search })
      : await getFeed(guestInput);
    const summaries = await resolveSummaries(feed.items.map((a) => a.id));
    return {
      items: feed.items.map((article, i) => ({
        article,
        bookmarked: false,
        favorited: false,
        summary: summaries[i] ?? null,
      })),
      hasMore: feed.hasMore,
      allOff: false,
      isEmpty: feed.items.length === 0,
      isGuest: true,
    };
  }

  const userId = asUserId(session.user.id);
  // 保存状態(bm/fav)は userId にのみ依存し companyIds 解決を待たない。
  // session 取得直後に投げて、購読企業の解決〜feed クエリ(最重)と完全に重ねる(コールドキャッシュ時のウォーターフォール解消)。
  const bookmarkedIdsPromise = getBookmarkedArticleIds(userId);
  const favoritedIdsPromise = getFavoritedArticleIds(userId);

  // allOff は「購読が全 OFF」だけでは決まらない(マイフィードのみ表示のケースがあるため)。
  // ここでは companyIds(購読スコープ)だけを resolveCompanyScope から借り、allOff の最終判定は
  // 下の allEnabledFeedIds を含めた判定に委ねる(scope.allOff は使わない)。
  const subscribedIds = (await resolveCompanyScope(session)).companyIds ?? [];

  // マイフィード(プライベートRSS)を混ぜられるのは新着順・フィルタ/検索なしの主経路のみ(ADR-0014)。
  // タグ/カテゴリ絞り込みは公開記事のみ対象なのでマージしない(ADR-0027 / ADR-0034)。
  const mergeable =
    !search && !tagFilter && !categoryFilter && readMode === 'all' && sort === 'latest';
  const allEnabledFeedIds = mergeable ? await getEnabledUserFeedIds(userId) : [];

  // 全企業 OFF かつ 有効マイフィードも無いときだけ allOff(空状態 + 設定導線)。
  // マイフィードがあれば、購読が全 OFF でもそれを表示するため続行する。
  if (subscribedIds.length === 0 && allEnabledFeedIds.length === 0) {
    void bookmarkedIdsPromise.catch(() => {});
    void favoritedIdsPromise.catch(() => {});
    return { items: [], hasMore: false, allOff: true, isEmpty: true, isGuest: false };
  }

  const companyFilterActive = !!(companySlugs && companySlugs.length > 0);
  const feedFilterActive = !!(feedIds && feedIds.length > 0);
  // 選択企業を購読スコープ内に絞る。選択フィードを所有・有効スコープに絞る。
  const selectedCompanyIds = await resolveSelectedCompanyIds(companySlugs, subscribedIds);
  const enabledFeedSet = new Set(allEnabledFeedIds);
  const selectedFeedIds = feedIds ? feedIds.filter((id) => enabledFeedSet.has(id)) : [];

  // ?feed だけのフィルタで有効な選択が1件も無い → 空(全公開へのフォールバックはしない)。
  if (mergeable && feedFilterActive && !companyFilterActive && selectedFeedIds.length === 0) {
    void bookmarkedIdsPromise.catch(() => {});
    void favoritedIdsPromise.catch(() => {});
    return { items: [], hasMore: false, allOff: false, isEmpty: true, isGuest: false };
  }

  // 源スコープを決める(ADR-0014): 企業のみ→公開のみ / フィード のみ→マイフィードのみ / 両方→併用 / 無指定→全部。
  let companyIds: string[];
  let userFeedIds: string[];
  let includePublic: boolean;
  if (mergeable && (companyFilterActive || feedFilterActive)) {
    companyIds = selectedCompanyIds;
    userFeedIds = selectedFeedIds;
    includePublic = companyFilterActive && selectedCompanyIds.length > 0;
  } else if (mergeable) {
    companyIds = subscribedIds;
    userFeedIds = allEnabledFeedIds;
    // 購読が全 OFF(マイフィードのみ)のときは公開を含めない。
    includePublic = subscribedIds.length > 0;
  } else {
    // 非マージ経路(popular/検索/既読フィルタ): 公開記事のみ。企業フィルタだけ反映する。
    companyIds = selectedCompanyIds.length > 0 ? selectedCompanyIds : subscribedIds;
    userFeedIds = [];
    includePublic = true;
  }

  // 未読/既読フィルタ時は per-user な reads 絞り込み版を使う(全件既読集合を取得せず SQL で絞る)。
  // 検索時はキャッシュを通さない searchFeed に一本化(既読フィルタも readFilter 引数で併用。ADR-0022)。
  const feedInput = {
    sort,
    period,
    page,
    limit,
    companyIds,
    tag: tagFilter,
    category: categoryFilter,
  };
  const feedPromise = search
    ? searchFeed({
        ...feedInput,
        query: search,
        readFilter: readMode === 'all' ? undefined : { userId, mode: readMode },
      })
    : readMode === 'all'
      ? userFeedIds.length > 0
        ? getMergedFeed(userId, userFeedIds, feedInput, includePublic)
        : getFeed(feedInput)
      : getReadFilteredFeed(userId, readMode, feedInput);

  const [feed, bookmarkedIds, favoritedIds] = await Promise.all([
    feedPromise,
    bookmarkedIdsPromise,
    favoritedIdsPromise,
  ]);
  const bookmarkedSet = new Set(bookmarkedIds);
  const favoritedSet = new Set(favoritedIds);
  const summaries = await resolveSummaries(feed.items.map((a) => a.id));

  return {
    items: feed.items.map((article, i) => ({
      article,
      bookmarked: bookmarkedSet.has(article.id),
      favorited: favoritedSet.has(article.id),
      summary: summaries[i] ?? null,
    })),
    hasMore: feed.hasMore,
    allOff: false,
    isEmpty: feed.items.length === 0,
    isGuest: false,
  };
}

/** カテゴリ別セクション(棚)1つ分。保存状態・要約を合成した表示データ。 */
export type ComposedShelfSection = {
  category: ArticleCategory;
  items: ComposedArticle[];
};

/** トップページのセクション型フィード全体(合成済み)。 */
export type ComposedFeedSections = {
  latest: ComposedArticle[];
  shelves: ComposedShelfSection[];
  events: ComposedArticle[];
};

export type SectionsPageData = {
  /**
   * 棚が1つも作れない(全棚0本。バックフィル前で category がほぼ null 等)・全企業OFF の場合は null。
   * 呼び出し側(page.tsx)は既存のリスト表示(SubscribedFeed)へフォールバックする(ADR-0034)。
   */
  sections: ComposedFeedSections | null;
  isGuest: boolean;
};

/**
 * トップページの既定状態(フィルタ・並び替え未指定)専用の合成点。セクション型フィード
 * (新着 + カテゴリ別棚 + イベント)に、購読スコープ・保存状態・AI要約を合成する。
 * getFeedPageData と同じ「features 間 import 禁止のため app 層で束ねる」構成(ADR-0013)。
 *
 * 購読スコープの解決は resolveCompanyScope に共通化しており、getFeedPageData(既存のリスト表示)と
 * 同じロジックを使う(棚とリストで表示される企業が食い違わないようにする)。全企業 OFF・
 * 棚が1つも作れない場合は null を返し、呼び出し側が既存のリスト表示へフォールバックする
 * (バックフィル前でも空ページ化しない。ADR-0034)。
 */
export async function getSectionsPageData(): Promise<SectionsPageData> {
  const session = await getSession();
  const isGuest = !session;

  const scope = await resolveCompanyScope(session);
  if (scope.allOff) {
    // 全企業OFF: SubscribedFeed の allOff 空状態(設定への導線)に任せる。
    return { sections: null, isGuest };
  }

  const raw = await getFeedSections(scope.companyIds);
  // 棚が1つも作れない(バックフィル前で category がほぼ null 等)ときは、
  // 既存のリスト表示にフォールバックする(空ページ化を防ぐ。ADR-0034)。
  if (raw.shelves.length === 0) {
    return { sections: null, isGuest };
  }

  const allArticles = [...raw.latest, ...raw.shelves.flatMap((s) => s.items), ...raw.events];
  const articleIds = allArticles.map((a) => a.id);

  const [bookmarkedIds, favoritedIds] = session
    ? await Promise.all([
        getBookmarkedArticleIds(asUserId(session.user.id)),
        getFavoritedArticleIds(asUserId(session.user.id)),
      ])
    : [[], []];
  const bookmarkedSet = new Set(bookmarkedIds);
  const favoritedSet = new Set(favoritedIds);
  const summaries = await resolveSummaries(articleIds);
  const summaryByArticleId = new Map(articleIds.map((id, i) => [id, summaries[i] ?? null]));

  const compose = (article: ArticleCardDto): ComposedArticle => ({
    article,
    bookmarked: bookmarkedSet.has(article.id),
    favorited: favoritedSet.has(article.id),
    summary: summaryByArticleId.get(article.id) ?? null,
  });

  return {
    sections: {
      latest: raw.latest.map(compose),
      shelves: raw.shelves.map((shelf) => ({
        category: shelf.category,
        items: shelf.items.map(compose),
      })),
      events: raw.events.map(compose),
    },
    isGuest,
  };
}

/**
 * 企業ページ(/companies/[slug])用に、その企業の公開記事を新着順で取得する合成点。
 *
 * getFeedPageData と違い **購読スコープを一切かけない**: 企業ページは公開ランディングなので、
 * 未購読のログインユーザーにもその企業の全記事を見せる必要がある(SEO 面 + 発見導線)。
 * そのためゲスト共通でキャッシュ済みの getFeed(companyIds=[id])経路を使い、
 * ログイン時のみ保存状態(bm/fav)を上乗せする。AI要約も同時に合成する。
 *
 * 返り値は getFeedPageData と同じ ComposedArticle 配列(カード描画を共通化するため)。
 * 企業が見つからない時は呼び出し側(ページ)が getCompanyBySlug で notFound 済みなので、
 * ここでは items が空になりうるだけ(記事ゼロの企業)。
 */
export async function getCompanyArticles({
  slug,
  page,
  limit = INITIAL_PAGE_SIZE,
}: {
  slug: string;
  page: number;
  limit?: number;
}): Promise<{ items: ComposedArticle[]; hasMore: boolean; isGuest: boolean }> {
  const companies = await getCompanies();
  const company = companies.find((c) => c.slug === slug);
  // 企業が無い/無効なら記事も無い(ページ側で notFound 済みのため通常は通らない)。
  if (!company) return { items: [], hasMore: false, isGuest: true };

  const feed = await getFeed({ sort: 'latest', page, limit, companyIds: [company.id] });
  const session = await getSession();

  const [bookmarkedIds, favoritedIds] = session
    ? await Promise.all([
        getBookmarkedArticleIds(asUserId(session.user.id)),
        getFavoritedArticleIds(asUserId(session.user.id)),
      ])
    : [[], []];
  const bookmarkedSet = new Set(bookmarkedIds);
  const favoritedSet = new Set(favoritedIds);
  const summaries = await resolveSummaries(feed.items.map((a) => a.id));

  return {
    items: feed.items.map((article, i) => ({
      article,
      bookmarked: bookmarkedSet.has(article.id),
      favorited: favoritedSet.has(article.id),
      summary: summaries[i] ?? null,
    })),
    hasMore: feed.hasMore,
    isGuest: !session,
  };
}

/**
 * 企業フィルタのチップに並べる企業を返す(ADR-0013 追補)。
 * - ログイン: 購読 ON の企業のみ(「すべて」が見せる集合と一致)
 * - 未ログイン: 全企業
 * 記事数の多い順(getCompanies の並び)を維持する。
 */
export async function getFeedFilterCompanies(): Promise<FilterCompany[]> {
  // getSession()(cookies=動的)を先に await し、ビルド時の PPR プリレンダはここで中断させる。
  // これにより 'use cache' な getCompanies がビルド時に評価されず、ビルド時 DB 接続を避ける
  // (CI/ビルド環境に到達可能な DB が無くても build が通る。ランタイムでは通常どおりキャッシュが効く)。ADR-0016
  const session = await getSession();
  const companies = await getCompanies();
  // 表示スコープ = 購読中の企業。ログイン=DB の購読 ON、ゲスト=Cookie の全社−OFF。
  // フィード本体(getFeedPageData)と同じスコープを返し、件数・チップ・シートの企業一覧を整合させる。
  let scoped = companies;
  if (session) {
    const subscribed = new Set(await getEnabledCompanyIds(asUserId(session.user.id)));
    scoped = companies.filter((c) => subscribed.has(c.id));
  } else {
    const cookieStore = await cookies();
    const disabled = readUnsubscribedFrom((name) => cookieStore.get(name)?.value);
    if (disabled.length > 0) scoped = companies.filter((c) => !disabled.includes(c.slug));
  }
  return scoped.map((c) => ({
    slug: c.slug,
    name: c.name,
    siteUrl: c.siteUrl,
    articleCount: c.articleCount,
  }));
}

/**
 * フィルタに並べるマイフィード(プライベート)を返す。ログイン時のみ・有効フィードのみ。
 * 未ログインは空配列(マイフィードはログイン専用)。
 */
export async function getFeedFilterUserFeeds(): Promise<FilterUserFeed[]> {
  const session = await getSession();
  if (!session) return [];
  return getUserFeedFilters(asUserId(session.user.id));
}

/**
 * 既定のフィルタ企業(全企業)。ツールバーの静的プリレンダ用(ADR-0019 の DefaultFeed と同型)。
 * セッションを読まないため PPR が静的シェルに焼き込め、リロード直後からツールバーが表示される。
 * 購読スコープ版(getFeedFilterCompanies)がストリームで上書きする(ゲストは内容一致のため差し替えは
 * 不可視。ADR-0012 で購読既定=全社のためログイン時も大半は一致)。
 * DB 非到達のビルドでは空配列(並び替えタブは出る・企業メニューは実データ到着まで空)。
 * 企業一覧は throw しない getSidebarCompanies を共用する(同じ「脇役は落とさない」性質)。
 */
export async function getDefaultFilterCompanies(): Promise<FilterCompany[]> {
  const companies = await getSidebarCompanies();
  return companies.map((c) => ({
    slug: c.slug,
    name: c.name,
    siteUrl: c.siteUrl,
    articleCount: c.articleCount,
  }));
}
