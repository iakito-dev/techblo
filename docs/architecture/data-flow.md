# Data Flow

主要シナリオのデータフロー詳細。

## シナリオ1: 未ログインユーザーがトップを開く

```
1. Browser → GET /
2. app/(app)/page.tsx (RSC) 起動(middleware は無い。ゲストもそのまま閲覧できる)
3. features/feed/web/queries.ts: getFeed({ sort: 'latest', page: 1 })  // 'use cache'
   (composition root: repo 組立 → application usecase → domain Repository(Port))
   ├ キャッシュ hit?
   │   ├ Yes → cached data 即返却
   │   └ No  → application が count と list を並列実行(Drizzle)→ cacheLife('minutes') で保持
4. RSC が JSX を生成
5. PPR(cacheComponents): shell(ヘッダー・見出し・並び替え)を静的に、記事カードをストリーミング
6. Suspense fallback (skeleton) → 実データに置換
```

**キャッシュキー**: `getFeed` の引数 `(sort, page, limit)`('use cache' が自動導出。タグ `feed`)

## シナリオ2: ログインユーザーがトップを開く

```
1. Browser → GET / with cookie
2. app/(app)/page.tsx (RSC) 起動
3. features/auth/server.ts: getSession() → user取得(React cache() でリクエスト内デデュープ)
4. features/subscriptions/web/queries.ts: 購読中の企業 ID を取得(ユーザー別タグでキャッシュ / ADR-0016)
5. features/feed/web/queries.ts: 購読企業で絞ったフィードを取得
6. 保存状態(ブックマーク / お気に入り)・既読は各 feature の queries から ID 集合で取得し、
   app / components 側で記事カードに合成する(ADR-0013)
7. PPR streaming で表示
```

**設計判断**: 個人化フィルタは「全データを取得した後にアプリ層でフィルタ」より「DBクエリでJOIN」が望ましい(N+1を避ける)。

## シナリオ3: ブックマーク追加(クリック)

```
1. User: ブックマークボタンクリック (Client Component)
2. Client: useOptimistic で即UIを更新 ("保存済み" 表示)
3. Server Action 呼出(ゲストは Server Action を呼ばず localStorage に保存 / ADR-0017)
4. Server Action: features/bookmarks/web/actions.ts setBookmarkAction(input)
   ├ getSession() → user取得(未ログインならエラーを返す)
   ├ application: usecase(Repository は引数注入)
   │    └ infrastructure: BookmarkRepository → INSERT ... ON CONFLICT DO NOTHING
   ├ updateTag(CACHE_TAGS.userBookmarks(userId))
   └ revalidatePath('/bookmarks')
   ※ 保存イベントはクライアントから PostHog に送る(ADR-0043)
5. Client: Server Action のレスポンスを受信
   ├ ok → useOptimistic コミット完了
   └ err → useOptimistic ロールバック + sonner toast
```

**冪等性**: ON CONFLICT DO NOTHING で重複INSERT を吸収。再リクエストしても安全。

## シナリオ4: RSS取得(バックグラウンド)

```
1. Trigger.dev cron: 毎時0分に発火
2. trigger/fetch-feed-articles.ts
   ├ DrizzleArticleRepository と upsertArticles usecase を組み立てて sink にする
   └ lib/rss/ingest.ts: ingestAllCompanies(sink)
3. enabled な全企業を Promise.allSettled で並列に ingestCompany
   ├ lib/rss/fetcher.ts → lib/http/fetcher.ts(timeout 15秒 + retry、SSRF ガード)
   ├ lib/rss/parser.ts: RSS/Atom → Zod validate → ArticleInput[]
   ├ sink: articles テーブルに upsert (by url unique)
   └ 成功なら companies.last_fetched_at、失敗なら last_error / consecutive_failures を更新
4. はてブ数を更新(updateArticleMetrics / ADR-0018)
5. POST /api/revalidate → Next 側で revalidateTag(cron は Next ランタイム外のため)
6. Trigger.dev ダッシュボードに実行結果を記録、失敗は logger.warn
```

## シナリオ5: 初回Google OAuth ログイン

```
1. Browser: ヘッダーの「ログイン」クリック
2. signIn.social({ provider: 'google' }) → /api/auth/sign-in/social
3. Better Auth → Google OAuth へリダイレクト
4. ユーザーがGoogleで認可
5. Google → /api/auth/callback/google にリダイレクト
6. Better Auth がuser・session・accountを作成
7. Better Auth の databaseHooks.user.create.after(lib/auth.ts)
   └ lib/initialize-user-subscriptions.ts: 全有効企業を subscriptions に INSERT(ADR-0012)
8. リダイレクト先(元のページ or /)へ302
9. Browser: cookie付きでアクセス、ログイン状態
```

**設計判断**: 初期化に失敗してもログインは止めず、error ログだけ残す。

## シナリオ6: 購読企業のON/OFF

```
1. User: 設定画面で企業のチェックを外す
2. Client: useOptimistic で即UI更新
3. Server Action: features/subscriptions/web/actions.ts toggleSubscriptionAction(input)
   ├ getSession()(未ログインならエラー。ゲストは localStorage)
   ├ application: usecase → infrastructure: SubscriptionRepository で更新
   ├ updateTag(CACHE_TAGS.userSubscriptions(userId))  ← フィードの購読絞り込みも追従
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
features/X/web/{queries,actions}.ts: result.ok チェック、err なら logger.error
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
