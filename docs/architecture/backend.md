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
| `app/api/og/[id]/route.tsx` | 記事の共有用 OG 画像生成(`ImageResponse` / ADR-0029) |
| `app/api/revalidate/route.ts` | cron からのキャッシュ無効化(`REVALIDATE_SECRET` で保護) |
| `app/api/healthz/route.ts` | ヘルスチェック |
| `app/api/zenn-icon/route.ts` | Zenn のアイコン取得 |
| `app/feed.xml/route.ts`, `app/companies/[slug]/feed.xml/route.ts` | 公開 RSS(ADR-0039) |

```ts
// app/api/og/[id]/route.tsx(イメージ)
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

タスクは `trigger/` に置き、設定はルートの `trigger.config.ts`。各タスクはバッチの composition root で、
feature の Repository / usecase を組み立てて呼ぶ。

| タスク | cron | 内容 |
|---|---|---|
| `trigger/fetch-feed-articles.ts` | 毎時0分 | 全企業の RSS 取込 → はてブ数更新 → `/api/revalidate` |
| `trigger/generate-article-summaries.ts` | 毎時10分 | 未要約記事の AI 要約生成(ADR-0026) |
| `trigger/fetch-user-feeds.ts` | 毎時15分 | ユーザー登録 RSS の取込(ADR-0014) |
| `trigger/classify-article-categories.ts` | 毎時40分 | 記事カテゴリの AI 分類(ADR-0034) |

```ts
// trigger/fetch-feed-articles.ts(抜粋)
export const fetchFeedArticles = schedules.task({
  id: 'fetch-feed-articles',
  cron: '0 * * * *',
  maxDuration: 300,
  run: async () => {
    const repo = new DrizzleArticleRepository(db);
    const sink = upsertArticles({ articles: repo });
    const results = await ingestAllCompanies(sink);
    // ...
  },
});
```

### ジョブの規約

- 企業ごとの取込は `lib/rss/ingest.ts` が `Promise.allSettled` で並列実行し、1社の失敗が全体を止めない
- HTTP の timeout / retry は `lib/http/fetcher.ts` の `safeFetch` に任せる
- 失敗は companies(`last_error_at` / `consecutive_failures`)に記録し、次の cron で再試行
- cron は Next ランタイム外で動くので、`lib/env`(t3-env)ではなく必要な `process.env` だけを読む
- LLM を呼ぶタスクは RSS 取込と別 cron にして、LLM 側の失敗や遅延が新着取込を止めないようにする

## 8. RSS パイプライン

```
[lib/rss/fetcher.ts]  HTTP取得(lib/http の safeFetch: timeout 15秒, retry, SSRF ガード)
    ↓
[lib/rss/parser.ts]   RSS / Atom → Zod validate → ArticleInput[](フィードごとのタイムゾーン補正 / ADR-0025)
    ↓
[lib/rss/ingest.ts]   sink(呼び出し元から注入)で保存し、companies の成功/失敗を記録
    ↓
[features/feed/application/upsert-articles] → DrizzleArticleRepository(url で upsert)
```

企業ごとの adapter は持たず、差異はパーサの汎用処理とフィード単位の設定(`companies.feed_timezone` 等)で吸収する。

### Zod でパース時に検証

```ts
// lib/rss/types.ts
export const articleInputSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(500),
  description: z.string().max(ARTICLE_DESCRIPTION_MAX_LENGTH).nullable(),
  ogImage: z.string().url().nullable(),
  author: z.string().max(200).nullable(),
  publishedAt: z.date(),
});
```

## 9. 認証ガード

middleware(`middleware.ts` / `proxy.ts`)は置いていない。アプリ画面はゲストでも開け、保存などはゲストなら
localStorage に持ってログイン時にマージする(ADR-0017)。認証が要る処理は RSC / Server Action の中で
`features/auth/server.ts` の `getSession()` を呼んで判定する。

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
- 失敗時は `logger.error` に context 付きで出す(Sentry は未導入)
- ユーザー行動の PostHog イベント

詳細は [observability.md](./observability.md) を参照。

## 関連

- [frontend.md](./frontend.md)
- [shared.md](./shared.md)
- [data-flow.md](./data-flow.md)
- [docs/principles/data.md](../principles/data.md)
