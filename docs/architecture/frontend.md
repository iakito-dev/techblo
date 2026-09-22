# Frontend Architecture

React Server Component を主軸に、必要最小限のクライアント境界で構築。

## 1. コンポーネント階層

```
app/{route}/page.tsx              ← RSC: データ取得とlayout調整
   ├ <FeatureContainer>           ← RSC: feature単位のラッパー
   │    ├ <FeatureCard data={}>   ← RSC: 表示専用
   │    │   └ <InteractiveZone>   ← Client: イベントハンドラ
   │    └ <FeatureForm>           ← Client: Server Actionに送信
   └ <UIPrimitive>                ← components/ui/ (shadcn)
```

**設計の鉄則**
- データ取得は RSC で完結
- Client Component は **可能な限り leaf**(ツリーの末端)に押し込む
- Container/Presentational パターンは不採用(RSC が代替)
- 表示ロジック・操作状態は ViewModel(`features/*/web/view-models/use-*.ts`)に分離する。ViewModel は fetch も SQL も持たず、取得は RSC・更新は Server Action 経由(ADR-0010。純粋クライアント MVVM にはしない)

## 2. Server Component vs Client Component

### Server Component(デフォルト)

以下を含むコンポーネントは全部 RSC:
- データ取得(`features/*/queries.ts` 呼出)
- 静的レンダリング
- メタデータ生成
- 静的アセット参照

### Client Component(`'use client'` をつける)

- `useState`, `useReducer`, `useEffect` 等
- イベントハンドラ(onClick, onChange)
- ブラウザ専用API(localStorage, IntersectionObserver)
- サードパーティClient Library(motion/react, vaul, sonner)

**`'use client'` を最小化するコツ**
- フォームは RSC で組み、submit boundary だけ Client にする
- リストの中の1つだけinteractiveなら、その1つだけClient化する
- Server Component に Client Component を **子として渡せる** ことを利用

```tsx
// RSC: 親がデータ取得し、ClientコンポーネントへPropsで渡す
export default async function FeedPage() {
  const { items: articles } = await getFeed();
  return (
    <FeedShell>
      {articles.map(a => (
        <ArticleCard key={a.id} article={a}>
          {/* Client Component を子として渡す */}
          <BookmarkButton articleId={a.id} />
        </ArticleCard>
      ))}
    </FeedShell>
  );
}
```

## 3. データ取得パターン

### 静的データ(RSC, fetch + cache)

```tsx
// features/feed/web/queries.ts(composition root)
import { cacheLife, cacheTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/tags';
// 取得本体は application usecase + infrastructure Repository。
// web 層はキャッシュ境界('use cache')を張り usecase を呼ぶだけ(db は直叩きしない)
export async function getFeed(input) {
  'use cache';
  cacheTag(CACHE_TAGS.feed);
  cacheLife('minutes');
  return unwrap(await listFeed({ articles: articleRepo })(input));
}
```

### 個人化データ(キャッシュなし)

```tsx
// features/bookmarks/web/queries.ts(composition root)
export async function listBookmarks(userId: string) {
  // 個人化データは cache せず usecase をそのまま呼ぶ(DB アクセスは infrastructure Repository)
  return listUserBookmarks({ bookmarks: bookmarkRepo })(userId);
}
```

### Client-sideでの追加取得(TanStack Query)

無限スクロール等、Client から追加データが必要な場合のみ:

```tsx
'use client';
import { useInfiniteQuery } from '@tanstack/react-query';

export function ArticleList({ initialData }) {
  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: ['articles'],
    queryFn: ({ pageParam }) => fetchArticlesPage(pageParam),
    initialData: { pages: [initialData], pageParams: [null] },
  });
  // ...
}
```

**禁止**: `useEffect` で fetch するパターン → RSC か TanStack Query で代替

## 4. 状態管理

### 状態の種類と置き場所

| 状態の種類 | 置き場所 | ツール |
|---|---|---|
| URL状態(検索クエリ、ソート、ページ) | URLパラメータ | `useSearchParams` |
| Server state(DB データ) | RSC でfetch | RSC + revalidatePath |
| Optimistic UI 状態 | Client | `useOptimistic` |
| 一時的UI状態(modal開閉、tab選択) | Client local | `useState` |
| 横断UI状態(theme、コマンドパレット) | Client global | `Zustand` |
| Form 状態 | Client + Server Action | `useActionState` |
| キャッシュ必須のserver state | Client | `TanStack Query` |
| 表示派生ロジック・操作状態 | `features/*/web/view-models` | Client hook(`useFeedSort` 等) |

### Zustand を使う基準

以下のすべてを満たす場合のみ:
1. 複数の独立コンポーネントから参照される
2. URL や RSC ではうまく表現できない
3. 永続化が不要(永続化必要なら DB へ)

例: コマンドパレット(⌘K)の開閉状態、グローバルトースト、テーマ。

## 5. フォーム処理

### Server Action + useActionState(基本)

```tsx
'use client';
import { useActionState } from 'react';
import { createBookmark } from '@/features/bookmarks/actions';

export function BookmarkForm({ articleId }: Props) {
  const [state, formAction, pending] = useActionState(
    createBookmark,
    { ok: true, value: undefined }
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="articleId" value={articleId} />
      <button disabled={pending}>ブックマーク</button>
      {!state.ok && <p>{state.error}</p>}
    </form>
  );
}
```

### useOptimistic で即時UI反映

```tsx
'use client';
import { useOptimistic } from 'react';

export function BookmarkToggle({ initialBookmarked, articleId }) {
  const [optimistic, setOptimistic] = useOptimistic(initialBookmarked);
  return (
    <form action={async (formData) => {
      setOptimistic(!optimistic);
      await toggleBookmark(formData);
    }}>
      <input type="hidden" name="articleId" value={articleId} />
      <button>{optimistic ? '✓ 保存済み' : '+ ブックマーク'}</button>
    </form>
  );
}
```

### 複雑なフォーム(react-hook-form + Zod)

入力項目が多いフォーム(設定画面等)は react-hook-form を併用:

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsSchema } from '@/features/settings/types';

export function SettingsForm() {
  const form = useForm({ resolver: zodResolver(settingsSchema) });
  return <form onSubmit={form.handleSubmit(updateSettings)}>...</form>;
}
```

## 6. ルーティング

### ルートグループ

```
app/
├── (public)/          ← 認証不要
│   ├── layout.tsx     ← ヘッダー、フィルタ等
│   └── page.tsx       ← トップ
├── (auth)/            ← 認証必要(layoutでguard)
│   ├── layout.tsx     ← requireSession() でガード
│   ├── bookmarks/page.tsx
│   ├── favorites/page.tsx
│   └── settings/page.tsx
└── (marketing)/       ← LP、利用規約等(将来)
```

### Parallel Routes / Intercepting Routes

MVPでは使わない。複雑度を上げないため。

将来:
- ログインモーダル → Intercepting Route で `/login` を modal-overlay 表示
- ダッシュボード分割 → Parallel Routes

### Loading / Error

各ルートに以下を必ず配置:
- `loading.tsx` ← Suspense fallback、skeleton表示
- `error.tsx` ← error boundary、リトライUI
- `not-found.tsx` ← 404

## 7. UI コンポーネント階層

```
components/
├── ui/                       ← shadcn primitives(変更最小限)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── layout/                   ← 横断的なlayout components
│   ├── header.tsx
│   ├── mobile-nav.tsx
│   ├── sidebar.tsx
│   └── footer.tsx
└── shared/                   ← 横断的だがUI primitiveではない
    ├── login-modal.tsx       ← グローバルに使うmodal
    ├── error-fallback.tsx
    └── theme-provider.tsx
```

features 配下の components は **その feature 専用**(web 層に置く):

```
features/feed/web/components/
├── article-card.tsx
├── featured-card.tsx
├── feed-grid.tsx
├── feed-sidebar.tsx
└── feed-widgets.tsx
```

## 8. アニメーション

### View Transitions API(ページ遷移)

```tsx
// next.config.ts
export default {
  experimental: { viewTransition: true }
};
```

```tsx
// app/layout.tsx
'use client';
import { unstable_ViewTransition as ViewTransition } from 'react';

<ViewTransition>
  {children}
</ViewTransition>
```

### motion/react(要素アニメーション)

```tsx
'use client';
import { motion } from 'motion/react';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  ...
</motion.div>
```

### Tailwind の組込アニメーション

シンプルなhover/transitionは Tailwind の utility で:
```tsx
<div className="transition-all hover:-translate-y-1 hover:shadow-md">
```

### モバイル左右スワイプの画面切替(`mobile-swipe-navigation.tsx`)

メイン4画面(フィード/あとで読む/お気に入り/設定)の左右スワイプ遷移は、`(app)/layout.tsx` が保持する `[data-mobile-swipe-content]` ラッパーへ `transform` を直接当てて演出する。

- ドラッグ中: 指に追従して平行移動(抵抗係数 `DRAG_RESISTANCE`)。
- 確定時: 旧コンテンツを画面外(スワイプ方向)へスライドアウト → `router.push` → **遷移先の `pathname` が確定してから**反対端→中央へスライドイン。「古いページが抜け、新しいページが反対側から入る」連続感を出す。
- ちらつき回避(why): 旧実装は push と同時に `transform` を解除していたため、非同期な RSC 遷移の間に旧コンテンツが中央へスナップバックし、その後 skeleton が点滅していた。スライドイン開始を `pathname` 変化に固定し、コンテンツ差し替えを画面外で完結させることでこれを解消(`isPending` ではなく `pathname` を見るのは、クライアントキャッシュヒットで遷移が同期的でもラッパーが画面外に取り残されないため)。

### `prefers-reduced-motion` を必ず尊重

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

スワイプ遷移も `prefers-reduced-motion: reduce` 時はスライドを省略して即遷移する。

## 9. テーマとデザイントークン

### Tailwind v4 + デザイントークン

```css
/* app/globals.css */
@import 'tailwindcss';

@theme {
  --color-primary: #e76f3c;
  --color-primary-soft: #fde8dd;
  --color-bg-app: #ebe8e1;
  --color-bg-surface: #ffffff;
  --color-fg-default: #1a1a18;
  /* ... */
  --radius-pill: 9999px;
  --spacing-1: 0.25rem;
  /* ... */
}
```

shadcn/ui の theme variable と統合。design/mockup.html の token定義を反映。

### ダークモード(将来)

Tailwind v4 では `@variant dark` で対応。MVPは light 固定。

## 10. パフォーマンス指針

### 必ず守る
- `next/image` で画像表示(`<img>` 直書き禁止)
- `next/font` でフォントself-host(layout shift 防止)
- Client Component を最小化(JS バンドル削減)
- 重いコンポーネントは `dynamic(() => import(...))` で code split

### Web Vitals 目標
- LCP < 2.5s
- INP < 200ms
- CLS < 0.1

### バンドル監視
- `@next/bundle-analyzer` を導入
- 1ページあたりのJSは 150KB 以下を目標

## 関連

- [backend.md](./backend.md)
- [shared.md](./shared.md)
- [docs/principles/design.md](../principles/design.md)
