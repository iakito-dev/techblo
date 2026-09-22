'use server';

import type { ArticleSummaryDto } from '@/features/ai-summary/application/dto';
import { getSummariesByArticleIds } from '@/features/ai-summary/web/queries';
import type { ArticleCard } from '@/features/feed/application/dto';
import { getArticlesByIds } from '@/features/feed/web/queries';

/**
 * ゲストの保存一覧表示用に、article ID 群から表示 DTO を取得する Server Action。
 * 記事は公開データなので ID から引ける。getArticlesByIds は削除済みを除外し入力順を保持するため、
 * これは「実在フィルタ」も兼ねる(localStorage に残った削除済み ID は結果から落ちる)。
 * feature 間 import を避けるため、feed の query 呼び出しはこの合成点(components/article)に置く。
 */
export async function getSavedArticles(ids: string[]): Promise<ArticleCard[]> {
  if (ids.length === 0) return [];
  return getArticlesByIds(ids);
}

/**
 * ゲストの保存一覧で AIタグ・要約を表示するため、article ID 群から要約を記事 ID 引きで取得する Server Action。
 * 要約取得はサーバー専用クエリ('use cache')なので、クライアントの GuestSavedArticles からはこの Action 経由で呼ぶ。
 */
export async function getSavedArticleSummaries(
  ids: string[],
): Promise<Record<string, ArticleSummaryDto>> {
  if (ids.length === 0) return {};
  return getSummariesByArticleIds(ids);
}
