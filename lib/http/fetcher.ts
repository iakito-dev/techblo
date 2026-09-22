import { err, ok, type Result } from '@/shared/result';

type FetchOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
};

/**
 * Timeout + retry 付き fetch。
 * RSS取得や OGP取得など、不安定な外部リソースに対して使う。
 */
export async function safeFetch(
  url: string,
  options: FetchOptions = {},
): Promise<Result<Response, string>> {
  const { timeoutMs = 10_000, retries = 3, ...init } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'User-Agent': 'Techblo/1.0 (+https://techblo.example)',
          ...init.headers,
        },
      });

      if (!res.ok) {
        // 5xx だけリトライ、4xx は即返す
        if (attempt < retries && res.status >= 500) {
          await wait(2 ** attempt * 1000);
          continue;
        }
        return err(`HTTP ${res.status}`);
      }

      return ok(res);
    } catch (e) {
      if (attempt === retries) {
        return err(e instanceof Error ? e.message : String(e));
      }
      await wait(2 ** attempt * 1000);
    }
  }

  return err('unreachable');
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
