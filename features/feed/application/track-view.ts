import { ok, type Result } from '@/shared/result';
import { asArticleId } from '@/shared/type-utils';
import type { ArticleRepository } from '../domain/article-repository';
import type { FeedError } from '../domain/errors';
import type { TrackViewCommand } from './dto';

/**
 * 記事の表示回数を加算するユースケース。
 * 将来 PostHog 送信や重複抑止ロジックを足すならここに集約する。
 */
export const trackView =
  (deps: { articles: ArticleRepository }) =>
  async (command: TrackViewCommand): Promise<Result<void, FeedError>> => {
    await deps.articles.incrementView(asArticleId(command.articleId));
    return ok(undefined);
  };
