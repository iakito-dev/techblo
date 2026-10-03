import { err, ok, type Result } from '@/shared/result';

/** 1URL を外部 fetch してよいか検証する関数(SSRF ガード)。ok なら正規化済み URL を返す。 */
export type UrlGuard = (url: string) => Promise<Result<string, string>>;

type FetchOptions = Omit<RequestInit, 'redirect'> & {
  timeoutMs?: number;
  retries?: number;
  /**
   * 指定時はリダイレクトを自動追従せず、初回 URL と各リダイレクト先をこのガードで検証してから辿る。
   * ユーザー入力 URL(マイフィード)で「公開ホスト → 302 → 内部 IP」の SSRF 迂回を防ぐため。
   */
  guardUrl?: UrlGuard;
};

/** guardUrl 指定時に辿るリダイレクトの上限。 */
const MAX_REDIRECTS = 5;

/**
 * 取得元に名乗る User-Agent。連絡先として本番ドメインを添える。
 * Trigger.dev(バッチ)でも同じ値になるよう環境変数に依存させない。
 */
const USER_AGENT = 'Techblo/1.0 (+https://techblo.dev)';

/**
 * Timeout + retry 付き fetch。
 * RSS取得や OGP取得など、不安定な外部リソースに対して使う。
 */
export async function safeFetch(
  url: string,
  options: FetchOptions = {},
): Promise<Result<Response, string>> {
  const { timeoutMs = 10_000, retries = 3, guardUrl, ...init } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const fetched = await fetchOnce(url, init, timeoutMs, guardUrl);
      if (!fetched.ok) return fetched;
      const res = fetched.value;

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

/**
 * 1回分の fetch。guardUrl が無ければ通常の自動追従、あれば手動で検証しながら辿る。
 * ガード拒否は err(リトライ対象外)、ネットワーク例外は throw(呼び出し側でリトライ)。
 */
async function fetchOnce(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  guardUrl: UrlGuard | undefined,
): Promise<Result<Response, string>> {
  const signal = AbortSignal.timeout(timeoutMs);
  const headers = {
    'User-Agent': USER_AGENT,
    ...init.headers,
  };
  if (!guardUrl) return ok(await fetch(url, { ...init, signal, headers }));

  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const safe = await guardUrl(current);
    if (!safe.ok) return err(safe.error);

    const res = await fetch(safe.value, { ...init, signal, headers, redirect: 'manual' });
    const location = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !location) return ok(res);

    await res.body?.cancel();
    current = new URL(location, safe.value).toString();
  }
  return err('リダイレクトが多すぎます');
}

/**
 * レスポンス本文を上限バイト数までテキストで読む。超えたら読み込みを打ち切って err を返す。
 * ユーザー登録 URL などが巨大な本文を返してもメモリを使い切らないようにするため。
 */
export async function readTextWithLimit(
  res: Response,
  maxBytes: number,
): Promise<Result<string, string>> {
  const tooLarge = `レスポンスが大きすぎます(上限 ${Math.floor(maxBytes / 1024 / 1024)}MB)`;
  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await res.body?.cancel();
    return err(tooLarge);
  }
  if (!res.body) return ok('');

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return err(tooLarge);
    }
    chunks.push(value);
  }

  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return ok(new TextDecoder().decode(buf));
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
