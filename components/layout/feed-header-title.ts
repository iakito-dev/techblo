import { articleCategorySchema, getCategoryDefinition } from '@/shared/categories';

/**
 * トップ(/)の見出し行(FeedHeader)の表示判定に使う URL パラメータ。
 * page.tsx の FeedSearchParams / isDefaultState と同じ集合(?category を含む)。
 */
export type FeedHeaderParams = {
  category?: string | null;
  sort?: string | null;
  period?: string | null;
  company?: string | null;
  feed?: string | null;
  read?: string | null;
  q?: string | null;
  tag?: string | null;
};

const nonEmpty = (value: string | null | undefined): boolean => !!value?.trim();

/**
 * category 以外の絞り込み/並び替えが1つでも指定されているか。
 * 「新着一覧」判定(sort=latest のみ)や既定状態判定に使う。
 */
function hasOtherFilter(params: FeedHeaderParams): boolean {
  return (
    nonEmpty(params.period) ||
    nonEmpty(params.company) ||
    nonEmpty(params.feed) ||
    nonEmpty(params.read) ||
    nonEmpty(params.q) ||
    nonEmpty(params.tag)
  );
}

/**
 * フィルタ・並び替えが何も指定されていない既定状態か(page.tsx の isDefaultState と同じ条件)。
 * 既定状態はデスクトップではセクション型フィードになるため、「← トップ」の表示要否に使う。
 */
export function isFeedDefaultView(params: FeedHeaderParams): boolean {
  return !nonEmpty(params.category) && !nonEmpty(params.sort) && !hasOtherFilter(params);
}

/**
 * トップ(/)の見出し(FeedHeader)のラベルを URL パラメータから決める純関数。
 * - ?category=<key> が有効なカテゴリキーなら、そのカテゴリの表示名(shared/categories.ts)
 * - ?tag=<label> があれば「#<label>」(category が有効ならそちらが優先)
 * - category 未指定 かつ 他の絞り込みも無く sort=latest だけが指定された「新着一覧」なら「新着」
 * - それ以外(既定状態・検索・企業・既読・人気順など、または不正な category キー)は「フィード」
 */
export function resolveFeedHeaderTitle(params: FeedHeaderParams): string {
  const rawCategory = params.category?.trim();
  if (rawCategory) {
    const parsed = articleCategorySchema.safeParse(rawCategory);
    if (parsed.success) return getCategoryDefinition(parsed.data).label;
    // 不正なカテゴリキーは「フィード」に丸める(他フィルタと同じ既定へのフォールバック方針)。
    return 'フィード';
  }

  // タグ絞り込み中は「#タグ名」(SNS のハッシュタグ表記)。category が有効ならそちらを優先する。
  const tag = params.tag?.trim();
  if (tag) return `#${tag}`;

  if (!hasOtherFilter(params) && params.sort?.trim() === 'latest') {
    return '新着';
  }

  return 'フィード';
}
