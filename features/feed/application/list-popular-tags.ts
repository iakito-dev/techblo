import { ok, type Result } from '@/shared/result';
import type { ArticleRepository, PopularTag } from '../domain/article-repository';
import type { FeedError } from '../domain/errors';

export const ALL_TAGS_LIMIT = 120;
export const RECENT_TAGS_LIMIT = 40;
export const RECENT_TAGS_DAYS = 90;
// 全件走査の集計なので、呼び出し側の誤指定で巨大な結果を返さないための上限。
export const MAX_TAGS_LIMIT = 200;

/**
 * タグ一覧ページ用に、AI要約タグを記事数の多い順に集計して返すユースケース(ADR-0040)。
 * 空白だけのタグは Repository 実装に関わらず除外し、limit は 1..MAX_TAGS_LIMIT に丸める。
 * 除外で件数が減っても詰め直さない(集計側でも空白は除くため、実運用では誤差にならない)。
 */
export const listPopularTags =
  (deps: { articles: ArticleRepository }) =>
  async (limit = ALL_TAGS_LIMIT, sinceDays?: number): Promise<Result<PopularTag[], FeedError>> => {
    const clamped = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_TAGS_LIMIT);
    const rows = await deps.articles.listPopularTags(clamped, sinceDays);
    return ok(rows.filter((r) => r.tag.trim() !== ''));
  };
