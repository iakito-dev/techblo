# Feature: subscriptions(購読企業設定)

## 概要

ユーザーがどの企業の記事をフィードに表示するかを選択する。企業マスタは運営が管理(`scripts/seed.ts`)し、ユーザーは各企業のON/OFFを切り替えられる。

## ユーザーストーリー

- ログインユーザーとして、興味のない企業を非表示にしたい
- ログインユーザーとして、購読設定を後から変更したい

## 画面/UI

- 設定画面の「表示する企業」セクション(`SettingsSection` 構造)。デスクトップは `/settings`(設定全体を 1 ページに描画し `#companies` で該当セクションへ)、モバイルは設定メニューから `/settings/companies`
- 見出しに表示状況「表示する企業(24/26)」を表示(以前の呼称は「購読企業」。コード・テーブル名は `subscriptions` のまま)
- 2カラムグリッドのカード型セル(ファビコン + 企業名 + トグル)。OFF でフィードから除外
  - 企業の視覚表現はサイドバー・記事カードと同じファビコン(`CompanyFavicon`)に統一(色ドット廃止)
  - URL は常時表示せずセルの title 属性(hover)で表示
  - セル全体クリックでもトグル切替。OFF 行は opacity を下げて沈める
- 一覧の並びはログイン版・ゲスト版とも企業名順(`shared/company-name-order.ts` の日本語照合。大文字小文字を区別せず英字 → かな・漢字)。以前はログイン版が DB の `ORDER BY name`(C 照合のバイト順で「AWS Japan」が「Anthropic」より前、`freee`・`mercari` など小文字始まりが `ZOZO` の後ろ)、ゲスト版がサイドバーと同じ記事数順で、登録すると並びが変わった
- リスト上部(sticky)に企業名のインクリメンタル検索(lg+ のみ。モバイルは縦 1 カラムで一覧でき一括操作を主にするため出さない)+「すべて表示 / すべて非表示」の一括操作(すべてOFF は確認ダイアログ `AllOffDialog`。ログイン版・ゲスト版で共用。以前はゲスト版だけ確認が無く、1 タップで全社が非表示になりフィードが空になっていた)
- トグル変更は楽観更新。成功時はトグル横に一瞬チェック、失敗時はロールバック + エラートースト
- レスポンシブ: 〜767px は1カラム、768px(md)〜 は2カラム。コンテナは max-w-[52rem] 左寄せ
- ゲスト(未ログイン)も `/settings` にアクセス・購読編集できる。状態は Cookie(`techblo.guest.unsubscribed` = OFF にした slug 群、未設定=全社購読。旧名 `corpex.guest.unsubscribed` は後方互換で読み込む)に保存し、サーバーのフィード取得(`getFeedPageData` の guest 経路 / `getFeedFilterCompanies`)が同 Cookie を読んでスコープを揃える。UI は `GuestSubscriptionList`(`useGuestSubscriptions`)、ログイン版と同じ見た目だが Server Action ではなく Cookie に書き、`router.refresh()` でフィードへ即反映(bookmarks/favorites と同じゲスト永続パターン。ADR-0017)
- ログイン時は `GuestSavesMigrator` が Cookie の OFF 指定を `migrateGuestSubscriptions` で DB へ反映(サインアップは全社 ON 初期化なので OFF 分のみ落とす)し、Cookie をクリアする

## データモデル

```ts
// db/schema/subscriptions.ts
subscriptions: {
  id: uuid(PK)
  user_id: uuid(FK → users, ON DELETE CASCADE)
  company_id: uuid(FK → companies, ON DELETE CASCADE)
  enabled: boolean (default true)
  created_at: timestamptz
  updated_at: timestamptz
  // UNIQUE (user_id, company_id)
}
```

## API / Server Action

> シグネチャは公開 API の形を示す。実装は application 層の usecase、DB アクセスは infrastructure 層の Repository。`web/queries.ts` は composition root。

```ts
// features/subscriptions/web/queries.ts
listUserSubscriptions({ userId }): Promise<Result<UserSubscription[], ...>>
getEnabledCompanyIds({ userId }): Promise<Result<string[], ...>>

// features/subscriptions/web/actions.ts
toggleSubscription({ companyId }): Promise<Result<{ enabled: boolean }, ...>>
initializeSubscriptions({ userId }): Promise<Result<void, ...>>
  // 初回ログイン時に全企業をenabled=trueでINSERT
```

> **実装状況(初期化)**: 初回ログイン時の初期化は、`features/subscriptions` 本体に先行して
> `lib/initialize-user-subscriptions.ts`(`initializeUserSubscriptions(db, userId)`)として実装済み。
> Better Auth の `databaseHooks.user.create.after`(`lib/auth.ts`)が契機。
> `lib → features` import 禁止(ADR-0010)のため lib の横断 infra に配置している(ADR-0012)。

> **実装状況(/settings 購読 UI)**: 実装済み。
> - 読み取り: `features/subscriptions/web/queries.ts` の `getSubscriptionSettings(userId)`
>   (`listSubscriptions` usecase + `mergeSettings`。状態行が無い企業はデフォルト ON)
> - 更新: `features/subscriptions/web/actions.ts` の `toggleSubscriptionAction({ companyId, enabled })`
>   (セッションは features 間 import 回避のため `lib/auth` から直接取得。ADR-0002)
> - 画面: `app/(app)/settings/companies/page.tsx`+ `web/components/subscription-list|toggle`

> **実装状況(フィード反映)**: 実装済み。
> - `features/subscriptions/web/queries.ts` の `getEnabledCompanyIds(userId)` が購読 ON の企業 id を返す。
> - `app/_composition/article/feed-load-more.tsx` の `resolveCompanyScope`(app 層の合成点。`getFeedPageData` と
>   棚表示の `getSectionsPageData` が共用)が、ログイン時は `getEnabledCompanyIds`、ゲストは Cookie
>   (`techblo.guest.unsubscribed`)から表示対象の企業 id を解決する。`features/feed` は subscriptions を import しない(ADR-0002)。
> - ゲストで Cookie 未設定なら絞り込みなし(全企業)。全 OFF(ログイン=購読 0 件 / ゲスト=全社 OFF)は `allOff` を返し、
>   フィードは記事を取得せず空状態(`FeedAllOffEmptyState`)を出す(article repo は空配列を「フィルタなし=全件」と
>   解釈するため `[]` を渡さない)。

## ビジネスルール

- ログイン時は DB(`subscriptions`)、ゲストは Cookie に保存する(ADR-0017。ログイン時に Cookie の OFF 指定を DB へマージ)
- 初回ログイン時に全企業を `enabled=true` で自動INSERT(`initializeUserSubscriptions`、`subscriptions_user_company_uq` で冪等。ADR-0012)。失敗してもログインは止めず error ログのみ
- 新企業が追加された場合: 既存ユーザーにも表示 ON で出る。行を挿入するジョブは無く、状態行が無い企業はデフォルト ON として扱う(`mergeSettings` / `getEnabledCompanyIds`)
- ゲストは Cookie に OFF 指定が無い企業をすべて表示する

## エッジケース

- 表示する企業をすべて OFF にした場合 → フィードに「表示する企業がありません」+「表示する企業を選ぶ」(`/settings/companies#companies`)の空状態。OFF にする前に確認ダイアログ(`AllOffDialog`)を挟む
- 企業が削除された場合 → subscriptions も CASCADE で削除

## メトリクス

PostHog のイベント(一覧と規約は [observability.md §4](../architecture/observability.md)):

| イベント | プロパティ | 発火 |
|---|---|---|
| `subscription_added` / `subscription_removed` | companyId(ゲストは null), companySlug, isGuest, bulk | `SubscriptionList`(Server Action 成功後)/ `GuestSubscriptionList`(Cookie 書き込み時)。`features/subscriptions/web/track-subscription.ts`。「すべて表示/非表示」は実際に変わった企業ごとに bulk=true で送る |

- 平均購読企業数
- 最も非購読されている企業(品質改善の指標)

## 関連

- 機能: feed(購読設定の利用先)
- 機能: auth(初回ログイン時のinitialize)
