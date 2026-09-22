# ADR-0009: データモデル設計

- **状態**: Accepted(ドライバ #7 は neon-http → postgres-js へ移行。ADR-0033 で更新)
- **決定日**: 2026-05-28
- **関連**: ADR-0001, ADR-0006, ADR-0033

## 背景

機能が確定した時点でデータモデルを定義する必要があった。
Better Auth と Drizzle ORM の規約のすり合わせ、カウンターの正規化レベル、ID戦略などを決定する必要があった。

## 決定内容

### テーブル構成

```
companies        ─┬─< articles ─┬─< bookmarks
                  │              └─< favorites
                  └─< subscriptions >─┐
                                      │
user (Better Auth)─< sessions         │
       │            ─< accounts       │
       │            ─< subscriptions ─┘
       │            ─< bookmarks
       │            ─< favorites
       │
verification (Better Auth)
```

### ER図

```
┌─────────────────────┐         ┌──────────────────────┐
│ companies           │         │ articles             │
│ ─────────────────── │         │ ──────────────────── │
│ id (uuid PK)        │←────────│ company_id (uuid FK) │
│ name                │ 1:N     │ id (uuid PK)         │
│ slug (UNIQUE)       │         │ url (UNIQUE)         │
│ rss_url             │         │ title                │
│ site_url            │         │ description          │
│ brand_color         │         │ og_image             │
│ enabled             │         │ published_at         │
│ last_fetched_at     │         │ view_count           │
│ last_error          │         │ bookmark_count       │
│ ...                 │         │ favorite_count       │
└─────────────────────┘         │ deleted_at           │
        ↑                       └──────────────────────┘
        │ 1:N                            ↑   ↑
        │                                │   │ N:1
┌────────────────────┐                   │   │
│ subscriptions      │                   │   │
│ ────────────────── │                   │   │
│ id (uuid PK)       │                   │   │
│ user_id (text FK)  │←──┐               │   │
│ company_id (uuid)  │   │               │   │
│ enabled            │   │               │   │
│ UNIQUE(u_id, c_id) │   │               │   │
└────────────────────┘   │               │   │
                         │               │   │
┌────────────────────┐   │  ┌────────────┴───┴──┐
│ user (Better Auth) │←──┤  │ bookmarks         │
│ ────────────────── │   ├──│ ───────────────── │
│ id (text PK)       │   │  │ user_id (text FK) │
│ email (UNIQUE)     │   │  │ article_id (FK)   │
│ name               │   │  │ UNIQUE(u, a)      │
│ image              │   │  └───────────────────┘
│ onboarded_at       │   │
│ preferred_locale   │   │  ┌───────────────────┐
└────────────────────┘   │  │ favorites         │
        ↑                ├──│ (bookmarksと同形) │
        │ N:1            │  └───────────────────┘
        │                │
┌────────────────────┐   │
│ session            │───┤
│ account            │───┤
│ verification       │   │ (Better Auth管理)
└────────────────────┘
```

### 主要な決定ポイント

#### 1. IDの戦略

- **Better Auth管理テーブル**: `text` 型(cuid2、Better Auth がアプリレイヤーで生成)
- **自前テーブル**: `uuid v4`(Drizzle の `defaultRandom()` = `gen_random_uuid()`)

UUID v7(時系列ソート可)を将来検討するが、Postgres標準で生成できないため MVP では v4 で運用。

#### 2. テーブル名の規約

- **Better Auth管理**: 単数形(`user`, `session`, `account`, `verification`)— Better Auth 規約
- **自前テーブル**: 複数形(`companies`, `articles`, `bookmarks`, `favorites`, `subscriptions`)

`docs/principles/data.md` の「複数形」原則の例外として Better Auth テーブルを明示。

#### 3. 集計カラム(カウンター)

`articles.view_count` / `bookmark_count` / `favorite_count` を **正規化値として保持**。
理由:
- 「人気順」のソートを高速化したい
- 毎回 COUNT で集計するのはN+1の温床

トレードオフ:
- INSERT/DELETE 時に増減更新が必要(2クエリ)
- 並行更新で race condition で多少ズレる可能性
- → 夜次バッチで再計算する仕組みを後で導入

#### 4. 購読(subscriptions)の方式

「明示的INSERT方式」を採用(全 (user, company) ペアに行を持つ + enabled bool)。

代替案: 「非購読のみINSERT」(行の存在 = 非購読)。
不採用理由:
- 「初期は全部購読」を明示的に表現したい
- 将来「企業ごとの通知設定」等を追加しやすい
- 6社程度なら容量問題なし

#### 5. 論理削除

`articles.deleted_at` のみ用意。
他のテーブルは物理削除(CASCADE)で問題なし(ブックマーク削除等は完全削除でOK)。

#### 6. インデックス戦略

| クエリ | インデックス |
|---|---|
| 公開フィード(企業フィルタ + 新着順) | `articles(company_id, published_at desc)` |
| 全体新着順 | `articles(published_at desc)` |
| 人気順 | `articles(view_count desc, published_at desc)` |
| URL by upsert | `articles.url UNIQUE` |
| 有効企業フィルタ | `companies(enabled) WHERE enabled` (部分インデックス) |
| ユーザーの購読 | `subscriptions(user_id, enabled)` |
| ブックマーク一覧 | `bookmarks(user_id, created_at desc)` |
| お気に入り一覧 | `favorites(user_id, created_at desc)` |

#### 7. ドライバー選択

`drizzle-orm/neon-http` を採用。
- Edge Runtime 対応
- ただし**トランザクション非対応**
- マルチテーブル更新は CTE / 単一クエリで実現
- どうしても必要な場合は `neon-serverless` を別ドライバーとして用意

## 結果

- ✅ Drizzle スキーマファイル7つで完結
- ✅ Better Auth との衝突を最小化
- ✅ 人気順クエリが O(1) インデックスで返る
- ⚠️ カウンター値の race condition → バッチ再計算が必要
- ⚠️ neon-http のトランザクション非対応 → 設計時に意識が必要
- ❌ UUID v7 を使えない(Postgres標準では生成不可)

## 関連

- スキーマファイル: `db/schema/*.ts`
- `docs/principles/data.md` — データ原則
- `docs/architecture/backend.md` — DB アクセスパターン
- ADR-0006 — ブックマーク/お気に入り2階層
