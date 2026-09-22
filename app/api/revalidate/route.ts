import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { CACHE_TAGS } from '@/lib/cache/tags';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';

const revalidateRequestSchema = z
  .object({
    articleIds: z.array(z.string().min(1)).max(100).optional(),
  })
  .optional();

/**
 * フィードキャッシュの on-demand 無効化エンドポイント。
 *
 * 記事取込は trigger.dev の cron(trigger/fetch-feed-articles.ts)で行うが、これは Next ランタイム外で
 * 動くため revalidateTag を直接呼べない。そこで取込後に cron がこの route を叩き、Next ランタイム内で
 * CACHE_TAGS.feed を無効化する。これにより getFeed の cacheLife を長め('days')にしても、新着は即反映される。
 *
 * 保護: REVALIDATE_SECRET を Bearer トークンで突き合わせる。未設定環境(ローカル等)では常に 401 にして無効化。
 */
export async function POST(req: Request): Promise<Response> {
  const secret = env.REVALIDATE_SECRET;
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!secret || token !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await parseBody(req);

  // cacheComponents 下では route handler から revalidateTag(tag, profile) を使う
  // (updateTag は Server Action 専用)。'max' で即時無効化する。
  revalidateTag(CACHE_TAGS.feed, 'max');
  for (const articleId of body?.articleIds ?? []) {
    revalidateTag(CACHE_TAGS.article(articleId), 'max');
  }
  logger.info('revalidate: feed キャッシュを無効化');
  return Response.json({ revalidated: true });
}

async function parseBody(req: Request): Promise<z.infer<typeof revalidateRequestSchema>> {
  const contentType = req.headers.get('content-type');
  if (!contentType?.includes('application/json')) return undefined;

  const raw: unknown = await req.json().catch(() => undefined);
  const parsed = revalidateRequestSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}
