# アーキテクチャ原則

Techblo の構造に関する不変の原則。すべての設計判断の出発点。

## 1. 4層レイヤード構造

```
Presentation     ← UI (RSC, Client Components)
   ↓ depends on
Application      ← Use cases (Server Actions, Queries)
   ↓ depends on
Domain           ← Business rules (Zod schemas, policies)
   ↓ depends on
Infrastructure   ← External (DB, Auth, RSS, AI, Observability)
```

- **依存方向は固定**。逆流(下層が上層を import する)は禁止。
- 各レイヤー間のやり取りは **Zodで型付けされたPure Object** で行う。ORMオブジェクトをそのまま上層に渡さない。

## 2. Feature-sliced

- ディレクトリは **機能単位**(`features/feed/`, `features/bookmarks/`...)
- 技術別フォルダ(`controllers/`, `services/`, `models/`)は使わない
- `features/A` は `features/B` を import しない(横の依存禁止)
- 共有が必要なら `shared/` か `components/ui/` に上げる

## 3. Server-first

- デフォルトは Server Component
- `'use client'` は本当に必要な時(イベントハンドラ・状態・useEffect)だけ
- ミューテーションは Server Action(`features/*/actions.ts`)
- 読み取りは `features/*/queries.ts` のRSCから呼出

## 4. 失敗を正常系として扱う

- RSS取得失敗、OGP取得失敗は **期待される事象**。例外で表現しない
- すべての外部呼び出しは `Result<T, E>` を返す
- リトライ可能な単位で分割(1社失敗が全体を止めない)

## 5. キャッシュは積極的に、ただし境界を明確に

- 公開データ(未ログインで見えるもの)は edge cache
- 個人化データ(ブックマーク等)は **キャッシュしない**
- DBレベルとアプリレベルのキャッシュを混在させない

## 6. 観測可能性は設計時に組み込む

- すべての Server Action は実行時間と成否を記録
- 外部呼び出しは Span を切る
- エラーは throw ではなく Result で返し、logger に context 付きで残す(Sentry は未導入)
- ユーザー行動は PostHog にイベントとして送る

## 7. ベンダーロックを避ける

- DBアクセスは **必ず** `features/*/infrastructure/` の Repository 経由(`db/` 直叩きは infrastructure 層のみ。ADR-0010)
- 認証は `features/auth/` 経由(Better Auth → Clerk 等への乗換え可)
- 外部サービスは `lib/` でラップ(Trigger.dev → Inngest 等への乗換え可)
- Postgres標準SQLに依存(特定ベンダー固有機能は最小限)

## 8. 1機能 = 1コミット範囲

- 機能追加・修正は **`features/{name}/`** に閉じることを目指す
- `db/schema/`, `app/`, `components/ui/` への横断変更が多発する設計は見直し

## 関連ADR

- `0002-feature-sliced-architecture.md`
- `0003-server-first-no-separate-api.md`
