# Shared Architecture

`shared/` と `lib/` に置く横断モジュール。**features 間の重複を避けつつ、過度な抽象化はしない**。

## 1. `shared/` と `lib/` の使い分け

| ディレクトリ | 内容 | 依存制限 |
|---|---|---|
| `shared/` | **純粋なロジック・型・ユーティリティ** | 外部ライブラリ依存ゼロ(Zodはオプション) |
| `lib/` | **外部サービスへのアダプター** | 各種SDK(Drizzle, Sentry, RSS等)を内包 |

判断基準:
- ブラウザでもサーバーでも動く + 副作用なし → `shared/`
- 外部I/O が絡む(HTTP/DB/file) → `lib/`

## 2. `shared/` の構成

```
shared/
├── result.ts              ← Result<T, E> 型と ok/err ヘルパー
├── error.ts               ← BaseError 階層
├── pagination.ts          ← Cursor based pagination 型
├── date.ts                ← 日付フォーマット(JSTタイムゾーン)
├── url.ts                 ← URL正規化、相対→絶対
├── string.ts              ← truncate, slugify
├── type-utils.ts          ← Branded types, etc.
└── constants.ts           ← UI定数(MAX_TITLE_LENGTH 等)
```

### `shared/result.ts`

```ts
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok;

// 複数の Result を AND 結合
export function combine<T, E>(rs: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const r of rs) {
    if (!r.ok) return r;
    values.push(r.value);
  }
  return ok(values);
}
```

### `shared/error.ts`

```ts
// ベースエラー型(各featureが拡張)
export type BaseError = {
  kind: string;
  message?: string;
};

export type ValidationError = BaseError & {
  kind: 'VALIDATION';
  issues: { path: string; message: string }[];
};

export type UnauthorizedError = BaseError & { kind: 'UNAUTHORIZED' };
export type ForbiddenError   = BaseError & { kind: 'FORBIDDEN' };
export type NotFoundError    = BaseError & { kind: 'NOT_FOUND' };
export type InternalError    = BaseError & { kind: 'INTERNAL'; cause?: unknown };

// 共通エラーを Result で扱う際の Union
export type CommonError =
  | ValidationError
  | UnauthorizedError
  | ForbiddenError
  | NotFoundError
  | InternalError;
```

### `shared/pagination.ts`

```ts
import { z } from 'zod';

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(50).default(20),
});

export type CursorPagination = z.infer<typeof cursorPaginationSchema>;

export type PaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

// cursor = base64(JSON.stringify({ id, createdAt }))
export function encodeCursor(payload: object): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}
export function decodeCursor<T>(cursor: string): T {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString());
}
```

### `shared/date.ts`

```ts
// すべてJSTで表現(UTCで保存 → 表示時にJSTに変換)
const JST = 'Asia/Tokyo';

export function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  return formatDate(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: JST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
```

### `shared/type-utils.ts`

```ts
// Branded types で「同じ string だが意味が違うID」を区別
export type Brand<T, B> = T & { __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type ArticleId = Brand<string, 'ArticleId'>;
export type CompanyId = Brand<string, 'CompanyId'>;

// 例: UserId と ArticleId を取り違えるとコンパイルエラー
function deleteArticle(id: ArticleId) { ... }
const userId = '...' as UserId;
deleteArticle(userId); // ❌ Type error

// nominal cast(意図的に変換するときだけ使う)
export const asUserId = (s: string): UserId => s as UserId;
```

### `shared/constants.ts`

```ts
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 500;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
export const FEED_CACHE_TTL_SEC = 60;
```

## 3. `lib/` の構成

```
lib/
├── auth.ts                ← Better Auth インスタンス
├── env.ts                 ← 環境変数(t3-env)
├── rss/
│   ├── fetcher.ts         ← HTTP取得
│   ├── parser.ts          ← XML→ Zod
│   ├── types.ts
│   └── adapters/
├── ogp/
│   └── extractor.ts       ← OGPメタ取得
├── ai/                    ← (将来)Vercel AI SDK ラッパー
│   ├── client.ts
│   └── prompts/
├── observability/
│   ├── sentry.ts
│   ├── posthog.ts
│   └── logger.ts          ← console をラップ(構造化ログ)
├── cache/
│   └── tags.ts            ← revalidateTag のキー定義
└── http/
    └── fetcher.ts         ← retry/timeout 付き fetch
```

### `lib/env.ts`

```ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: { /* ... */ },
  client: { /* ... */ },
  runtimeEnv: { /* ... */ },
});
```

### `lib/cache/tags.ts`

revalidateTag のキー文字列を1箇所に集約(タイポ防止):

```ts
export const CACHE_TAGS = {
  feed: 'feed',
  trending: 'trending',
  company: (id: string) => `company-${id}`,
  article: (id: string) => `article-${id}`,
} as const;

// 使う側
import { CACHE_TAGS } from '@/lib/cache/tags';
revalidateTag(CACHE_TAGS.feed);
```

### `lib/http/fetcher.ts`

外部HTTPリクエストの共通実装:

```ts
import { ok, err, type Result } from '@/shared/result';

export async function safeFetch(
  url: string,
  options?: RequestInit & { timeoutMs?: number; retries?: number }
): Promise<Result<Response, string>> {
  const { timeoutMs = 10_000, retries = 3, ...init } = options ?? {};

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'User-Agent': 'Techblo/1.0 (+https://techblo.dev)',
          ...init.headers,
        },
      });
      if (!res.ok) {
        if (i < retries && res.status >= 500) continue;
        return err(`HTTP ${res.status}`);
      }
      return ok(res);
    } catch (e) {
      if (i === retries) return err((e as Error).message);
    }
  }
  return err('unreachable');
}
```

### `lib/observability/logger.ts`

構造化ログ(本番では Vercel Logs が JSON で取得):

```ts
type LogContext = Record<string, unknown>;

const log = (level: string, msg: string, ctx?: LogContext) => {
  // 本番では JSON、開発では人間可読
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({ level, msg, ...ctx, ts: new Date().toISOString() }));
  } else {
    console.log(`[${level}] ${msg}`, ctx ?? '');
  }
};

export const logger = {
  info:  (msg: string, ctx?: LogContext) => log('info', msg, ctx),
  warn:  (msg: string, ctx?: LogContext) => log('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => log('error', msg, ctx),
};
```

## 4. `components/` の共通化

```
components/
├── ui/                    ← shadcn primitives(変更最小限)
├── layout/                ← Header, MobileNav, Sidebar
└── shared/                ← LoginModal, ErrorFallback, ThemeProvider
```

**禁止**:
- `components/{feature}/` のように feature 配下のコンポーネントを `components/` に置く
- feature 専用は `features/{name}/components/` のみ

## 5. 抽象化のタイミング

「3回出てきたら抽象化を検討」のルール(Rule of Three):

1. 1回目: 普通に書く
2. 2回目: 重複を許容、似ているがコピペで違いを実装
3. 3回目: 抽象化 → `shared/` か `lib/` か `components/shared/` に切り出す

抽象化の前に必ず確認:
- 本当に同じ概念か?(似てるけど違うかもしれない)
- 共通化することで個々の柔軟性が失われないか?
- 3つの呼び元それぞれが今後別方向に進化する可能性は?

## 6. テスト戦略(shared/lib)

- `shared/*` は全関数に Vitest unit test を書く(純粋なので書きやすい)
- `lib/rss/parser.ts` 等のパーサーは実際のRSS XMLでフィクスチャテスト
- `lib/http/fetcher.ts` は MSW でモック
- `lib/observability/*` は最低限の動作確認のみ

## 7. 禁止事項リスト

| 禁止 | 理由 |
|---|---|
| `shared/` から `features/` を import | 依存方向違反 |
| `shared/` から `db/`, `lib/` を import | shared は pure |
| `lib/` 同士の循環import | 構造異常 |
| `shared/` に React コンポーネント | UI は `components/` |
| `lib/` の関数を直接 RSC が import(features 経由を推奨) | レイヤー境界 |

## 関連

- [frontend.md](./frontend.md)
- [backend.md](./backend.md)
- [docs/principles/code.md](../principles/code.md)
