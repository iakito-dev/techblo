import { safeFetch } from '@/lib/http/fetcher';
import { err, ok, type Result } from '@/shared/result';

/** はてなブックマーク件数取得APIの一括エンドポイント(認証不要・公開API)。 */
const BULK_ENDPOINT = 'https://bookmark.hatenaapis.com/count/entries';

/** 1リクエストで問い合わせできる URL の上限(API 仕様)。 */
const MAX_URLS_PER_REQUEST = 50;

/** 配列を size 件ずつのチャンクに分割する。 */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function buildUrl(urls: string[]): string {
  const params = new URLSearchParams();
  for (const u of urls) params.append('url', u);
  return `${BULK_ENDPOINT}?${params.toString()}`;
}

/**
 * 複数 URL のはてなブックマーク数をまとめて取得する(外部クライアント / lib 層)。
 * 50件ずつバッチで一括APIを叩き、url→count の Map に集約する。throw せず Result を返す。
 *
 * - レスポンスに含まれない URL(=ブックマーク0)は Map に載らない。呼び出し側で 0 扱いにすること。
 * - 一部バッチが失敗しても成功分は返す。全バッチ失敗時のみ err。
 */
export async function fetchBookmarkCounts(
  urls: string[],
): Promise<Result<Map<string, number>, string>> {
  const counts = new Map<string, number>();
  if (urls.length === 0) return ok(counts);

  const batches = chunk(urls, MAX_URLS_PER_REQUEST);
  let firstError: string | null = null;

  for (const batch of batches) {
    const res = await safeFetch(buildUrl(batch), {
      timeoutMs: 10_000,
      retries: 2,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      firstError ??= res.error;
      continue;
    }
    try {
      const json = (await res.value.json()) as Record<string, number | null>;
      for (const [url, count] of Object.entries(json)) {
        if (typeof count === 'number') counts.set(url, count);
      }
    } catch (e) {
      firstError ??= e instanceof Error ? e.message : String(e);
    }
  }

  if (counts.size === 0 && firstError) return err(firstError);
  return ok(counts);
}
