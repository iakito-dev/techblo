import { getCompanyBySlug } from '@/features/feed/web/queries';
import { logger } from '@/lib/observability/logger';
import { renderPublicFeed } from '../../../_feed/public-feed';

/** 企業ごとの新着 RSS。存在しない slug は 404。ADR-0039。 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let company: Awaited<ReturnType<typeof getCompanyBySlug>>;
  try {
    company = await getCompanyBySlug(slug);
  } catch (error) {
    logger.error('public rss feed company lookup failed', { error, slug });
    return new Response('Internal Server Error', { status: 500 });
  }
  if (!company) return new Response('Not Found', { status: 404 });

  return renderPublicFeed({ company: { id: company.id, slug: company.slug, name: company.name } });
}
