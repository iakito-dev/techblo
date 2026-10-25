'use server';

import { type ComposedArticle, type FeedPageInput, getFeedPageData } from './feed-load-more';

/**
 * 「もっと読む」用の Server Action。次ページの表示データと継続有無を返す。
 * 返り値はシリアライズ可能なデータのみ(描画はクライアントの FeedList が行う)。
 */
export async function loadMoreFeed(
  input: FeedPageInput,
): Promise<{ items: ComposedArticle[]; hasMore: boolean }> {
  const { items, hasMore } = await getFeedPageData(input);
  return { items, hasMore };
}
