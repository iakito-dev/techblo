import type { ArticleCategory } from '@/shared/categories';
import {
  articleCategorySchema,
  CATEGORY_DEFINITIONS,
  getCategoryDefinition,
} from '@/shared/categories';

/**
 * モバイルのカテゴリタブのキー。'latest'(新着)は category 未指定の状態を表す
 * (URL 上は `?category=` を持たない特別なタブで、ArticleCategory には含めない)。
 */
export type CategoryTabKey = 'latest' | ArticleCategory;

/**
 * タブの並び順: 新着 → カテゴリ定義の並び順(event を含む)。
 * event は棚(isShelf=false)としては表示しないが、タブとしては表示する
 * (「イベント」だけを見たいユーザー導線のため。仕様書のタブ一覧に明記)。
 */
export const CATEGORY_TAB_KEYS: readonly CategoryTabKey[] = [
  'latest',
  ...CATEGORY_DEFINITIONS.map((d) => d.key),
];

/** 横スクロールの1行に収めるための短縮表示名。無いカテゴリは定義の label をそのまま使う。 */
const SHORT_LABELS: Partial<Record<ArticleCategory, string>> = {
  event: 'イベント',
};

/** タブの表示名。 */
export function categoryTabLabel(key: CategoryTabKey): string {
  if (key === 'latest') return '新着';
  return SHORT_LABELS[key] ?? getCategoryDefinition(key).label;
}

/**
 * `?category=` の生値をタブキーへ正規化する。未指定・カテゴリ定義に無い値は 'latest'
 * (= 新着 = category 絞り込み無し)に丸める。
 */
export function parseCategoryTab(value: string | null | undefined): CategoryTabKey {
  if (!value) return 'latest';
  const parsed = articleCategorySchema.safeParse(value);
  return parsed.success ? parsed.data : 'latest';
}

/**
 * カテゴリタブ切替先の URL を組み立てる純関数(単体テスト対象)。
 * - 'latest'(新着)または不正なキーは `?category=` を削除する(タブとして選べない値は
 *   新着扱いに丸める。他フィルタと同じ「不正値は既定に丸める」方針)
 * - それ以外は `?category=<key>` をセットする
 * - q/company/read/sort/period/tag/feed など他のクエリパラメータは保持する
 * - カテゴリが変わると対象集合が変わるため `?page=` は必ず削除する(FeedList が URL 変化を検知)
 */
export function buildCategoryTabHref(currentParams: URLSearchParams, key: string): string {
  const tab = parseCategoryTab(key);
  const sp = new URLSearchParams(currentParams);
  if (tab === 'latest') sp.delete('category');
  else sp.set('category', tab);
  sp.delete('page');
  const qs = sp.toString();
  return qs ? `/?${qs}` : '/';
}
