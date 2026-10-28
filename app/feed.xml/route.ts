import type { NextRequest } from 'next/server';
import { renderPublicFeed } from '../_feed/public-feed';

/**
 * 全企業の新着 RSS(?category= で職能カテゴリ、?tag= で AI要約タグに絞り込み)。ADR-0039。
 * 不正な category は renderPublicFeed 内で無視され、全体フィードになる。
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return renderPublicFeed({ category: params.get('category'), tag: params.get('tag') });
}
