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

### 構成(ADR-0043)

| パス | 役割 |
|---|---|
| `lib/observability/posthog.ts` | init / `captureEvent` / `identifyUser` / `resetUser` と、送れるイベントの型(`AnalyticsEvents`)。features を import しない |
| `app/posthog-provider.tsx` | `PostHogProvider`(client)。描画時に init し、`AnalyticsIdentity` を載せる。`app/providers.tsx` 経由で `app/layout.tsx` 配下に入る |
| `app/layout.tsx` | `lib/env` からキーとホストを読み、`Providers` に props で渡す(client で `lib/env` を読むと zod がクライアントバンドルに戻るため。ADR-0042) |
| `features/auth/components/analytics-identity.tsx` | セッションと distinct_id の同期(identify / reset)と `login_succeeded` の判定 |
| `features/auth/pending-login.ts` | ログインボタン押下時のプロバイダを sessionStorage に置き、OAuth から戻った後の認証完了と結び付ける |

- **キー未設定なら何もしない**。`NEXT_PUBLIC_POSTHOG_KEY` が空なら init せず、`captureEvent` 等はすべて no-op。ローカル・プレビューで計測を混ぜたくなければ未設定のままでよい
- **pageview**: `capture_pageview: 'history_change'`。初回ロードに加え、App Router のクライアント遷移(pushState / 戻る・進む)ごとに `$pageview` が送られる。離脱は `$pageleave`
- **送信はクライアントからのみ**(posthog-node は入れていない)。Server Action 由来のイベントも、クライアントが結果を受け取って `ok` のときに送る(失敗してロールバックした操作は数えない)
- **個人情報を送らない**: `identify` はユーザー id だけ(person プロパティにメール・名前を載せない)。クリック要素のテキスト(`$el_text`)が載る autocapture / rageclick / dead click と、画面上のメールが写るセッション録画は無効にしている。有効にするなら PII を表示する要素に `ph-no-capture` を付けてから
- 匿名訪問者には person を作らない(`person_profiles: 'identified_only'`)。再訪・リテンションは匿名の distinct_id で追える
- ボットは PostHog 既定の User-Agent フィルタで除外される

### identify / reset

- セッション解決後、ログイン中なら Better Auth のユーザー id で `identify`(同じ id なら呼び直さない)
- 未ログインで、PostHog 側が識別済み(`$user_state = identified`)なら `reset`。ログアウト操作だけでなく、セッション切れで再訪したときも匿名に戻る
- `isPending` の間は判定しない(解決前は `data = null` のため、ログイン済みでも reset してしまう)

### イベント一覧

プロパティは camelCase。`isGuest` はゲスト(localStorage / Cookie 保存)の操作か。

| イベント名 | プロパティ | 発火場所 |
|---|---|---|
| `$pageview` / `$pageleave` | (自動) | 全ページ。App Router の遷移を含む |
| `article_clicked` | articleId, companyId, companySlug, source(`feed` / `event_list` / `related`) | 記事ページ(`/a/[id]`)へのリンクのクリック(`ArticleLink`) |
| `article_source_opened` | articleId, companyId, companySlug | 記事ページの「元記事を開く」(`ArticleSourceLink`) |
| `login_clicked` | provider(`google` / `github` / `discord`) | `SocialSignInButtons` のボタン押下(ログイン・登録は同じ操作) |
| `login_succeeded` | provider, isNewUser | OAuth から戻ってセッションができたとき(`AnalyticsIdentity`)。isNewUser はユーザー作成から10分以内か(= 今回登録した) |
| `bookmark_added` / `bookmark_removed` | articleId, isGuest | 保存ボタン(`ArticleActions`)・保存一覧(`SavedArticlesView`)。ログイン時は Server Action 成功後 |
| `favorite_added` / `favorite_removed` | articleId, isGuest | 同上 |
| `subscription_added` / `subscription_removed` | companyId(ゲストは null), companySlug, isGuest, bulk | 設定の購読企業(`SubscriptionList` / `GuestSubscriptionList`)。bulk は「すべて表示/非表示」で実際に変わった企業ごとに送る |

`login_clicked` → `login_succeeded` のファネルで、プロバイダごとの離脱(OAuth 画面での離脱)が見える。

### イベント命名規則

- `[object]_[verb_past_tense]`
- 例: `article_clicked`, `bookmark_added`
- アンダースコア区切り、snake_case
- 新しいイベントは `AnalyticsEvents`(`lib/observability/posthog.ts`)に型を足してからこの表に追記する

### Feature Flag

A/Bテストや段階リリースに使用(未使用。使うときは `lib/observability/posthog.ts` にラッパーを足す):

```ts
import posthog from 'posthog-js';

const showAiSummary = posthog.isFeatureEnabled('ai-summary');
```

### セッション録画

無料枠 5K セッション/月。現状は無効(上記「個人情報を送らない」)。

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
