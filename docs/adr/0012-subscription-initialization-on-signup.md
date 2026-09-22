# ADR-0012: 初回ログイン時の subscriptions 初期化を better-auth フックで行う

- **状態**: Accepted
- **決定日**: 2026-06-02
- **関連**: ADR-0010(レイヤード+ヘキサゴナル), ADR-0009(データモデル)

## 背景

`docs/features/subscriptions.md` のビジネスルールにより、ユーザーは初回ログイン時に全有効企業を `enabled=true` で購読した状態になる必要がある(明示的INSERT方式。`db/schema/subscriptions.ts` のコメント参照)。これがないと新規ユーザーのフィードは空になる。

初回ログインの契機は Better Auth のユーザー作成であり、`databaseHooks.user.create.after` で捕捉する。問題は初期化の INSERT ロジックをどこに置くか。仕様上は `features/subscriptions` の application usecase が望ましいが、フックは Better Auth 設定(`lib/auth.ts`)内に書く必要があり、ADR-0010 で **`lib → features` の import は禁止**されている。

## 検討した選択肢

### A. lib の横断 infra ヘルパーに置く

- `lib/initialize-user-subscriptions.ts` を新設し、`db` と `db/schema` を直接使って bulk INSERT。`lib/auth.ts` のフックから呼ぶ。
- メリット: `lib → db` のみで depcruise 準拠。変更が `lib/` に閉じ、最小・自己完結。`lib` は元々「横断的 infrastructure」(AGENTS.md)で `db` 依存も既存。
- デメリット: 仕様が想定する `features/subscriptions/application` ではなく `lib` に初期化ロジックが置かれる。

### B. sink 注入(AGENTS.md の「保存処理は sink 注入で受け取る」)

- `features/subscriptions` に usecase + repository を作り、`lib/auth.ts` は注入されたコールバックを呼ぶ。composition root で配線。
- メリット: 仕様のレイヤー配置に忠実。
- デメリット: `auth` は module const で route / `features/auth/server.ts` から直接 import されるため、注入には可変モジュール状態か factory 化が必要で間接層・変更ファイルが増える。現スコープ(初期化フックのみ)に対して過剰。

## 決定

**A を採用**。初期化 INSERT は `lib/initialize-user-subscriptions.ts`(横断 infra)に置き、`lib/auth.ts` の `databaseHooks.user.create.after` から呼ぶ。`subscriptions_user_company_uq` により冪等。失敗してもユーザー作成/ログインは止めず、`logger.error` で記録するに留める(冪等なので後続の企業追加JOB/再ログインで回復可能)。

将来 `features/subscriptions` 本体(トグルUI・`getEnabledCompanyIds` 等)や新企業バックフィルの `jobs/initialize-user-subscriptions.ts` を作る際は、この lib ヘルパーを共有/再利用する。

## 結果

- ✅ `lib → db` のみでアーキ規約(ADR-0010)に違反せず、`bun run depcruise` が通る
- ✅ 変更が `lib/` とドキュメントに閉じ、PR(auth 配線)とも非衝突
- ✅ 冪等な単一 INSERT で neon-http のトランザクション非対応制約に適合
- ⚠️ 初期化ロジックが仕様の想定(features 層)と異なり lib に存在する。features/subscriptions 実装時に共有方針を再確認する
- ❌ 初期化失敗時はその場ではリトライせずログのみ(購読ゼロのまま。回復は後続契機に委ねる)

## 関連リソース

- `lib/initialize-user-subscriptions.ts`
- `lib/auth.ts`(`databaseHooks.user.create.after`)
- `docs/features/subscriptions.md` / `docs/features/auth.md`
