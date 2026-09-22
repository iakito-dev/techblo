# ADR-0014: ユーザー登録RSS(プライベートフィード)

- **状態**: Accepted
- **決定日**: 2026-06-13
- **関連**: ADR-0002(feature-sliced), ADR-0009(データモデル), ADR-0010(レイヤー), ADR-0013(フィード合成), ADR-0005(MVP除外)

## 背景

これまで記事ソースは運営がキュレーションした `companies` のみで、ユーザーは増やせなかった(ADR-0005 で「ユーザーによる企業追加」は MVP 除外)。
ログインユーザーが自分専用の RSS を登録し、その記事をメインフィードに混ぜて読めるようにしたい。要件:

- **プライベート**: 登録者本人にだけ見える(他ユーザー・公開キャッシュに影響しない)
- **即時取得 + 定期バッチ**で更新
- **メインフィードに新着順で混ぜる**

## 決定内容

### 1. 別テーブルに分離

`user_feeds`(登録フィード) / `user_feed_articles`(取り込んだ記事)を新設する。公開記事(`articles`)には混ぜない。

- 公開記事は全ユーザー共有 + 公開キャッシュ(`'use cache'` + tag `feed`)。プライベートデータを混在させない。
- `user_feed_articles.url` の一意性はフィード内(`user_feed_id` スコープ)に限定。別ユーザーが同じ URL を登録できる。
- 取得ステータス列(`last_fetched_at` / `last_error` / `consecutive_failures`)は `companies` と同型。

### 2. メインフィードへのマージは DB の UNION ALL

2ソースをオフセットページネーションで正しく合成するには DB の UNION が必須(アプリ側の手マージはページ境界が破綻する)。

- `feed` feature の `ListCriteria` に `userFeedIds?` を追加。指定時 `DrizzleArticleRepository.list()` が
  `articles`(company フィルタ済み)と `user_feed_articles`(`user_feed_id in (...)`)を UNION ALL し、`published_at desc, id desc` でページングする。
- **レイヤー帰属**: `feed` の infrastructure が `db/schema/user-feed-articles` を直接 read する。ADR-0010 の
  「features/A は features/B を import しない」は **コード依存**の制約であり、`db/schema/*`(共有インフラ)の参照は
  infrastructure 層に許容される既存方針に沿う。`user-feeds` feature の application/web には依存しない。
- ユーザー記事は表示 DTO(`ArticleCard`)の company 欄を擬似的に埋める: `name`=フィードタイトル, `slug`='user-feed',
  `brandColor`=中立色。ファビコンは記事 URL から導出される(`CompanyFavicon`)。

### 3b. フィルタ源としてのマイフィード(`?feed`)

マイフィードは企業(`?company`)と並ぶフィルタ源として `?feed=<id>,<id>` で絞り込める。源スコープは排他/併用:
company のみ→公開のみ / feed のみ→マイフィードのみ(公開を含めない `includePublicArticles=false`)/ 両方→併用 / 無指定→全部。
合成は app 層 `getFeedPageData` が解決し、`feed` の Repository が UNION 側の有無を切り替える。
UI はサイドバー・モバイルシート/チップ・タブレットツールバーに追加(ログイン専用)。`?feed` も新着順・主経路でのみ作用する。

### 3. MVP スコープ: 新着順・主経路のみ

マージは **`sort='latest'` かつ 未読/既読フィルタなし かつ 非検索** の主経路のみ。

- `popular` はユーザー記事を含めない(`trend_score`/はてブ数を持たない)。
- 検索・未読/既読フィルタ経路は公開記事のみ(後続改善)。

理由: 複雑性とキャッシュバリアントの爆発を抑える。検索は `'use cache'` を通さない(ADR-0022)経路で、per-user × 語彙の組合せが非有界になるため。

### 4. キャッシュ戦略

- マージ版は per-user。`getMergedFeed(userId, userFeedIds, input)` を tag `[feed, userFeeds(userId)]`・`cacheLife('days')` で焼く(`getReadFilteredFeed` と同型)。
- 無効化:
  - 公開記事の新着 → 既存取込 cron の `revalidateTag(feed)` で一緒に更新。
  - ユーザーの add/remove/toggle/refresh → `updateTag(userFeeds(userId))`。
  - 定期バッチ(`fetch-user-feeds`)完了 → `revalidateTag(feed)`(全マージ版を更新。per-user タグを全員ぶん叩く必要を回避)。

### 5. SSRF 対策(必須)

ユーザー入力 URL を外部 fetch するため、`lib/http/safe-url.ts` の `assertPublicHttpUrl` で
http/https のみ許可・ホスト名解決後にプライベート/ループバック/リンクローカル/クラウドメタデータ(169.254.169.254)IP を拒否する。

- 既存 `safeFetch`(`lib/http/fetcher.ts`)は URL 検証なし。企業RSS(運営管理)はそのままで問題ないが、ユーザー RSS の取得経路でのみ検証を挟む。
- DNS rebinding は完全には防げない(解決後のチェックのため)。MVP では実用十分とし、必要なら resolve 済み IP へ直接接続する方式に強化する。

### 6. その他の制約

- 1ユーザーの登録上限 `MAX_FEEDS_PER_USER = 50`。
- 同一ユーザー × 同一 URL は `UNIQUE(user_id, rss_url)` で重複登録を拒否。
- 取得失敗時はフィードを作らない(登録時)/ ステータスに残す(更新時)。

## 結果

- ✅ プライベートデータと公開キャッシュを分離
- ✅ 2ソースの正しい新着順ページネーション(DB UNION)
- ✅ ユーザー入力 URL の SSRF を遮断
- ⚠️ popular / 検索 / 既読フィルタではユーザー記事が出ない(MVP スコープ)
- ⚠️ DNS rebinding は完全には防げない

## 関連

- スキーマ: `db/schema/user-feeds.ts`, `db/schema/user-feed-articles.ts`
- feature: `features/user-feeds/`(4層), マージ: `features/feed/infrastructure/drizzle-article-repository.ts`
- バッチ: `trigger/fetch-user-feeds.ts`
- 仕様: `docs/features/user-feeds.md`
