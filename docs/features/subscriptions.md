# Feature: subscriptions(購読企業設定)

## 概要

ユーザーがどの企業の記事をフィードに表示するかを選択する。MVPでは6社固定だが、各企業のON/OFFを切り替え可能。

## ユーザーストーリー

- ログインユーザーとして、興味のない企業を非表示にしたい
- ログインユーザーとして、購読設定を後から変更したい

## 画面/UI

- 設定画面 `/settings` の「購読企業」セクション(`SettingsSection` 構造。将来「通知」等を追加可能)
- 見出しに購読状況「購読企業(24/26)」を表示
- 2カラムグリッドのカード型セル(ファビコン + 企業名 + トグル)。OFF でフィードから除外
  - 企業の視覚表現はサイドバー・記事カードと同じファビコン(`CompanyFavicon`)に統一(色ドット廃止)
  - URL は常時表示せずセルの title 属性(hover)で表示
  - セル全体クリックでもトグル切替。OFF 行は opacity を下げて沈める
- リスト上部(sticky)に企業名のインクリメンタル検索 + すべてON/OFF 一括操作(すべてOFF は確認ダイアログ)
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
> - 画面: `app/settings/page.tsx`(`requireSession` 必須)+ `web/components/subscription-list|toggle`

> **実装状況(フィード反映)**: 実装済み。
> - `features/subscriptions/web/queries.ts` の `getEnabledCompanyIds(userId)` が購読 ON の企業 id を返す。
> - `app/page.tsx` の `SubscribedFeed`(app 層の合成点)が `getSession` → `getEnabledCompanyIds` →
>   `FeedGrid` の `companyIds` prop へ渡す。`features/feed` は subscriptions を import しない(ADR-0002)。
> - 未ログインは全企業表示。全 OFF(空配列)は `getFeed` を呼ばず空状態 +`/settings` 導線
>   (article repo は空配列を「フィルタなし=全件」と解釈するため `[]` を渡さない)。

## ビジネスルール

- ログイン必須
- 初回ログイン時に全企業を `enabled=true` で自動INSERT(`initializeUserSubscriptions`、`subscriptions_user_company_uq` で冪等。ADR-0012)。失敗してもログインは止めず error ログのみ
- 新企業が追加された場合: 既存ユーザーには `enabled=true` でデフォルトON(企業追加時のJOBで挿入)
- 未ログインユーザーは全企業を表示(subscriptionsを参照しない)

## エッジケース

- 全企業の購読をOFFにした場合 → フィードに「すべての購読がOFFです」と表示、設定画面への導線
- 企業が削除された場合 → subscriptions も CASCADE で削除

## メトリクス

- 平均購読企業数
- 最も非購読されている企業(品質改善の指標)

## 関連

- 機能: feed(購読設定の利用先)
- 機能: auth(初回ログイン時のinitialize)
