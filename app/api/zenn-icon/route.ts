import { logger } from '@/lib/observability/logger';

/**
 * Zenn publication の登録アイコンへリダイレクトするエンドポイント。
 *
 * 企業ファビコンは通常 Google favicon サービスでドメインから引く(components/ui/company-favicon.tsx)が、
 * Zenn publication は全社 `zenn.dev` ドメインのため共通の Zenn ロゴになってしまう。publication 固有のアバターは
 * 非公式 API `https://zenn.dev/api/publications/{slug}` の avatar_url にあるが、この API は CORS 非対応で
 * ブラウザから直接叩けない。そこでサーバー側で取得し、実体画像(res.cloudinary.com)へ 307 リダイレクトする。
 *
 * 取得失敗・未登録時は 404 を返し、呼び出し側 <img> の onError で頭文字フォールバックに落とす。
 */

const SLUG_RE = /^[a-zA-Z0-9_-]{1,64}$/;

type ZennPublication = {
  avatar_url?: string;
  avatar_small_url?: string;
  avatar_registered?: boolean;
};

export async function GET(req: Request): Promise<Response> {
  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  if (!SLUG_RE.test(slug)) {
    return new Response('Bad Request', { status: 400 });
  }

  try {
    const res = await fetch(`https://zenn.dev/api/publications/${slug}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
      // 外部 API 呼び出しを 1 日キャッシュ(アバターはほぼ不変)
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return new Response('Not Found', { status: 404 });
    }

    const data = (await res.json()) as { publication?: ZennPublication };
    const pub = data.publication;
    const avatar = pub?.avatar_small_url ?? pub?.avatar_url;
    if (!pub?.avatar_registered || !avatar) {
      // 独自アバター未登録(= Zenn 既定プレースホルダ)は頭文字フォールバックに任せる
      return new Response('Not Found', { status: 404 });
    }

    return new Response(null, {
      status: 307,
      headers: {
        Location: avatar,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (e) {
    logger.warn('zenn-icon: アバター取得失敗', {
      slug,
      error: e instanceof Error ? e.message : String(e),
    });
    return new Response('Not Found', { status: 404 });
  }
}
