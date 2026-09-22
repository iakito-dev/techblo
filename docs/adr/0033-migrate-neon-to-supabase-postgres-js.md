# ADR-0033: DB を Neon から Supabase(東京)へ移行・postgres-js ドライバ化

- **状態**: Accepted
- **決定日**: 2026-06-21
- **関連**: ADR-0001(技術スタック / 一部更新), ADR-0009(データモデル・ドライバ選択 / 一部更新)

## 背景

ADR-0001 では DB に Neon、ドライバに `drizzle-orm/neon-http`(ADR-0009)を採用していた。
運用に向けて以下の課題が顕在化した:

- **リージョン整合**: Vercel 関数を `hnd1`(東京)へ寄せる(#165)一方、DB のリージョンも東京に colocate したい。レイテンシは「アプリ↔DB」の往復が支配的で、同一リージョンが効く。
- **HTTP ドライバの制約**: `neon-http` は Edge 対応だが**トランザクション非対応**。各 Repository を単一 upsert / CTE で書く制約を負っていた(ADR-0009 #7)。
- **接続モデル**: Serverless から多数の短命接続が張られるため、プーラ(pgbouncer)経由の接続が望ましい。

## 検討した選択肢

### A. Neon 継続(現状維持)

- DB branching が PR フローに馴染む
- ただし東京リージョン colocate と、トランザクション対応の両立が課題
- neon-http のトランザクション非対応制約が残り続ける

### B. Supabase(東京)+ postgres-js(採用)

- 東京リージョンで Vercel `hnd1` と colocate でき低レイテンシ
- `postgres-js` は**トランザクション対応**(`db.transaction()` が使える)
- Transaction Pooler(pgbouncer, port 6543)経由で Serverless の接続増に対応
- 認証・Storage 等の Supabase 機能を将来使える余地
- ⚠️ pgbouncer は prepared statement を共有できないため `prepare: false` が必須
- ⚠️ Neon の per-PR DB branching に相当する開発フローは失われる

## 決定

**B. Supabase(東京)+ `drizzle-orm/postgres-js`** を採用(#163, #165)。

`db/client.ts` の実装方針:

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Transaction Pooler(pgbouncer, port 6543)経由を想定。
// pgbouncer は prepared statement を共有できないため prepare: false が必須。
// Serverless(Vercel)では接続が増えるため max は控えめに。
const client = postgres(databaseUrl, { prepare: false, max: 1 });
export const db = drizzle(client, {
  logger: process.env.NODE_ENV === 'development',
});
```

## 結果

- ✅ Vercel(東京 `hnd1`)と DB(Supabase 東京)が colocate し往復レイテンシが縮む
- ✅ `postgres-js` でトランザクションが使える(マルチテーブル更新を素直に書ける)
- ✅ pgbouncer 経由で Serverless の接続増に耐える
- ⚠️ `prepare: false` が必須(pgbouncer 制約)。`max` は控えめに設定
- ⚠️ **Neon の DB branching は失われた**。CI / テスト用 DB は別インスタンス(`TEST_DATABASE_URL`)を用意する方式に変わる(per-PR 自動ブランチは無し)
- ⚠️ 既存 Repository は neon-http 時代の単一 upsert / CTE のまま動作する(互換)。トランザクションが書けるようになったため、必要に応じて簡素化してよい(必須ではない)

## ADR-0001 / ADR-0009 への影響

- **ADR-0001**: 採用スタックの「Neon」は Supabase(東京)に置き換わる。`neon-http` 由来の記述・DB branching を前提とした開発体験の記述は本 ADR で更新される(ADR-0001 本体は歴史的記録として保持)。
- **ADR-0009 #7(ドライバー選択)**: `neon-http`(トランザクション非対応)→ `postgres-js`(トランザクション対応)に更新。「neon-http のトランザクション非対応 → 設計時に意識が必要」の制約は解消。

## 関連リソース

- `db/client.ts` — 接続設定
- PR #163(Supabase 移行 / postgres-js 化), #165(Vercel `hnd1` 東京移動)
- ADR-0001 — 技術スタック選定
- ADR-0009 — データモデル設計(ドライバー選択)
