import { safeFetch, type UrlGuard } from '@/lib/http/fetcher';
import { err, ok, type Result } from '@/shared/result';

/**
 * RSS/Atom フィードのXMLを取得する。
 * timeout/retry は safeFetch に委譲。
 * ユーザー入力 URL の場合は guardUrl を渡し、リダイレクト先まで SSRF 検証させる。
 */
export async function fetchFeed(
  url: string,
  options: { guardUrl?: UrlGuard } = {},
): Promise<Result<string, string>> {
  const res = await safeFetch(url, {
    guardUrl: options.guardUrl,
    timeoutMs: 15_000,
    retries: 3,
    headers: {
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
    },
  });
  if (!res.ok) return err(res.error);

  try {
    const xml = await res.value.text();
    if (!xml.trim()) return err('empty response body');
    return ok(xml);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
