# Backend Architecture

Next.js Server Actions と Route Handlers でバックエンドを構成。独立APIサーバーは持たない(ADR-0003)。

## 1. レイヤー構造(バックエンド側)

各 feature は4層(domain / application / infrastructure / web)に分割(ADR-0010)。依存方向は内向きのみで、`bun run depcruise` が強制する。

```
[Route Handler / features/X/web/actions.ts]  ← Web: 入口(認可・バリデーション・Server Action)
[features/X/web/queries.ts]                   ← Web: composition root(repo組立→usecase→Result吸収)
        ↓
[features/X/application/*.ts]                  ← Application: ユースケース(依存は引数注入)
[features/X/application/dto.ts]                ← Application: Command/Query/表示DTO
        ↓
[features/X/domain/*.ts]                       ← Domain: entity/VO/domain service/Repository interface(Driven Port)
        ↑ implements
[features/X/infrastructure/*.ts]               ← Infrastructure: Drizzle Repository 実装・mapper
        ↓
[db/client.ts, db/schema/*]                    ← Infrastructure: Drizzle(db を import可)
        ↓
[Supabase Postgres(postgres-js / pgbouncer)]
```

## 2. Server Actions の構造

`features/{name}/actions.ts` は以下のパターンに統一:

```ts
'use server';

import { z } from 'zod';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireSession } from '@/features/auth/server';
import { ok, err, type Result } from '@/shared/result';
import { trackEvent } from '@/lib/observability/posthog';
import { logger } from '@/lib/observability/logger';
import * as queries from './queries';
import * as policies from './policies';
import { addBookmarkInputSchema } from './types';

export async function addBookmark(
  raw: unknown
): Promise<Result<{ added: true }, ActionError>> {
  // 1. 認証
  const session = await requireSession();

  // 2. バリデーション
  const parsed = addBookmarkInputSchema.safeParse(raw);
  if (!parsed.success) {
    return err({ kind: 'VALIDATION', issues: parsed.error.issues });
  }

  // 3. 認可
  const allowed = await policies.canBookmark(session.user, parsed.data.articleId);
  if (!allowed) return err({ kind: 'FORBIDDEN' });

  // 4. 処理(冪等)
  const result = await queries.upsertBookmark({
    userId: session.user.id,
    articleId: parsed.data.articleId,
  });
  if (!result.ok) {
    logger.error('addBookmark failed', { error: result.error, userId: session.user.id });
    return err({ kind: 'INTERNAL' });
  }

  // 5. キャッシュ無効化
  revalidatePath('/bookmarks');

  // 6. 観測
  trackEvent('bookmark_added', { articleId: parsed.data.articleId });

  return ok({ added: true });
}
```

### Server Action 共通の責務

| 責務 | 実装場所 |
|---|---|
| 認証 | `requireSession()`(`features/*/web/actions.ts` 冒頭) |
| 入力バリデーション | Zod schema(`features/*/application/dto.ts`) |
| 認可・ビジネスロジック | `features/*/application` の usecase(ルールは `domain`) |
| DB アクセス | `features/*/infrastructure` の Repository(Driven Port の実装) |
| キャッシュ無効化 | `revalidatePath` / `revalidateTag`(`web/actions.ts`) |
| 観測 | `lib/observability/*` |

> 上記コード例は責務の流れを示すための簡略版。実際は `web/actions.ts`(Server Action)が `web/queries.ts` 同様に application の usecase を組立て、DB アクセスは infrastructure の Repository が担う。

## 3. Repository / Queries の構造

DB アクセスは `features/{name}/infrastructure` の Repository(domain の Driven Port 実装)が担う。`features/{name}/web/queries.ts` は composition root として repo を組み立て usecase を呼び、Result を吸収する。以下は infrastructure の Repository 実装イメージ(`db` を import してよい唯一の層):

```ts
import { db } from '@/db/client';
import { bookmarks, articles } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { ok, err, type Result } from '@/shared/result';
import type { Article } from '@/features/feed/types';

export async function listBookmarks(input: {
  userId: string;
  cursor?: string;
  limit?: number;
}): Promise<Result<Article[], string>> {
  try {
    const rows = await db
      .select({ /* explicit columns, ORM型を漏らさない */ })
      .from(bookmarks)
      .innerJoin(articles, eq(bookmarks.article_id, articles.id))
      .where(and(
        eq(bookmarks.user_id, input.userId),
        isNull(articles.deleted_at),
      ))
      .orderBy(desc(bookmarks.created_at))
      .limit(input.limit ?? 20);

    return ok(rows.map(toArticle));
  } catch (e) {
    return err((e as Error).message);
  }
}
```

### Repository / Queries の規約

- **戻り値は domain / application の型(ORM型を上層に漏らさない)**
- `select` で必要なカラムのみ取得(`SELECT *` 禁止)
- インデックスを使うWHERE句にする
- N+1 を避け、JOIN または `with` でリレーション解決
- ページネーション: フィードはオフセット `?page=N` + キャッシュ(ADR-0013、現規模で十分)。大規模化したら keyset を再検討
- try/catch でDBエラーを Result に詰める

## 4. DB アクセス層

### Drizzle スキーマ

```ts
// db/schema/bookmarks.ts
import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';
import { articles } from './articles';

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    article_id: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqUserArticle: uniqueIndex('bookmarks_user_article_uq').on(t.user_id, t.article_id),
  })
);

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, { fields: [bookmarks.user_id], references: [users.id] }),
  article: one(articles, { fields: [bookmarks.article_id], references: [articles.id] }),
}));
```

### マイグレーション

```bash
# スキーマを書いたら
bun drizzle-kit generate

# テスト用 DB(TEST_DATABASE_URL)で適用してテスト
bun drizzle-kit migrate

# 本番反映は CI 経由
```

**禁止**: マイグレーションSQLを手動編集(整合性が壊れる)

### トランザクション

複数テーブルにまたがる変更は必ずトランザクション:

```ts
await db.transaction(async (tx) => {
  await tx.insert(favorites).values({ ... });
  await tx.delete(bookmarks).where(...);
});
```

## 5. Route Handlers

Server Action で表現できないものを Route Handler に置く:

| パス | 用途 |
|---|---|
| `app/api/auth/[...all]/route.ts` | Better Auth ハンドラー |
| `app/api/og/[id]/route.ts` | OGP プレースホルダー画像生成(`ImageResponse`) |
| `app/api/trigger/route.ts` | Trigger.dev webhook |
| `app/api/healthz/route.ts` | ヘルスチェック |

```ts
// app/api/og/[id]/route.ts
import { ImageResponse } from 'next/og';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const article = await getArticleMeta(params.id);
  return new ImageResponse(
    <div style={{ background: article.brandColor }}>
      <h1>{article.title}</h1>
    </div>,
    { width: 1200, height: 630 }
  );
}
```

## 6. 認可(domain / application)

認可ルールは domain service の **真偽を返す純粋関数** として置き、application の usecase から呼ぶ(DB 参照が必要な場合は Repository を引数注入)。以下は判定関数のイメージ:

```ts
import type { User } from '@/features/auth/types';

export async function canBookmark(user: User, articleId: string): Promise<boolean> {
  // 例: ログイン済みであれば誰でもOK
  return !!user;
}

export async function canDeleteBookmark(
  user: User,
  bookmarkId: string,
): Promise<boolean> {
  // 自分のブックマークのみ削除可能
  const bookmark = await db.query.bookmarks.findFirst({
    where: eq(bookmarks.id, bookmarkId),
  });
  return bookmark?.user_id === user.id;
}
```

## 7. バックグラウンドジョブ(Trigger.dev v4)

```
jobs/
├── trigger.config.ts                  ← Trigger.dev 設定
├── fetch-all-feeds.ts                 ← 親ジョブ(毎時cron)
├── refresh-company-feed.ts            ← 子ジョブ(企業単位)
└── initialize-user-subscriptions.ts   ← 新規ユーザー初期化
```

### 親→子のfan-out

```ts
// jobs/fetch-all-feeds.ts
import { schedules } from '@trigger.dev/sdk';
import { refreshCompanyFeed } from './refresh-company-feed';

export const fetchAllFeeds = schedules.task({
  id: 'fetch-all-feeds',
  cron: '0 * * * *', // 毎時0分
  run: async () => {
    const companies = await db.select().from(companies).where(eq(companies.enabled, true));

    await refreshCompanyFeed.batchTrigger(
      companies.map((c) => ({ payload: { companyId: c.id } }))
    );
  },
});
```

```ts
// jobs/refresh-company-feed.ts
import { task, retry } from '@trigger.dev/sdk';
import { fetchRss } from '@/lib/rss/fetcher';
import { parseRss } from '@/lib/rss/parser';

export const refreshCompanyFeed = task({
  id: 'refresh-company-feed',
  retry: { maxAttempts: 3 },
  maxDuration: 60,
  run: async ({ companyId }: { companyId: string }) => {
    const company = await db.query.companies.findFirst({ where: eq(companies.id, companyId) });
    const xml = await fetchRss(company.rss_url);
    const articles = parseRss(xml);
    await upsertArticles(companyId, articles);
    await db.update(companies).set({ last_fetched_at: new Date() }).where(eq(companies.id, companyId));
  },
});
```

### ジョブの規約

- 並列度は最大20(Trigger.dev free tier 上限)
- `maxAttempts: 3` で再試行
- `maxDuration: 60` でタイムアウト保護
- 失敗は `companies.last_error` に記録
- 1企業の失敗が全体を止めない(`Promise.allSettled` 相当)

## 8. RSS パイプライン

```
[fetcher]   HTTP取得(retry, timeout, User-Agent)
    ↓
[parser]    XML→ Zod validate → ArticleInput[]
    ↓
[normalizer] 企業ごとの差異を吸収(features/{company}/adapter.ts)
    ↓
[ogp-extractor] descriptionに画像URLがなければHTMLから抽出
    ↓
[upserter]  db.insert(articles).onConflictDoUpdate(by url)
```

### lib/rss/

```
lib/rss/
├── fetcher.ts       ← HTTP取得(timeout, retry, User-Agent)
├── parser.ts        ← XML→ Zod
├── adapters/        ← 企業ごとの正規化
│   ├── lycorp.ts
│   ├── mercari.ts
│   └── ...
└── types.ts         ← ArticleInput schema
```

### Zod でパース時に検証

```ts
// lib/rss/types.ts
export const articleInputSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  description: z.string().optional(),
  published_at: z.coerce.date(),
  og_image: z.string().url().optional(),
});
```

## 9. 認証ミドルウェア

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  // 認証必須ルートのガード
  if (req.nextUrl.pathname.startsWith('/(auth)') && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## 10. レート制限

MVP範囲ではVercel Edgeのデフォルト制限に依存。

将来高負荷化したら以下を追加:
- Upstash Redis でユーザー単位のレート制限
- Vercel WAF ルールでスクレイパー対策
- `headers().get('x-forwarded-for')` で IP取得

## 11. 環境変数

```ts
// lib/env.ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    TRIGGER_SECRET_KEY: z.string(),
    SENTRY_DSN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
});
```

**禁止**: `process.env.X` を直接参照(必ず `env.X` 経由)

## 12. 観測

すべての Server Action と Job に以下を組み込む:

- 開始/終了ログ
- 重要な分岐の理由(why)
- 失敗時のSentry送信(context付き)
- ユーザー行動の PostHog イベント

詳細は [observability.md](./observability.md) を参照。

## 関連

- [frontend.md](./frontend.md)
- [shared.md](./shared.md)
- [data-flow.md](./data-flow.md)
- [docs/principles/data.md](../principles/data.md)
