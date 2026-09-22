# Performance

ユーザー体験を最優先したパフォーマンス設計。Core Web Vitals + 体感速度を最適化。

## 1. 目標値

| 指標 | 目標 | 良好 |
|---|---|---|
| LCP | < 2.5s | < 1.8s |
| INP | < 200ms | < 100ms |
| CLS | < 0.1 | < 0.05 |
| TTFB | < 800ms | < 400ms |
| JS bundle/ページ | < 150KB gz | < 100KB gz |

## 2. レンダリング戦略

### PPR(Partial Prerendering)を最大限活用

```tsx
// app/(public)/page.tsx
import { Suspense } from 'react';

export const experimental_ppr = true;

export default function Page() {
  return (
    <>
      {/* これは静的に prerender される */}
      <Header />
      <Sidebar />

      {/* これは動的、Suspense fallback付きでストリーミング */}
      <Suspense fallback={<ArticleSkeleton />}>
        <ArticleList />
      </Suspense>
    </>
  );
}
```

### Static / Dynamic の判断

| ルート | 戦略 |
|---|---|
| `/` (public フィード) | PPR(shell静的、記事動的) |
| `/login` | Static |
| `/bookmarks` | Dynamic SSR |
| `/settings` | Dynamic SSR |
| 利用規約・プライバシー(将来) | Static |

## 3. キャッシュ層

```
┌─ Browser cache (静的アセット)
├─ Vercel Edge CDN
├─ Next.js Cache ('use cache' / cacheComponents)
├─ Drizzle (アプリレイヤーはキャッシュなし)
└─ Supabase Postgres (DBレベルバッファ)
```

### キャッシュタグ運用

`lib/cache/tags.ts` に集約。公開フィードはゲスト共通なので `getFeed(sort, page, limit)` を
`'use cache'` 化し、`cacheTag` + `cacheLife` で時間ベース再検証する(ADR-0013)。

```ts
// 取得時(features/feed/web/queries.ts)
export async function getFeed(input) {
  'use cache';
  cacheTag(CACHE_TAGS.feed);
  cacheLife('minutes');
  // ...listFeed 呼び出し
}

// 無効化時(RSS 取得をルート/Trigger 化したら)
revalidateTag(CACHE_TAGS.feed);
```

## 4. 画像最適化

### `next/image` を必ず使う

```tsx
import Image from 'next/image';

<Image
  src={article.og_image}
  alt={article.title}
  width={400}
  height={210}
  loading="lazy"
  placeholder="blur"
  blurDataURL={article.og_blur}
/>
```

### `next.config.ts` 設定

```ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'engineering.mercari.com' },
    // 全6社のホストを登録
  ],
  formats: ['image/avif', 'image/webp'],
  minimumCacheTTL: 86_400, // 1日
}
```

### LCP対応

- カードはテキスト主体(画像なし、ADR-0011)なので LCP 要素はヘッダー・見出し・先頭カードのテキスト
- shell(ヘッダー・見出し・並び替え)は静的に即時表示し、記事グリッドのみ Suspense でストリーミング
- フォントは `next/font` + `display: swap` で FOIT を避ける

## 5. フォント

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});
```

- self-host で外部リクエスト削減
- `display: swap` で text表示を即座に
- 日本語フォントは system font優先(ロード重い)

## 6. JS バンドル削減

### Client Component を最小化

- ページの大半が RSC
- `'use client'` を leaf に押し込む

### Code splitting

```tsx
import dynamic from 'next/dynamic';

const HeavyModal = dynamic(() => import('./heavy-modal'), {
  loading: () => <Spinner />,
});
```

### Tree-shakable な書き方

```tsx
// ❌ 全体import
import * as motion from 'motion/react';

// ✅ named import
import { motion } from 'motion/react';
```

### Bundle analyzer

```bash
ANALYZE=true bun run build
```

## 7. データ取得最適化

### N+1 を避ける

```ts
// ❌ N+1
const articles = await db.select().from(articles);
for (const a of articles) {
  a.company = await db.select().from(companies).where(eq(companies.id, a.company_id));
}

// ✅ JOIN
const articles = await db
  .select()
  .from(articles)
  .innerJoin(companies, eq(companies.id, articles.company_id));
```

### 並列取得

```ts
const [feed, companies] = await Promise.all([
  getFeed({ sort: 'latest' }),
  getCompanies(),
]);
```

### ページネーション

フィードは **オフセット(`?page=N`)+ キャッシュ**(ADR-0013)。現規模(6社・数百件)では
OFFSET の劣化は無視でき、URL の短さ・数字ページ・popular 対応・キャッシュ適性を優先する。
`count` と `list` は並列実行する。

データが 1万件級になったら keyset(`WHERE (published_at, id) < $cursor ORDER BY ... LIMIT N`)への
回帰を再検討する。

## 8. 楽観的UI

ユーザーアクションは `useOptimistic` で即時反映:

```tsx
const [optimistic, addOptimistic] = useOptimistic(initial);
```

体感速度 = サーバー往復時間 → **0ms** に。

## 9. ストリーミング

Server Component のリストは Suspense でストリーミング:

```tsx
<Suspense fallback={<FeedGridSkeleton />}>
  <FeedGrid searchParams={searchParams} />
</Suspense>

<Suspense fallback={<TrendingSkeleton />}>
  <TrendingWidget />
</Suspense>
```

各セクションが独立してロード完了次第表示。

## 10. プリフェッチ

- `<Link prefetch={true}>` がデフォルト(Next.js 15+)
- ビューポートに入った時点で次のページのHTMLを取得
- 重要なナビゲーション(ブックマーク/お気に入り)は確実にprefetch

## 11. RSS取得の最適化

- 6社並列(Promise.allSettled)
- HTTP keep-alive を活用
- ETag/Last-Modified ヘッダーで差分取得(対応RSSなら)
- 同じ記事を Drizzle の `onConflictDoNothing` で重複INSERTを防ぐ

## 12. DBインデックス

| クエリ | 必要なインデックス |
|---|---|
| トップフィード(企業フィルタ + 新着順) | `(company_id, published_at desc)` |
| ブックマーク一覧 | `(user_id, created_at desc)` |
| 記事のURLによるupsert | `(url) UNIQUE` |
| 企業の有効フィルタ | `(enabled) WHERE enabled = true` |

## 13. CDN ヘッダー

```ts
// 静的なAPI レスポンス
return new Response(json, {
  headers: {
    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
  },
});
```

## 14. Monitoring

- Web Vitals → PostHog
- TTFB / LCP / INP / CLS をルート別に集計
- 月次レポートで悪化箇所を特定

## 関連

- [frontend.md](./frontend.md) — Client/Server境界
- [backend.md](./backend.md) — DB クエリパターン
- [observability.md](./observability.md) — Web Vitals計測
