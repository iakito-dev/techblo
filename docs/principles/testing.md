# テスト戦略

## 1. テストピラミッド

```
        ┌──┐         E2E (Playwright)         ← 少数、重要シナリオのみ
       ┌────┐
      ┌──────┐      Integration (Vitest+DB)   ← Server Actions、queries
     ┌────────┐
    ┌──────────┐    Unit (Vitest)             ← shared/, lib/, policies
```

- **Unit** が一番多い(80%)
- **Integration** は重要な書き込み系のみ(15%)
- **E2E** はクリティカルパスのみ(5%)

## 2. 何をテストするか

### 必ずテストする

| 対象 | 種別 | 例 |
|---|---|---|
| `shared/*.ts` の純粋関数 | Unit | `Result.combine`, `encodeCursor` |
| `lib/rss/parser.ts` 等のパーサー | Unit + fixture | 各社のRSS XMLでparse確認 |
| `features/*/policies.ts` | Unit | `canBookmark`, `canDeleteBookmark` |
| `features/*/actions.ts` | Integration | テスト用 DB(`TEST_DATABASE_URL`)で実際にDB操作 |
| 認証フロー | E2E | 未ログイン→ログイン→アクション |
| ブックマーク追加 | E2E | クリック→追加→一覧で確認 |

### テストしない

- shadcn/ui のコンポーネント(ライブラリ側で担保)
- 型定義のみのファイル
- 設定ファイル
- ドキュメント

## 3. ツールと配置

```
features/feed/
├── queries.ts
├── queries.test.ts          ← 隣に配置
├── policies.ts
└── policies.test.ts

lib/rss/
├── parser.ts
├── parser.test.ts
└── fixtures/                ← テストデータ
    ├── mercari.xml
    └── lycorp.xml

e2e/                         ← E2Eだけは独立フォルダ
├── auth.spec.ts
├── bookmark.spec.ts
└── feed.spec.ts
```

**禁止**: `__tests__/` フォルダ(実装の隣に置く方が見通しが良い)

## 4. Unit テスト

### Vitest 設定

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      exclude: ['**/node_modules/**', '**/*.config.*', '**/*.d.ts'],
    },
  },
});
```

### 書き方

```ts
import { describe, it, expect } from 'vitest';
import { canBookmark } from './policies';

describe('canBookmark', () => {
  it('allows logged-in user', async () => {
    const result = await canBookmark({ id: 'user-1' }, 'article-1');
    expect(result).toBe(true);
  });

  it('rejects null user', async () => {
    const result = await canBookmark(null, 'article-1');
    expect(result).toBe(false);
  });
});
```

## 5. Integration テスト

### テスト用 DB(TEST_DATABASE_URL)で実行

Neon 時代の per-PR DB branching は廃止した(ADR-0033)。統合テストは本番とは別に用意した
Supabase のテスト用 DB(`TEST_DATABASE_URL`)に対して実行する。

```ts
// vitest.integration.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup-db.ts'],
    pool: 'forks', // DB connection の隔離
  },
});
```

```ts
// tests/setup-db.ts
import { beforeAll } from 'vitest';

beforeAll(async () => {
  // 本番とは別のテスト用 DB を指す(CI では secret から注入)
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  // migration を適用
  await runMigrations();
});
```

### 書き方

```ts
import { describe, it, expect } from 'vitest';
import { addBookmark } from '@/features/bookmarks/actions';
import { createTestUser, createTestArticle } from '@/tests/factories';

describe('addBookmark', () => {
  it('inserts bookmark and is idempotent', async () => {
    const user = await createTestUser();
    const article = await createTestArticle();

    const r1 = await addBookmark({ articleId: article.id }, { user });
    expect(r1.ok).toBe(true);

    const r2 = await addBookmark({ articleId: article.id }, { user });
    expect(r2.ok).toBe(true); // 重複でもエラーにならない
  });
});
```

## 6. E2E テスト

### Playwright 設定

```ts
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
```

### 書き方

```ts
import { test, expect } from '@playwright/test';

test('user can bookmark an article', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'ログイン' }).click();
  // ... OAuth は stub or test account
  await page.getByRole('button', { name: 'ブックマーク' }).first().click();
  await page.goto('/bookmarks');
  await expect(page.getByText('保存済み')).toBeVisible();
});
```

### E2E の対象

- ログインフロー
- ブックマーク追加 → 一覧表示
- お気に入り追加 → 一覧表示
- 購読企業のON/OFF
- モバイル下部ナビ遷移

## 7. テストの実行

```jsonc
// package.json (抜粋)
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:watch": "vitest"
  }
}
```

## 8. CI でのテスト

- PR時: unit + integration を必ず実行
- main mergeに E2E を追加実行
- E2E はPRでも実行したいがテスト用 DB の準備とCI時間との兼ね合い

## 9. テスト用の Factory

```ts
// tests/factories.ts
import { db } from '@/db/client';
import { users, articles, companies } from '@/db/schema';

export async function createTestUser(overrides?: Partial<User>) {
  const [user] = await db.insert(users).values({
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    ...overrides,
  }).returning();
  return user;
}

export async function createTestArticle(overrides?: Partial<Article>) {
  const company = await createTestCompany();
  const [article] = await db.insert(articles).values({
    company_id: company.id,
    url: `https://example.com/${Date.now()}`,
    title: 'Test Article',
    ...overrides,
  }).returning();
  return article;
}
```

## 10. Snapshot テスト

UIの回帰は **Storybook + Chromatic**(将来):
- MVPでは不採用(コストとメンテ)
- 安定後に主要コンポーネントだけ導入

## 11. AI機能のEval(将来)

- `docs/guides/ai-engineering.md` の eval セクション参照
- PromptFoo で品質回帰チェック
- 通常のテストとは別枠で実行

## 12. テストカバレッジ目標

| レイヤー | 目標 |
|---|---|
| `shared/` | 90%+ |
| `lib/` | 70%+ |
| `features/*/policies.ts` | 90%+ |
| `features/*/queries.ts` | 60%+(integration) |
| `features/*/actions.ts` | 60%+(integration) |
| `app/` | 0%(E2Eで担保) |

カバレッジは **目安**。100%を目指さない。
