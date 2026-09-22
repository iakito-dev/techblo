# Data Flow

主要シナリオのデータフロー詳細。

## シナリオ1: 未ログインユーザーがトップを開く

```
1. Browser → GET /
2. middleware.ts: session check → 認証なし、public扱い
3. app/(public)/page.tsx (RSC) 起動
4. features/feed/web/queries.ts: getFeed({ sort: 'latest', page: 1 })  // 'use cache'
   (composition root: repo 組立 → application usecase → domain Repository(Port))
   ├ キャッシュ hit?
   │   ├ Yes → cached data 即返却
   │   └ No  → application が count と list を並列実行(Drizzle)→ cacheLife('minutes') で保持
5. RSC が JSX を生成
6. PPR: shell(ヘッダー・見出し・並び替え)を静的に、記事カードをストリーミング
7. Browser に段階的に表示
8. Suspense fallback (skeleton) → 実データに置換
```

**キャッシュキー**: `getFeed` の引数 `(sort, page, limit)`('use cache' が自動導出。タグ `feed`)

## シナリオ2: ログインユーザーがトップを開く

```
1. Browser → GET / with cookie
2. middleware.ts: session 取得成功
3. app/(public)/page.tsx (RSC) 起動
4. features/auth/server.ts: getSession() → user取得
5. features/feed/web/queries.ts: getFeed({ sort: 'latest' })
   ├ unstable_cache はuser_idで分離... ❌ する場合キャッシュヒット率0
   └ 代わりに「未ログイン用フィード」をキャッシュ → クライアントで個人化フィルタ
6. features/subscriptions/web/queries.ts: getEnabledCompanyIds(userId)
7. 取得結果をフィルタ(購読中の企業のみ)
8. features/bookmarks/web/queries.ts: listBookmarkedIds(userId, articleIds)
9. features/favorites/web/queries.ts: listFavoritedIds(userId, articleIds)
10. RSC が「未読/ブックマーク済み/お気に入り済み」のフラグを記事に付与
11. PPR streaming で表示
```

**設計判断**: 個人化フィルタは「全データを取得した後にアプリ層でフィルタ」より「DBクエリでJOIN」が望ましい(N+1を避ける)。

## シナリオ3: ブックマーク追加(クリック)

```
1. User: ブックマークボタンクリック (Client Component)
2. Client: useOptimistic で即UIを更新 ("保存済み" 表示)
3. <form action={addBookmark}> でServer Action呼出
4. Server Action: features/bookmarks/web/actions.ts addBookmark(formData)
   ├ requireSession() → user取得
   ├ Zod parse(formData)(application/dto.ts)
   ├ application: addBookmark usecase(認可は domain、Repository は引数注入)
   │    └ infrastructure: BookmarkRepository.upsert → INSERT ... ON CONFLICT DO NOTHING
   ├ revalidatePath('/bookmarks')
   └ trackEvent('bookmark_added')
5. Client: Server Action のレスポンスを受信
   ├ ok → useOptimistic コミット完了
   └ err → useOptimistic ロールバック + sonner toast
```

**冪等性**: ON CONFLICT DO NOTHING で重複INSERT を吸収。再リクエストしても安全。

## シナリオ4: RSS取得(バックグラウンド)

```
1. Trigger.dev cron: 毎時0分に発火
2. jobs/fetch-all-feeds.ts (親ジョブ)
   ├ companies WHERE enabled = true を取得
   └ refreshCompanyFeed.batchTrigger(...)
3. jobs/refresh-company-feed.ts (子ジョブ × 6社並列)
   ├ retry: 3 で fetchRss(url)
   │   └ lib/http/fetcher.ts: AbortSignal.timeout(10s) で安全に取得
   ├ parseRss(xml) → Zod validate → ArticleInput[]
   ├ for each article:
   │    ├ OGP取得が必要なら lib/ogp/extractor.ts で補完
   │    └ articles テーブルに upsert (by url unique)
   ├ companies.last_fetched_at = now()
   └ もし全件失敗なら companies.last_error に記録
4. 親ジョブで Promise.allSettled の結果を集約
5. revalidateTag(CACHE_TAGS.feed) → edge cache を即無効化
6. Trigger.dev ダッシュボードに実行結果を記録
7. 失敗があれば Sentry にエラー送信
```

**並列度**: 最大20(Trigger.dev free tier上限)。6社なら問題なし。

## シナリオ5: 初回Google OAuth ログイン

```
1. Browser: ヘッダーの「ログイン」クリック
2. signIn.social({ provider: 'google' }) → /api/auth/sign-in/social
3. Better Auth → Google OAuth へリダイレクト
4. ユーザーがGoogleで認可
5. Google → /api/auth/callback/google にリダイレクト
6. Better Auth がuser・session・accountを作成
7. middleware: signin成功イベントを検知 → initializeSubscriptions ジョブ起動
   └ jobs/initialize-user-subscriptions.ts: 全企業を enabled=true で INSERT
8. リダイレクト先(元のページ or /)へ302
9. Browser: cookie付きでアクセス、ログイン状態
```

**設計判断**: ユーザー初期化はjob化することで、認証フローを高速に保つ。

## シナリオ6: 購読企業のON/OFF

```
1. User: 設定画面で企業のチェックを外す
2. Client: useOptimistic で即UI更新
3. <form action={toggleSubscription}> 送信
4. Server Action: toggleSubscription(formData)
   ├ requireSession()
   ├ Zod parse
   ├ db.update(subscriptions)
   │    .set({ enabled: newValue, updated_at: now() })
   │    .where(and(eq(user_id, X), eq(company_id, Y)))
   ├ revalidatePath('/')  ← トップ画面のフィードを再生成
   └ revalidatePath('/settings')
5. Client: 成功なら確定、失敗ならロールバック
```

## シナリオ7: 記事の表示数カウント

```
1. User: 記事カードをクリック
2. Client: <Link> でなく <a target="_blank"> で元ブログへ遷移
3. 同時に Client side で trackArticleView Server Action を発火
   (await せず投げっぱなしでOK、計測は best effort)
4. Server Action: trackArticleView({ articleId })
   ├ session 任意(未ログインでも計測する)
   ├ db.update(articles)
   │    .set({ view_count: sql`view_count + 1` })
   │    .where(eq(articles.id, articleId))
   └ revalidate しない(キャッシュTTLで自然反映)
```

**設計判断**:
- view_count はソートに使う集計値。INSERT で別テーブルにすると集計コスト高い
- ただし同時クリックで race condition は起きる → SQL レベルの増分でOK

## シナリオ8: OGP プレースホルダー画像生成

```
1. RSC が <Image src="/api/og/abc123" /> を生成
2. Browser: /api/og/abc123 をリクエスト
3. app/api/og/[id]/route.ts
   ├ db.query.articles.findFirst({ where: eq(id, X) })
   ├ company の brand_color と title を取得
   └ next/og の ImageResponse でPNG生成
4. Cache-Control: public, max-age=86400 で1日キャッシュ
```

**最適化**: ImageResponse は edge で実行、レスポンス早い。

## シナリオ9: エラー伝播

```
DB error
   ↓
db.select() throws
   ↓
features/X/infrastructure: Repository が try/catch で Result.err にラップ
   ↓
features/X/application: usecase が Result を伝播(throw しない)
   ↓
features/X/web/{queries,actions}.ts: result.ok チェック、err なら logger.error + Sentry送信
   ↓
return err({ kind: 'INTERNAL' })
   ↓
Client: result.ok チェック、err なら useOptimistic ロールバック + toast
```

**throw は最上位の error boundary でのみ捕捉**。それより下では Result で表現。

## キャッシュタグ早見表

| データ | タグ | 無効化トリガー |
|---|---|---|
| 公開フィード | `feed` | RSS取得ジョブ完了時 |
| トレンド | `trending` | 1時間ごとの集計ジョブ |
| 企業マスタ | `companies` | 開発者が手動更新時 |
| 個別記事 | `article-{id}` | view_count等更新時 |

## 関連

- [overview.md](./overview.md)
- [backend.md](./backend.md)
- [error-handling.md](./error-handling.md)
