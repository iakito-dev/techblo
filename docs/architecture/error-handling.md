# Error Handling

エラーは throw せず **Result型** で表現する。例外はerror boundaryでのみ捕捉。

## 1. エラーの分類

| 種別 | 例 | 表現 |
|---|---|---|
| **ユーザー入力エラー** | Zod parse失敗 | `{ kind: 'VALIDATION', issues }` |
| **認証エラー** | 未ログイン | `{ kind: 'UNAUTHORIZED' }` |
| **認可エラー** | 他人のブックマーク削除 | `{ kind: 'FORBIDDEN' }` |
| **NotFound** | 存在しないID | `{ kind: 'NOT_FOUND' }` |
| **競合** | 重複INSERT | upsertで吸収、エラーにしない |
| **外部サービス失敗** | RSS取得タイムアウト | `{ kind: 'EXTERNAL', service }` |
| **内部エラー** | 想定外のDBエラー | `{ kind: 'INTERNAL', cause }` |
| **致命的エラー** | env変数欠落 | throw → error boundary |

## 2. Server Action のエラーレスポンス

```ts
type ActionError =
  | { kind: 'VALIDATION'; issues: ZodIssue[] }
  | { kind: 'UNAUTHORIZED' }
  | { kind: 'FORBIDDEN' }
  | { kind: 'NOT_FOUND' }
  | { kind: 'INTERNAL' };

export async function addBookmark(raw: unknown): Promise<Result<{ added: true }, ActionError>> {
  const session = await requireSession();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return err({ kind: 'VALIDATION', issues: parsed.error.issues });
  // ...
}
```

## 3. UI でのエラー表現

| エラー種別 | UI表現 |
|---|---|
| VALIDATION | フォーム下に項目別エラー表示 |
| UNAUTHORIZED | LoginModal を開く |
| FORBIDDEN | sonner toast(「権限がありません」) |
| NOT_FOUND | 404 ページ |
| EXTERNAL | sonner toast(「一時的なエラーです、再試行してください」) |
| INTERNAL | sonner toast + error boundary |

```tsx
'use client';
import { toast } from 'sonner';
import { useActionState } from 'react';
import { addBookmark } from '@/features/bookmarks/actions';

const handleError = (error: ActionError) => {
  switch (error.kind) {
    case 'UNAUTHORIZED': openLoginModal(); break;
    case 'FORBIDDEN':    toast.error('権限がありません'); break;
    case 'INTERNAL':     toast.error('エラーが発生しました'); break;
    default:             toast.error('予期せぬエラー');
  }
};
```

## 4. error boundary

```tsx
// app/error.tsx
'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <div>
      <h1>エラーが発生しました</h1>
      <button onClick={reset}>再試行</button>
    </div>
  );
}
```

各ルートにも `error.tsx` を配置(`/bookmarks/error.tsx` 等)。

## 5. RSS取得失敗の扱い

```ts
// jobs/refresh-company-feed.ts
const result = await safeFetch(company.rss_url);
if (!result.ok) {
  await db.update(companies)
    .set({
      last_error: result.error,
      last_error_at: new Date(),
      consecutive_failures: sql`consecutive_failures + 1`,
    })
    .where(eq(companies.id, company.id));

  if (companyAfter.consecutive_failures >= 10) {
    Sentry.captureMessage(`Company ${company.slug} failing for 10 hours`, 'warning');
  }
  return; // throw しない、次回試行
}
```

## 6. リトライ戦略

| 操作 | 戦略 |
|---|---|
| HTTP取得 | 指数バックオフ 3回(1s, 2s, 4s) |
| DB INSERT 重複 | upsert で吸収、リトライ不要 |
| Trigger.dev ジョブ失敗 | `retry: { maxAttempts: 3 }` |
| ユーザー操作のServer Action | リトライしない(ユーザー判断) |

## 7. ログ送信

| 重要度 | 操作 |
|---|---|
| 期待される失敗(UnauthorizedFromUser) | ログ送信しない |
| 期待されるが追跡したい(RSS取得失敗) | logger.warn |
| 予想外の失敗(DB制約違反など) | logger.error + Sentry |
| 致命的(env欠落) | throw、Sentry 自動キャプチャ |

## 関連

- [observability.md](./observability.md)
- [backend.md](./backend.md)
- [shared.md](./shared.md) — Result型
