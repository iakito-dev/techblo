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

- `app/error.tsx`: shell を持たないルートの error boundary。リトライ導線を出す
- `app/(app)/error.tsx`: アプリ画面(サイドバー付き)用
- `app/global-error.tsx`: root layout ごと落ちたときの最後の受け皿

Sentry は未導入なので、現状クライアント側の例外はどこにも送っていない(導入時にここで capture する)。

## 5. RSS取得失敗の扱い

```ts
// lib/rss/ingest.ts(抜粋)
async function recordFailure(companyId: string, message: string): Promise<void> {
  await db
    .update(companies)
    .set({
      lastError: message,
      lastErrorAt: new Date(),
      consecutiveFailures: sql`${companies.consecutiveFailures} + 1`,
    })
    .where(eq(companies.id, companyId));
  logger.warn('ingest failed', { companyId, error: message });
}
```

throw せず `IngestResult` を返し、次の cron で再試行する。連続失敗は `/api/healthz` で見える(`docs/features/health.md`)。

## 6. リトライ戦略

| 操作 | 戦略 |
|---|---|
| HTTP取得 | `lib/http/fetcher.ts`: 5xx とネットワーク例外を指数バックオフで最大3回再試行(1s, 2s, 4s)。4xx は即失敗 |
| DB INSERT 重複 | upsert で吸収、リトライ不要 |
| Trigger.dev ジョブ失敗 | タスク内で失敗を吸収し、次の cron で再試行 |
| ユーザー操作のServer Action | リトライしない(ユーザー判断) |

## 7. ログ送信

| 重要度 | 操作 |
|---|---|
| 期待される失敗(UnauthorizedFromUser) | ログ送信しない |
| 期待されるが追跡したい(RSS取得失敗) | logger.warn |
| 予想外の失敗(DB制約違反など) | logger.error |
| 致命的(env欠落) | 起動時に t3-env が throw |

## 関連

- [observability.md](./observability.md)
- [backend.md](./backend.md)
- [shared.md](./shared.md) — Result型
