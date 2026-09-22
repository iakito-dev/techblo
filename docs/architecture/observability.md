# Observability

「何が起きているか」を把握する仕組み。Sentry / PostHog / Vercel Logs / Trigger.dev を組み合わせる。

## 1. 三本柱

| 種別 | ツール | 目的 |
|---|---|---|
| ログ(Logs) | Vercel Logs / console | 開発・デバッグ |
| エラー(Errors) | Sentry | 異常検知・原因究明 |
| メトリクス・行動(Events) | PostHog | ユーザー行動分析、Feature Flag |
| ジョブ実行 | Trigger.dev Dashboard | バッチの成否・履歴 |

## 2. ログ構造

`lib/observability/logger.ts` で JSON 構造化ログ:

```ts
logger.info('addBookmark started', { userId, articleId });
logger.warn('rss fetch slow', { companyId, durationMs });
logger.error('db query failed', { query, error });
```

各ログに以下が必ず含まれる(自動付与):
- `ts`: timestamp ISO 8601
- `level`: info / warn / error
- `msg`: メッセージ
- `requestId`: middleware で生成、cookie/header 経由で伝播
- `route`: リクエストルート(該当する場合)

## 3. Sentry

### 設定

```ts
// instrumentation.ts (Next.js 16)
import * as Sentry from '@sentry/nextjs';

export async function register() {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,  // 10% sampling
    profilesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV,
  });
}
```

### 送信タイミング

- Server Action 内で result.ok=false かつ kind='INTERNAL' なら送信
- ジョブ失敗時(retryAll 失敗後)
- Client error boundary 経由

### context 必須

```ts
Sentry.captureException(error, {
  tags: { feature: 'bookmarks', operation: 'add' },
  user: { id: userId },
  extra: { articleId },
});
```

### 個人情報を含めない

- email, name, profile_image 等の **PIIをcontextに入れない**
- `userId` のみ(突合は管理側で別途)

## 4. PostHog

### イベント設計

| イベント名 | プロパティ | 発火場所 |
|---|---|---|
| `article_viewed` | articleId, companyId | 記事クリック時 |
| `bookmark_added` | articleId | Server Action |
| `bookmark_removed` | articleId | Server Action |
| `favorite_added` | articleId | Server Action |
| `subscription_toggled` | companyId, enabled | Server Action |
| `login_succeeded` | provider | Better Auth コールバック |
| `login_modal_shown` | trigger | Client |

### イベント命名規則

- `[object]_[verb_past_tense]`
- 例: `article_viewed`, `bookmark_added`
- アンダースコア区切り、snake_case

### Feature Flag

A/Bテストや段階リリースに使用:

```ts
import { useFeatureFlagEnabled } from 'posthog-js/react';

const showAiSummary = useFeatureFlagEnabled('ai-summary');
if (showAiSummary) { /* show summary */ }
```

### セッション録画

無料枠 5K セッション/月。プロダクト改善ポイント発見に活用。

## 5. Vercel Logs

- すべての `console.log` / `console.error` が自動収集
- JSON形式 で出力すると Vercel UI で検索しやすい
- ファイル別、ルート別にフィルタ可能

## 6. Trigger.dev Dashboard

- ジョブの実行履歴、リトライ回数、ステータス確認
- 失敗ジョブの再実行
- ログを per-run で確認可能

## 7. ヘルスチェック

```ts
// app/api/healthz/route.ts
export async function GET() {
  const checks = {
    db: await checkDb(),
    auth: await checkAuth(),
  };
  const ok = Object.values(checks).every(c => c.ok);
  return Response.json(checks, { status: ok ? 200 : 503 });
}
```

外部の uptime monitor(無料: BetterStack, UptimeRobot 等)で監視。

## 8. パフォーマンス計測

### Web Vitals(自動)

`next/web-vitals` → PostHog にイベント送信:

```tsx
'use client';
import { useReportWebVitals } from 'next/web-vitals';
import posthog from 'posthog-js';

export function WebVitals() {
  useReportWebVitals((metric) => {
    posthog.capture('web_vital', {
      name: metric.name,
      value: metric.value,
      route: window.location.pathname,
    });
  });
  return null;
}
```

### DB クエリ計測

開発時のみ Drizzle のクエリログを有効化:

```ts
// db/client.ts
const db = drizzle(pool, {
  logger: process.env.NODE_ENV === 'development',
});
```

本番では遅いクエリを Supabase Dashboard(Query Performance / Logs)で監視。

## 9. アラート

### Sentry のアラート

- 1時間あたりエラー10件超 → Discord通知(個人向け)
- 新規エラー(初出) → 通知

### Trigger.dev のアラート

- ジョブ失敗連続3回 → 通知
- 実行時間2倍超 → 通知

## 10. ダッシュボードに必ず置く指標

- DAU / WAU / MAU
- 各社の last_fetched_at 経過時間
- RSS取得成功率(企業別)
- ブックマーク追加率(週次)
- 平均購読企業数
- LCP / INP 中央値

## 関連

- [error-handling.md](./error-handling.md)
- [security.md](./security.md)
