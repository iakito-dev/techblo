import { safeFetch } from '@/lib/http/fetcher';
import { err, ok, type Result } from '@/shared/result';

/**
 * RSS/Atom フィードのXMLを取得する。
 * timeout/retry は safeFetch に委譲。
 */
export async function fetchFeed(url: string): Promise<Result<string, string>> {
  const res = await safeFetch(url, {
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
