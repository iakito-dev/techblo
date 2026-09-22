# データモデル原則

## 1. 命名

- テーブル名は **snake_case の複数形**: `articles`, `bookmarks`, `companies`
- カラム名は **snake_case**: `created_at`, `last_fetched_at`
- 主キーは **`id`**(UUID v4 を MVP では使用、将来 v7 対応検討)
- 外部キーは **`{table}_id`**: `user_id`, `article_id`, `company_id`

### 例外: Better Auth 管理テーブル

以下は Better Auth の規約に従う(ADR-0009):
- テーブル名は **単数形**: `user`, `session`, `account`, `verification`
- 主キーは **text 型(cuid2)**
- カラム名は Drizzle 側で camelCase、DB側で snake_case にマッピング

## 2. 必須カラム

すべてのテーブルに以下を含める:

| カラム | 型 | 用途 |
|---|---|---|
| `id` | uuid | 主キー(UUID v7) |
| `created_at` | timestamptz | 作成日時 |
| `updated_at` | timestamptz | 更新日時(triggerで自動更新) |

論理削除が必要なテーブルのみ:
| `deleted_at` | timestamptz nullable | 論理削除日時 |

## 3. インデックス

- 外部キーには **必ずインデックス**
- WHERE句で頻繁に使う列にもインデックス
- ソートに使う列に複合インデックス: `(user_id, created_at desc)`
- N+1にならないよう、結合キーを先に検討

## 4. 制約

- 外部キーには **常に ON DELETE 指定**(CASCADE / SET NULL / RESTRICT を明示)
- NULL を避けたいカラムは `NOT NULL` + デフォルト値
- UNIQUE制約は **アプリ層に頼らず DB で**

## 5. マイグレーション

- Drizzle の migration ファイルは **絶対に手動編集しない**
- スキーマを変更してから `drizzle-kit generate`
- 本番反映前に `drizzle-kit migrate` をテスト用 DB(`TEST_DATABASE_URL`)で検証

## 6. データ型の選択

| 用途 | 型 |
|---|---|
| ID | `uuid` (UUID v7) |
| 日時 | `timestamptz`(timezone付き、必ず UTC で保存) |
| 真偽 | `boolean`(NOTNULL + DEFAULT) |
| 短いテキスト | `text`(`varchar(n)` は使わない、Postgresは長さ制限不要) |
| 長いテキスト | `text` |
| URL | `text` + Zod validation |
| 列挙値 | Postgres `enum` または `text CHECK (col IN (...))` |
| JSON | `jsonb`(`json` は使わない、jsonbの方が効率的) |

## 7. 個人化データの境界

| データ | テーブル | スコープ |
|---|---|---|
| 記事 | `articles` | 全ユーザー共通 |
| 企業 | `companies` | 全ユーザー共通 |
| ブックマーク | `bookmarks` | user_id 紐付け |
| お気に入り | `favorites` | user_id 紐付け |
| 購読 | `subscriptions` | user_id 紐付け |
| クリック数 | `articles.view_count` | 全体集計 |

ユーザー削除時は CASCADE で個人データを連動削除。

## 8. クエリ性能

- 取得対象が1万件超えそうな箇所はページネーション必須
- N+1 を避ける(Drizzle の `with` で JOIN、または `inArray` でバッチ)
- 個人化フィルタリングは DB 側で(`WHERE user_id = $1`)、アプリ側でフィルタしない

## 9. Drizzle 流儀

- スキーマは `db/schema/{name}.ts` に1ファイル1テーブル
- リレーションは `relations()` で定義し、`with` で取得
- クエリビルダで書ききれない複雑なものは `sql` template literal(エスケープ注意)

## 10. データ正規化レベル

- 第3正規形を基本(冗長性を避ける)
- ただし **読み取りパフォーマンスのための非正規化は許容**(企業ロゴ等のキャッシュ値)
- 非正規化する場合は更新時の整合性をJOBで担保

## 関連ADR

- データモデル確定後に `docs/adr/0007-data-model.md` で記録(未作成)
