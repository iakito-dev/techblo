import { articleCategorySchema } from '@/shared/categories';
import { ok, type Result } from '@/shared/result';
import { asCompanyId, asUserId } from '@/shared/type-utils';
import type { ArticleRepository } from '../domain/article-repository';
import type { FeedError } from '../domain/errors';
import { DEFAULT_PERIOD, DEFAULT_SORT } from '../domain/feed-sort';
import { type ArticleCard, type FeedPage, type ListFeedInput, toArticleCard } from './dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
// 検索語の長さ上限。trgm インデックスが効かない巨大パターンの DoS を防ぐ。
const MAX_QUERY_LENGTH = 100;

const clamp = (n: number, min: number, max: number): number => Math.min(Math.max(n, min), max);

/**
 * 公開フィードの記事を取得するユースケース(オフセットページネーション)。
 * 依存(Repository)は引数注入。これにより DB なしで単体テスト可能。
 *
 * total を数えて総ページ数を算出し、?page=N(1 始まり)を範囲内に丸める。
 * ビジネスルール: docs/features/feed.md
 */
export const listFeed =
  (deps: { articles: ArticleRepository }) =>
  async (input: ListFeedInput): Promise<Result<FeedPage, FeedError>> => {
    const sort = input.sort ?? DEFAULT_SORT;
    // period は「公開日のウィンドウ」フィルタ。sort とは直交させ、新着順でも適用する
    // (sort は並び順のみを決める。period を固定したまま sort を切り替えても件数は不変)。
    // 'all' は全期間=ウィンドウ無しなので Repository 側で WHERE を付けない。
    const period = input.period ?? DEFAULT_PERIOD;
    const limit = clamp(Math.floor(input.limit ?? DEFAULT_LIMIT), 1, MAX_LIMIT);
    const companyIds = input.companyIds?.map(asCompanyId);
    const readFilter = input.readFilter
      ? { userId: asUserId(input.readFilter.userId), mode: input.readFilter.mode }
      : undefined;
    const page = Math.max(1, Math.floor(input.page ?? 1));
    // 空白のみは「検索なし」に正規化(ListCriteria.query は trim 済み・非空の契約)
    const query = input.query?.trim().slice(0, MAX_QUERY_LENGTH) || undefined;
    // タグも空白のみは「絞り込みなし」に正規化(canonical なキュレーション値なので trim のみ)
    const tag = input.tag?.trim() || undefined;
    // カテゴリは enum 検証。不正なキー(URL 手打ち等)は絞り込みなし扱いで無視する(ADR-0034)。
    const categoryResult = input.category ? articleCategorySchema.safeParse(input.category) : null;
    const category = categoryResult?.success ? categoryResult.data : undefined;

    // 総件数は数えず、limit+1 件取得して「余り」の有無で次ページの有無を判定する。
    // count(*) クエリを廃し、無限スクロール(もっと読む)に必要十分な hasMore だけを返す(ADR-0013 追補)。
    // マージは新着順・フィルタ/検索なしの主経路のみ(ADR-0014)。タグ/カテゴリ絞り込みは公開記事のみ対象なので除外する。
    const mergeable = sort !== 'popular' && !readFilter && !query && !tag && !category;
    const userFeedIds = mergeable ? input.userFeedIds : undefined;
    // マージ経路でのみ公開側の有無を反映(?feed のみのフィルタは includePublicArticles=false)。
    const includePublicArticles = mergeable ? input.includePublicArticles : undefined;

    const rows = await deps.articles.list({
      sort,
      period,
      offset: (page - 1) * limit,
      limit: limit + 1,
      companyIds,
      readFilter,
      query,
      tag,
      category,
      userFeedIds,
      includePublicArticles,
    });

    const hasMore = rows.length > limit;
    const items: ArticleCard[] = rows.slice(0, limit).map(toArticleCard);

    return ok({ items, page, hasMore });
  };
