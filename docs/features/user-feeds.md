# Feature: user-feeds(マイフィード / ユーザー登録RSS)

## 概要

ログインユーザーが自分専用の RSS / Atom を登録し、その記事をメインフィード(新着順)に混ぜて読める。
登録は**プライベート**(本人だけに見える)で、他ユーザーや公開キャッシュには影響しない。設計判断は [ADR-0014](../adr/0014-user-private-rss-feeds.md)。

## ユーザーストーリー

- ログインユーザーとして、企業一覧に無いブログの RSS を登録して、自分のフィードで一緒に読みたい
- 登録したフィードを後から ON/OFF・削除・手動更新したい

## 画面/UI

- 設定画面 `/settings` の「マイフィード」セクション(`SettingsSection`)。**ログイン時のみ表示**(ゲストには出さない)。
- URL 入力欄 + 「登録」ボタン。登録すると即時に取得し、件数をトーストで通知。
- 登録済みリスト: ファビコン + フィードタイトル + RSS URL + 取得エラー(あれば) + 表示 ON/OFF トグル + 手動更新 + 削除。
- 見出しに登録数「マイフィード(3/50)」。上限到達時は入力を無効化し案内を出す。
- トグルは楽観更新(失敗時ロールバック)。追加/削除/更新は成功後 `router.refresh()` で一覧をサーバーに同期。

## データモデル

```ts
// db/schema/user-feeds.ts
user_feeds: {
  id: uuid(PK)
  user_id: text(FK → user, ON DELETE CASCADE)
  rss_url: text
  title: text                 // 取得したフィードタイトル(不能時はホスト名)
  site_url: text | null
  enabled: boolean (default true)
  last_fetched_at / last_error / last_error_at / consecutive_failures   // companies と同型
  created_at / updated_at
  // UNIQUE(user_id, rss_url), index(user_id)
}

// db/schema/user-feed-articles.ts
user_feed_articles: {
  id: uuid(PK)
  user_feed_id: uuid(FK → user_feeds, ON DELETE CASCADE)
  url / title / description / og_image / author / published_at / created_at
  // UNIQUE(user_feed_id, url) — フィード内重複排除(global unique にはしない)
  // index(user_feed_id, published_at desc) — マージクエリ用
}
```

## API / Server Action

> シグネチャは公開 API の形。実装は application 層の usecase、DB アクセスは infrastructure の Repository。`web/queries.ts` は composition root。

```ts
// features/user-feeds/web/queries.ts
getUserFeeds(userId): Promise<UserFeedSetting[]>        // 設定画面用('use cache' + userFeeds タグ)
getEnabledUserFeedIds(userId): Promise<string[]>        // メインフィードのマージ対象 id

// features/user-feeds/web/actions.ts
addUserFeedAction(rssUrl): Result<{ added }, { message }>     // 即時取得込み
toggleUserFeedAction({ id, enabled }): Result<{ enabled }, { message }>
removeUserFeedAction(id): Result<void, { message }>
refreshUserFeedAction(id): Result<{ added }, { message }>     // 手動更新
```

## ビジネスルール

- ログイン必須(プライベート)。各操作は所有者(`user_id`)を WHERE に含めて他人の行に触れない。
- 登録時に RSS を即時取得し、記事が0件 / 取得失敗ならフィードを作らない。
- 1ユーザーの登録上限 `MAX_FEEDS_PER_USER = 50`。同一 URL の重複登録は不可。
- URL は http/https のみ。SSRF 対策で内部 IP(プライベート/ループバック/リンクローカル/メタデータ)宛ては拒否(`lib/http/safe-url.ts`)。取得時はリダイレクトを自動追従せず、転送先も毎回同じ検証を通してから辿る(最大 5 回。`safeFetch` の `guardUrl`)。
- 取得は登録時の即時 + 定期バッチ `trigger/fetch-user-feeds.ts`(毎時 :15)。

## フィルタ(サイドバー / チップ / シート)

- マイフィードは企業と並ぶ**フィルタ源**として `?feed=<id>,<id>` で絞り込める(ADR-0014)。
- 源スコープの意味づけ:
  - `?company` のみ → 選択企業の公開記事のみ(マイフィード記事は出さない)
  - `?feed` のみ → 選択マイフィードの記事のみ(公開記事は出さない)
  - 両方 → 選択企業の公開記事 + 選択マイフィードの記事
  - 無指定 → 購読企業全部 + 有効マイフィード全部
- UI: サイドバー「マイフィード」セクション(lg+、件数付き・単一リンク) / モバイルの絞り込みシート「マイフィード」セクション(複数選択) + 適用中チップ / タブレットツールバーの「マイフィード」ドロップダウン。いずれもログイン&登録済みのみ表示。
- `?feed` フィルタも新着順・フィルタ/検索なしの主経路でのみ作用する(popular/検索/既読フィルタでは無視)。

## メインフィードへの反映

- マージは **新着順(latest)・フィルタ/検索なし**の主経路のみ(ADR-0014)。`popular`・検索・未読/既読フィルタでは公開記事のみ。
- 合成点は app 層 [feed-load-more.tsx](../../components/article/feed-load-more.tsx): ログイン + 上記条件で
  `getEnabledUserFeedIds` を取り、非空なら `getMergedFeed` 経路へ。`feed` feature は `user-feeds` を import せず、
  マージは `feed` の Repository が `user_feed_articles` を UNION ALL して行う。
- ユーザー記事の表示: フィードタイトルを「企業名」位置に出し、ファビコンは記事 URL から導出。

## エッジケース

- 取得失敗 → 登録時はエラートースト(フィードは作らない)。更新時は `last_error` に残して UI に表示。
- フィード削除 → `user_feed_articles` も CASCADE で削除。
- 全フィード OFF → マージ対象なし(公開記事のみ表示)。

## スコープ外(MVP 後)

- 検索・未読/既読フィルタ経路へのマージ、popular でのスコア付与
- ユーザー記事のはてブ/閲覧メトリクス・OGP 画像補完
- フィードの共有(プライベート→公開昇格)

## 関連

- 機能: feed(マージ先), auth(ログイン必須), subscriptions(同じ設定画面・購読は企業フィルタ)
- ADR: [0014](../adr/0014-user-private-rss-feeds.md)
