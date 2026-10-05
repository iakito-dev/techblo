import type { NextRequest } from 'next/server';
import { renderPublicFeed } from '../_feed/public-feed';

/**
 * 全企業の新着 RSS(?category= で職能カテゴリに絞り込み)。ADR-0039。
 * 不正な category は renderPublicFeed 内で無視され、全体フィードになる。
 */
export async function GET(request: NextRequest) {
  return renderPublicFeed({ category: request.nextUrl.searchParams.get('category') });
}
