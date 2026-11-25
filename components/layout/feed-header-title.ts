import { getCategoryDefinition, isArticleCategory } from '@/shared/categories';

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

const READ_TITLES: Record<string, string | undefined> = {
  unread: '未読の記事',
  read: '既読の記事',
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
 * - ?q= があれば「検索結果」
 * - ?company= が 1 社だけで、呼び出し側がその企業名を解決できていれば企業名
 * - ?read=unread / ?read=read なら「未読の記事」/「既読の記事」(マイフィード ?feed= で絞っているときは除く)
 * - sort=popular のみ(期間の指定は可)なら「人気の記事」
 * - それ以外(既定状態・企業名を解決できない企業・マイフィードなど、または不正な category キー)は「フィード」
 */
export function resolveFeedHeaderTitle(
  params: FeedHeaderParams,
  options: { companyName?: string } = {},
): string {
  const rawCategory = params.category?.trim();
  if (rawCategory) {
    if (isArticleCategory(rawCategory)) return getCategoryDefinition(rawCategory).label;
    // 不正なカテゴリキーは「フィード」に丸める(他フィルタと同じ既定へのフォールバック方針)。
    return 'フィード';
  }

  // タグ絞り込み中は「#タグ名」(SNS のハッシュタグ表記)。category が有効ならそちらを優先する。
  const tag = params.tag?.trim();
  if (tag) return `#${tag}`;

  // 検索中は「検索結果」(タブタイトル feedPageTitle と揃える。検索語は検索ボックスに出ているので省く)。
  if (nonEmpty(params.q)) return '検索結果';

  // 企業で絞った一覧は企業名(企業ページ廃止後はここが企業別の一覧の入口。ADR-0048)。
  // slug しか URL に無いため、名前は呼び出し側がサーバーで引いて渡す。
  const companyName = options.companyName?.trim();
  if (companyName) return companyName;

  // 未読/既読で絞った一覧。サイドバーで選んだ状態と見出しが食い違わないようにする
  // (以前は「フィード」のままで、全件を見ているのか未読だけなのか見出しから分からなかった)。
  // 値の解釈は parseReadMode と同じく 'unread' / 'read' 以外は無視する。
  const readMode = READ_TITLES[params.read?.trim() ?? ''];
  if (readMode && !nonEmpty(params.feed)) return readMode;

  if (!hasOtherFilter(params) && params.sort?.trim() === 'latest') {
    return '新着';
  }

  // 人気順(企業・期間以外の絞り込みなし)はタブタイトルと同じ「人気の記事」。
  if (
    params.sort?.trim() === 'popular' &&
    !nonEmpty(params.company) &&
    !nonEmpty(params.feed) &&
    !nonEmpty(params.read)
  ) {
    return '人気の記事';
  }

  return 'フィード';
}
