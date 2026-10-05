import { connection } from 'next/server';
import { getHealthStatus } from '@/features/health/web/queries';

export async function GET(): Promise<Response> {
  // cacheComponents 下では `dynamic = 'force-dynamic'` が使えない。リクエストを読まない GET は
  // ビルド時にプリレンダされ得るので、connection() で毎リクエストの実行に固定する。
  await connection();
  const body = await getHealthStatus();

  return Response.json(body, {
    status: body.ok ? 200 : 503,
    headers: {
      'cache-control': 'no-store',
    },
  });
}
