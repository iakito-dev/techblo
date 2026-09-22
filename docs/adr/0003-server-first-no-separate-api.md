# ADR-0003: Server-first(独立APIサーバーを持たない)

- **状態**: Accepted
- **決定日**: 2026-05-28
- **関連**: ADR-0001, ADR-0002

## 背景

Webアプリは典型的に「フロント + 独立APIサーバー」の構成を取るが、Next.js 16 + React 19 では Server Component + Server Actions で十分な機能を持つ。
個人開発でかつ MVP の機能規模では、独立APIサーバーが本当に必要かを判断する必要があった。

## 検討した選択肢

### A. Next.js + 独立APIサーバー(Hono / NestJS 等)

- バックエンド技術を分離してスケール時のフロント/バックを別チームで開発可能
- 個人開発では過剰、デプロイパイプライン2系統に
- 型共有のため tRPC や OpenAPI が別途必要

### B. Next.js Server Actions + Route Handlers のみ

- フロントとバックがコロケーション、型は自動共有
- Vercel Edge で実行、レイテンシ低
- スケール時に独立APIに分離するのは将来コスト

### C. tRPC

- 型安全な RPC、Next.js と相性良い
- Server Actions の登場で redundant 感
- フォームの送信等は Server Action の方が React 19 と統合的

## 決定

**B. Next.js Server Actions + Route Handlers** で完結させる。

- ミューテーション → Server Action(`features/*/actions.ts`)
- 読み取り → RSC で直接 queries 呼出
- 外部公開API(Trigger.dev webhook 等) → Route Handler

将来、独立APIサーバーが必要になった場合は `features/*/actions.ts` を Hono ハンドラーに移植する形でリファクタ可能(同じ型を共有)。

## 結果

- ✅ コード量が最小、型共有のオーバーヘッドなし
- ✅ React 19 の `useOptimistic` / `useActionState` と統合
- ✅ デプロイは Vercel1系統で済む
- ⚠️ スケール時に独立API化するコストがある
- ⚠️ Server Action は HTTP メソッドが POST 固定、純粋なRESTを期待するクライアントには別途Route Handlerが必要
- ❌ Native モバイルアプリを追加する場合は別途API層を追加する必要

## 関連リソース

- [Next.js Server Actions docs](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [docs/principles/architecture.md](../principles/architecture.md)
