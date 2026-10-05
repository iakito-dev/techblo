import { getSummariesByArticleIds } from '@/features/ai-summary/web/queries';
import { getFeed } from '@/features/feed/web/queries';
import { logger } from '@/lib/observability/logger';
import { buildFeedXml, type RssFeedItem } from '@/lib/rss/build-feed-xml';
import { resolveBaseUrl } from '@/lib/site-url';
import { articleCategorySchema, CATEGORY_DEFINITIONS } from '@/shared/categories';

/**
 * 公開 RSS フィードの合成点(app 層)。
 * feed feature は ai-summary を import できないため、記事 + AI要約の合成はここで行う
 * (カードが overview ?? description を出すのと同じ規則。ADR-0013 と同方針)。
 */

const FEED_LIMIT = 50;

// CDN で 10 分共有し、その後 1 時間は古い版を返しつつ裏で再生成する。
// 取込 cron の頻度(時間単位)に対して RSS リーダーのポーリング負荷を吸収できる程度の鮮度。
const CACHE_CONTROL = 'public, s-maxage=600, stale-while-revalidate=3600';

export type PublicFeedScope = {
  /** 企業フィード時のみ。id は companyIds 絞り込みに使う。 */
  company?: { id: string; slug: string; name: string };
  /** 未検証の生キー。不正なら無視して全体フィードにする(listFeed と同じ挙動)。 */
  category?: string | null;
};

export function xmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': CACHE_CONTROL,
    },
  });
}

export async function renderPublicFeed(scope: PublicFeedScope): Promise<Response> {
  try {
    const baseUrl = resolveBaseUrl();
    const parsedCategory = scope.category ? articleCategorySchema.safeParse(scope.category) : null;
    const category = parsedCategory?.success ? parsedCategory.data : undefined;

    const page = await getFeed({
      sort: 'latest',
      limit: FEED_LIMIT,
      companyIds: scope.company ? [scope.company.id] : undefined,
      category,
    });
    const summaries = await getSummariesByArticleIds(page.items.map((a) => a.id));

    const items: RssFeedItem[] = page.items.map((a) => {
      const summary = summaries[a.id];
      return {
        title: a.title,
        link: a.url,
        guid: `${baseUrl}/a/${a.id}`,
        description: summary?.overview ?? a.description,
        publishedAt: a.publishedAt,
        companyName: a.company.name,
        sourceUrl: `${baseUrl}/companies/${a.company.slug}/feed.xml`,
        categories: summary?.tags ?? [],
      };
    });

    const categoryLabel = category
      ? CATEGORY_DEFINITIONS.find((d) => d.key === category)?.label
      : undefined;
    const selfUrl = scope.company
      ? `${baseUrl}/companies/${scope.company.slug}/feed.xml`
      : `${baseUrl}/feed.xml${category ? `?category=${category}` : ''}`;
    const title = scope.company
      ? `${scope.company.name}の技術ブログ新着｜テクブロ`
      : `${categoryLabel ? `${categoryLabel}の` : ''}技術ブログ新着｜テクブロ`;

    const xml = buildFeedXml({
      title,
      link: scope.company ? `${baseUrl}/companies/${scope.company.slug}` : `${baseUrl}/`,
      description: scope.company
        ? `${scope.company.name}の公式技術ブログの新着記事(元記事へのリンク)。`
        : 'テック企業の公式技術ブログの新着記事を集約したフィード(元記事へのリンク)。',
      selfUrl,
      language: 'ja',
      lastBuildDate: items[0]?.publishedAt ?? new Date(0),
      items,
    });
    return xmlResponse(xml);
  } catch (error) {
    logger.error('public rss feed failed', { error, scope });
    return new Response('Internal Server Error', { status: 500 });
  }
}
