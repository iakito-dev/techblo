import type { ArticleCategory } from '@/shared/categories';
import { SHELF_CATEGORIES } from '@/shared/categories';
import type { ArticleCard } from './dto';

/**
 * 新着の件数(カテゴリ不問・最大列数(4列)×3行)。サーバはビューポート(=実際の列数)を
 * 知らない(ADR-0019)ため常に最大件数を取得しておき、実列数に満たない分は表示側が CSS
 * コンテナクエリ(feed-grid-classes.ts の feedCutoffClass('latest'))で隠す(ADR-0035)。
 */
export const LATEST_COUNT = 12;
/**
 * 棚1つあたりの表示件数(最大列数(4列)×2行)。LATEST_COUNT と同じ理由で最大件数ぶんを
 * 取得し、表示側が feedCutoffClass('shelf') で実列数に満たない分を隠す。
 *
 * 1行(最大4件)だと、一般的なノート PC 幅(3列)で棚が3件ずつしか並ばず、見出しと「もっと見る」の
 * 割に中身が薄かった。2行にすると 3列=6件 / 4列=8件 / 2列=4件 と、どの幅でも行が欠けないまま
 * 棚1つで読む候補が増える。新着(3行)より浅く保つのは、棚はあくまで入口で、深く読むのは
 * 「もっと見る」の一覧側という役割分担を維持するため。
 */
export const SHELF_ITEM_COUNT = 8;
/** イベント・コミュニティのリスト表示件数(列グリッド化しないため幅によらず一定)。 */
export const EVENTS_COUNT = 6;

/** カテゴリ別セクション(棚)1つ分。 */
export type ShelfSection = {
  category: ArticleCategory;
  items: ArticleCard[];
};

/** トップページのセクション型フィード全体。 */
export type FeedSections = {
  /** 新着(カテゴリ不問・最新 LATEST_COUNT 件)。 */
  latest: ArticleCard[];
  /** 棚(SHELF_CATEGORIES の並び順。0本の棚は含まない)。 */
  shelves: ShelfSection[];
  /** イベント・コミュニティ(棚にせず1行リストで表示。ADR-0034)。 */
  events: ArticleCard[];
};

/**
 * 新着 + カテゴリ別記事から、棚とイベントを組み立てる純粋関数(I/O なし)。
 *
 * 重複禁止(仕様): 新着に出た記事は棚・イベントのどちらにも出さない。呼び出し側(web/queries.ts)が
 * 各カテゴリを表示件数より多めに取得しておき、ここで新着 ID を除外してから棚ごとに
 * SHELF_ITEM_COUNT 件・イベントを EVENTS_COUNT 件に切り詰める。
 * 件数に満たない棚はある分だけ、0本の棚は結果に含めない(表示側が棚見出し自体を出さないため)。
 *
 * 重複除外は取得した新着 LATEST_COUNT(12)件すべてを対象にする(狭い列数だけ対象にする、
 * のような分岐はしない)。そのため狭い幅(feedCutoffClass('latest') が新着の一部を隠す列数)では、
 * 画面に出ていない新着 7〜12 件目に該当した記事は棚・イベントにも出てこない(ADR-0035)。
 */
export function buildFeedSections({
  latest,
  categorized,
}: {
  latest: ArticleCard[];
  /** listLatestByCategories の結果を ArticleCard に変換したもの(カテゴリ内は publishedAt 降順)。 */
  categorized: { article: ArticleCard; category: ArticleCategory }[];
}): FeedSections {
  const latestIds = new Set(latest.map((a) => a.id));
  // 新着に出た記事は棚・イベントの両方から除外する(重複表示の禁止)。
  const remaining = categorized.filter((c) => !latestIds.has(c.article.id));

  const shelves: ShelfSection[] = SHELF_CATEGORIES.map((category) => ({
    category,
    items: remaining
      .filter((c) => c.category === category)
      .slice(0, SHELF_ITEM_COUNT)
      .map((c) => c.article),
  })).filter((shelf) => shelf.items.length > 0);

  const events = remaining
    .filter((c) => c.category === 'event')
    .slice(0, EVENTS_COUNT)
    .map((c) => c.article);

  return { latest, shelves, events };
}

/**
 * 棚が1つも作れない(全棚0本)か。表示側(web層)がこれを見て、セクション表示を諦め
 * 既存のリスト表示(SubscribedFeed)へフォールバックする(バックフィル前の category 未分類期間の保険。ADR-0034)。
 */
export function hasNoShelves(sections: FeedSections): boolean {
  return sections.shelves.length === 0;
}
