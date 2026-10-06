import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@/db/client';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { logger } from '@/lib/observability/logger';
import { SHELF_CATEGORIES } from '@/shared/categories';
import { asArticleId, asCompanyId } from '@/shared/type-utils';
import { countByCategory } from '../application/count-by-category';
import type {
  ArticleCard,
  CompanyDetailDto,
  CompanyWithCount,
  FeedPage,
  ListFeedInput,
} from '../application/dto';
import { toArticleCard } from '../application/dto';
import { getCompany } from '../application/get-company';
import { listCompanies } from '../application/list-companies';
import { listFeed } from '../application/list-feed';
import {
  ALL_TAGS_LIMIT,
  listPopularTags,
  RECENT_TAGS_DAYS,
  RECENT_TAGS_LIMIT,
} from '../application/list-popular-tags';
import { listRelatedArticles } from '../application/list-related-articles';
import {
  buildFeedSections,
  EVENTS_COUNT,
  type FeedSections,
  LATEST_COUNT,
  SHELF_ITEM_COUNT,
} from '../application/list-sections';
import type { CategoryCounts, PopularTag } from '../domain/article-repository';
import { DrizzleArticleRepository } from '../infrastructure/drizzle-article-repository';
import { DrizzleCompanyRepository } from '../infrastructure/drizzle-company-repository';

/**
 * RSC が呼ぶ composition root(Driving Adapter)。
 * Repository を組み立ててユースケースへ注入し、Result を RSC が扱いやすい形に変換する。
 * 想定エラー(Result の err)はログして throw し、error.tsx / global-error.tsx に委ねる。
 *
 * 注意: このモジュールは Server Component / Server Action からのみ import すること。
 */
const articleRepo = new DrizzleArticleRepository(db);
const companyRepo = new DrizzleCompanyRepository(db);

/**
 * 公開フィードはゲスト共通なので (sort, page, limit, companyIds) をキーにキャッシュする。
 *
 * cacheLife は 'days'。鮮度はイベント駆動で担保する: 取込 cron(trigger/fetch-feed-articles.ts)が
 * 新着 or はてブ数更新のたびに /api/revalidate を叩き、Next 側で revalidateTag(CACHE_TAGS.feed) する。
 * cron は Next ランタイム外で revalidateTag を直接呼べないための route 経由。これで新着は即反映されつつ、
 * 寿命を最大限延ばして各バリアントをウォームに保てる。
 * (TTL が短いと 'minutes' のように各バリアントが頻繁にコールドへ戻り、切替ごとに
 * Neon 往復(実測 130ms〜2200ms)を踏む。'days' + 即時無効化で切替を定常 ~30ms に均す。ADR-0016 の URL+RSC 方針は維持)
 * 注意: REVALIDATE_SECRET 未設定だと無効化が効かず最大 'days' 古い記事が残るので、本番では必ず設定する。
 */
export async function getFeed(input: ListFeedInput = {}): Promise<FeedPage> {
  'use cache';
  cacheTag(CACHE_TAGS.feed);
  cacheLife('days');

  const result = await listFeed({ articles: articleRepo })(input);
  if (!result.ok) {
    logger.error('listFeed failed', { error: result.error });
    throw new Error('フィードの取得に失敗しました', { cause: result.error });
  }
  return result.value;
}

/**
 * トップページのセクション型フィード(新着 + カテゴリ別の棚 + イベント)。
 * 新着は既存の listFeed 経路(sort=latest)を再利用し、棚・イベントは Repository の
 * listLatestByCategories で1クエリにまとめて取得する。組み立て(重複除外・切り詰め)は
 * application 層の純関数 buildFeedSections に委ねる(ADR-0034)。
 *
 * ゲスト既定(companyIds 未指定)経路は getFeed と同じ 'use cache' + cacheTag(feed)。
 * 'minutes' にしているのは、getFeed の 'days' + イベント駆動無効化と違い、こちらは
 * 購読スコープ(companyIds)ぶんバリアントが増えログインユーザー数に比例するため、
 * 寿命を抑えてストア肥大を避ける(ADR-0016 のユーザー単位キャッシュと同じ考え方)。
 */
export async function getFeedSections(companyIds?: string[]): Promise<FeedSections> {
  'use cache';
  cacheTag(CACHE_TAGS.feed);
  cacheLife('minutes');

  const latestResult = await listFeed({ articles: articleRepo })({
    sort: 'latest',
    page: 1,
    limit: LATEST_COUNT,
    companyIds,
  });
  if (!latestResult.ok) {
    logger.error('getFeedSections: listFeed(latest) failed', { error: latestResult.error });
    throw new Error('フィードの取得に失敗しました', { cause: latestResult.error });
  }

  // 新着との重複除外後も各棚・イベントが表示件数ぶん残せるよう、新着 LATEST_COUNT 件が
  // 全部同じカテゴリに寄っていても表示件数(棚は SHELF_ITEM_COUNT、イベントは EVENTS_COUNT の
  // 大きい方)を確保できる件数を取得する(usecase 側で新着 ID を除外して切り詰める)。
  const perCategory = LATEST_COUNT + Math.max(SHELF_ITEM_COUNT, EVENTS_COUNT);
  const categorizedRows = await articleRepo.listLatestByCategories({
    categories: [...SHELF_CATEGORIES, 'event'],
    perCategory,
    companyIds: companyIds?.map(asCompanyId),
  });
  const categorized = categorizedRows.map((row) => ({
    article: toArticleCard(row),
    category: row.category,
  }));

  return buildFeedSections({ latest: latestResult.value.items, categorized });
}

/**
 * 未読/既読フィルタ済みフィード(ログイン時のみ)。reads との EXISTS/NOT EXISTS で per-user に絞る(ADR-0021)。
 * ゲスト共通の getFeed と違い結果がユーザー依存なので、キーに userId/mode を含め、タグは
 * [feed, userReads(userId)] の2つ。新着取込(feed)と既読化(userReads)のどちらでも無効化される。
 * cacheLife は getFeed と同じ 'days'(既読化は revalidateTag(userReads,'max') で遅延無効化)。
 */
export async function getReadFilteredFeed(
  userId: string,
  mode: 'unread' | 'read',
  input: ListFeedInput = {},
): Promise<FeedPage> {
  'use cache';
  cacheTag(CACHE_TAGS.feed);
  cacheTag(CACHE_TAGS.userReads(userId));
  cacheLife('days');

  const result = await listFeed({ articles: articleRepo })({
    ...input,
    readFilter: { userId, mode },
  });
  if (!result.ok) {
    logger.error('listFeed (read-filtered) failed', { error: result.error, userId, mode });
    throw new Error('フィードの取得に失敗しました', { cause: result.error });
  }
  return result.value;
}

/**
 * 検索(?q=)付きフィード。getFeed と違い **'use cache' を付けない**(ADR-0022)。
 * q はバリアント基数が非有界(ユーザー数 × 語彙)で、「'days' + イベント駆動無効化」の
 * 現行キャッシュ戦略は少数有界バリアント(sort×period×company×page)が前提のため、
 * q を混ぜるとストア肥大と revalidateTag('feed') の無効化コスト増を招く。
 * 検索は能動操作で trgm インデックスもあるため、都度の Neon 往復を許容する。
 * 既読フィルタも input.readFilter で受けて1クエリで完結する(per-user タグ配管が不要)。
 */
export async function searchFeed(input: ListFeedInput): Promise<FeedPage> {
  const result = await listFeed({ articles: articleRepo })(input);
  if (!result.ok) {
    logger.error('listFeed (search) failed', { error: result.error, query: input.query });
    throw new Error('記事の検索に失敗しました', { cause: result.error });
  }
  return result.value;
}

/**
 * ユーザー登録RSS(プライベート)を公開記事にマージした新着フィード(ログイン時のみ・主経路)。
 * 結果がユーザー依存なので getFeed と分け、キーに userId/userFeedIds を含める。タグは
 * [feed, userFeeds(userId)] の2つ: 公開記事の新着取込(feed)とマイフィードの変更/取込(userFeeds)
 * のどちらでも無効化される。cacheLife は getFeed と同じ 'days'(ADR-0014)。
 */
export async function getMergedFeed(
  userId: string,
  userFeedIds: string[],
  input: ListFeedInput = {},
  includePublic = true,
): Promise<FeedPage> {
  'use cache';
  cacheTag(CACHE_TAGS.feed);
  cacheTag(CACHE_TAGS.userFeeds(userId));
  cacheLife('days');

  const result = await listFeed({ articles: articleRepo })({
    ...input,
    userFeedIds,
    includePublicArticles: includePublic,
  });
  if (!result.ok) {
    logger.error('listFeed (merged) failed', { error: result.error, userId });
    throw new Error('フィードの取得に失敗しました', { cause: result.error });
  }
  return result.value;
}

export async function getCompanies(): Promise<CompanyWithCount[]> {
  'use cache';
  cacheTag(CACHE_TAGS.companies);
  cacheLife('days');

  const result = await listCompanies({ companies: companyRepo })();
  if (!result.ok) {
    logger.error('listCompanies failed', { error: result.error });
    throw new Error('企業一覧の取得に失敗しました', { cause: result.error });
  }
  return result.value;
}

/**
 * カテゴリ別の記事数(モバイルのカテゴリ絞り込みの件数表示用)。
 * companyIds(購読スコープ/企業フィルタ)ぶんバリアントが増えるため、getFeedSections と同じ
 * 'minutes' キャッシュにする('days' にすると購読を変えたユーザー数ぶんストアが肥大する)。
 * タグは feed と共通にし、新着取込(カテゴリ分類の反映を含む)で無効化されるようにする。
 */
export async function getCategoryCounts(companyIds?: string[]): Promise<CategoryCounts> {
  'use cache';
  cacheTag(CACHE_TAGS.feed);
  cacheLife('minutes');

  const result = await countByCategory({ articles: articleRepo })(companyIds?.map(asCompanyId));
  if (!result.ok) {
    logger.error('countByCategory failed', { error: result.error });
    throw new Error('カテゴリ別件数の取得に失敗しました', { cause: result.error });
  }
  return result.value;
}

/**
 * サイドバー用の企業一覧。getCompanies と違い throw せず空配列を返す:
 * サイドバーは全ページ共通の脇役なので、DB 障害時にページ全体を error boundary に
 * 落とすより空で描画する方がよい。throw する getCompanies をネストせず
 * listCompanies/repo を直接呼ぶ(キャッシュ関数の内側 reject がビルドを致命化するのを避ける)。
 * 呼び出し側(Sidebar)は connection() で動的化しており、ビルド時には実行されない。
 * 既定ツールバー(DefaultToolbar)の静的プリレンダにも同じ性質(throw しない)が必要なため共用する
 * (ビルド時 DB 非到達では空配列 → 並び替えタブのみ表示)。
 */
export async function getSidebarCompanies(): Promise<CompanyWithCount[]> {
  'use cache';
  cacheTag(CACHE_TAGS.companies);
  cacheLife('days');

  try {
    const result = await listCompanies({ companies: companyRepo })();
    if (!result.ok) {
      logger.warn('getSidebarCompanies: listCompanies failed(空で描画)', { error: result.error });
      // 失敗の空配列を 'days' で焼かない(一時障害から数分で自己回復させる)。
      cacheLife('minutes');
      return [];
    }
    return result.value;
  } catch (error) {
    logger.warn('getSidebarCompanies: 企業一覧の取得に失敗(空で描画)', { error });
    cacheLife('minutes');
    return [];
  }
}

/**
 * slug で1社の詳細を取得する(企業ページ /companies/[slug] 用)。存在しなければ null。
 * 企業マスタは滅多に変わらないので companies タグで 'days' キャッシュし、
 * 取込で増える記事数の鮮度は feed タグの無効化に乗せる(getCompanies と同方針)。
 */
export async function getCompanyBySlug(slug: string): Promise<CompanyDetailDto | null> {
  'use cache';
  cacheTag(CACHE_TAGS.companies);
  cacheTag(CACHE_TAGS.feed);
  cacheLife('days');

  const result = await getCompany({ companies: companyRepo })(slug);
  if (!result.ok) {
    logger.error('getCompany failed', { error: result.error, slug });
    throw new Error('企業情報の取得に失敗しました', { cause: result.error });
  }
  return result.value;
}

/** サイトマップ1エントリ(企業ページ /companies/[slug] 用)。 */
export type SitemapCompanyEntry = { slug: string };

/**
 * サイトマップ用に公開中の全企業 slug を取得する。
 * 企業数は少数(有界)なので listCompanies をそのまま使い、slug だけ取り出す。
 */
export async function getSitemapCompanies(): Promise<SitemapCompanyEntry[]> {
  'use cache';
  cacheTag(CACHE_TAGS.companies);
  cacheLife('days');

  // Repository は Result ではなく例外を投げる(drizzle/postgres のエラー)ため、
  // ok 判定だけでなく catch も要る。sitemap.xml はビルド時にプリレンダされるので、
  // DB 非到達のビルド(CI はダミーの DATABASE_URL を渡す)でも落とさず静的エントリだけ返す。
  // getSidebarCompanies と同じく失敗を 'days' で焼かず 'minutes' にして自己回復させる。
  try {
    const result = await listCompanies({ companies: companyRepo })();
    if (!result.ok) {
      logger.warn('getSitemapCompanies: listCompanies failed(空で返す)', { error: result.error });
      cacheLife('minutes');
      return [];
    }
    return result.value.map((c) => ({ slug: c.slug }));
  } catch (error) {
    logger.warn('getSitemapCompanies: 企業一覧の取得に失敗(空で返す)', { error });
    cacheLife('minutes');
    return [];
  }
}

/** サイトマップ1エントリ(記事ページ /a/[id] 用)。 */
export type SitemapArticleEntry = { id: string; updatedAt: Date };

/**
 * サイトマップ用に直近の公開記事を新着順で取得する(id と updatedAt のみ)。
 * 取込で増える feed タグに乗せ、cacheLife は他フィードと同じ 'days'。
 * 件数上限はサイトマップ側(app/sitemap.ts)で渡す。
 */
export async function getSitemapArticles(limit: number): Promise<SitemapArticleEntry[]> {
  'use cache';
  cacheTag(CACHE_TAGS.feed);
  cacheLife('days');

  // getSitemapCompanies と同じ理由で、DB 非到達でも sitemap のプリレンダを落とさない。
  try {
    const rows = await articleRepo.listForSitemap(limit);
    return rows.map((r) => ({ id: r.id as string, updatedAt: r.updatedAt }));
  } catch (error) {
    logger.warn('getSitemapArticles: 記事一覧の取得に失敗(空で返す)', { error });
    cacheLife('minutes');
    return [];
  }
}

/**
 * 1記事を表示 DTO で取得(OGP 画像生成等の単発参照用)。存在しなければ null。
 */
export async function getArticleById(id: string): Promise<ArticleCard | null> {
  const article = await articleRepo.findById(asArticleId(id));
  return article ? toArticleCard(article) : null;
}

/**
 * 指定 id 群の記事を表示 DTO で取得。入力 id の順序を保持する
 * (ブックマーク/お気に入りの追加順を一覧で維持するため)。削除済みは除外。
 *
 * ブックマーク/お気に入りページの表示クエリ。ids 配列をキーに `'use cache'` 化し、
 * 再訪・リロード時の Neon 往復をなくす(ADR-0016 と同方針)。保存トグルで ids が
 * 変わればキーも変わり最新を引く。新規取り込み・記事更新は feed タグ無効化(取込 cron→
 * /api/revalidate)で反映する。
 *
 * cacheLife は getFeed と同じ 'days'。鮮度は feed タグのイベント駆動無効化に任せ、
 * 寿命を延ばして保存ページの記事本体をウォームに保つ('minutes' だと数分でコールドに戻り、
 * 再訪のたびに Neon 往復を踏んでいた)。
 */
export async function getArticlesByIds(ids: string[]): Promise<ArticleCard[]> {
  'use cache';
  cacheTag(CACHE_TAGS.feed);
  cacheLife('days');

  if (ids.length === 0) return [];
  const articles = await articleRepo.listByIds(ids.map(asArticleId));
  const byId = new Map(articles.map((a) => [a.id as string, toArticleCard(a)]));
  return ids.map((id) => byId.get(id)).filter((c): c is ArticleCard => c !== undefined);
}

/**
 * 記事ページ下部の関連記事(AI要約タグの重なり順 + 同企業新着で補完。ADR-0037)。
 * 補助情報なので、取得失敗で記事ページ全体を落とさず空で返す(失敗結果は短命キャッシュ)。
 * id は呼び出し側(ページ)で UUID 検証済みのものだけを渡すこと(不正形式は DB エラーになる)。
 */
export async function getRelatedArticles(id: string): Promise<ArticleCard[]> {
  'use cache';
  cacheTag(CACHE_TAGS.feed);
  cacheLife('days');

  try {
    const result = await listRelatedArticles({ articles: articleRepo })(id);
    if (!result.ok) {
      logger.warn('getRelatedArticles: 関連記事の取得に失敗(空で返す)', { error: result.error });
      cacheLife('minutes');
      return [];
    }
    return result.value;
  } catch (error) {
    logger.warn('getRelatedArticles: 関連記事の取得に失敗(空で返す)', { error });
    cacheLife('minutes');
    return [];
  }
}

export type TagIndex = { recent: PopularTag[]; all: PopularTag[] };

/**
 * タグ一覧ページ(/tags)用の集計。直近 RECENT_TAGS_DAYS 日の上位と全期間の上位を1エントリで返す(ADR-0040)。
 * tags 全件走査の集計なので 'hours' でキャッシュし、feed タグで新着取り込み時に失効させる。
 * 補助ページなので失敗時は logger.warn して空で返す(失敗結果は短命キャッシュ)。
 */
export async function getPopularTags(): Promise<TagIndex> {
  'use cache';
  cacheTag(CACHE_TAGS.feed);
  cacheLife('hours');

  try {
    const run = listPopularTags({ articles: articleRepo });
    const [recent, all] = await Promise.all([
      run(RECENT_TAGS_LIMIT, RECENT_TAGS_DAYS),
      run(ALL_TAGS_LIMIT),
    ]);
    if (!recent.ok || !all.ok) {
      logger.warn('getPopularTags: タグ集計の取得に失敗(空で返す)', {
        error: !recent.ok ? recent.error : !all.ok ? all.error : undefined,
      });
      cacheLife('minutes');
      return { recent: [], all: [] };
    }
    return { recent: recent.value, all: all.value };
  } catch (error) {
    logger.warn('getPopularTags: タグ集計の取得に失敗(空で返す)', { error });
    cacheLife('minutes');
    return { recent: [], all: [] };
  }
}
