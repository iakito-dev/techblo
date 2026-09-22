# 新機能を追加する手順

このプロジェクトに新しい機能を追加するときの標準手順。AIエージェントもこのガイドに従ってください。

## ステップ0: 必要性の確認

- [ ] 既存featureに収まる変更ではない(収まるなら拡張で対応)
- [ ] `docs/features/` に該当する機能が存在しない
- [ ] アーキテクチャ判断を伴う場合、ADRを書く必要があるか検討

## ステップ1: 仕様書を書く

`docs/features/{name}.md` をテンプレート(`docs/features/README.md`)に従って作成。
最低限以下を埋める:

- 概要(1-2文)
- ユーザーストーリー(1-3個)
- 画面/UIの配置場所
- 関連するDBテーブル

実装前に PR で確認してもらえると後戻りが少ない。

## ステップ2: アーキテクチャ判断があればADRを書く

以下のいずれかに該当する場合、`docs/adr/NNNN-xxx.md` を新規作成:

- 既存の選択を覆す
- 新しい外部サービス・ライブラリを導入する
- 既存のレイヤー構造に影響する
- ユーザー体験の大方針を決める

## ステップ3: DBスキーマを定義

```bash
# db/schema/{name}.ts を作成
# 例:
db/schema/bookmarks.ts
```

`docs/principles/data.md` の規約に従う:
- snake_case 複数形のテーブル名
- 必須カラム(id, created_at, updated_at)
- 外部キーには ON DELETE 指定
- インデックスを忘れずに

```bash
# マイグレーション生成
bun drizzle-kit generate

# テスト用 DB(TEST_DATABASE_URL)で適用してテスト
bun drizzle-kit migrate
```

## ステップ4: features/{name}/ を層構造で作成

feature 内部を4層に分ける(ADR-0010)。依存方向は内向きのみ:
`web / infrastructure → application → domain`。内側ほど外部依存が少なく、純粋でテストしやすい。

```
features/{name}/
├── domain/          # 外部依存ゼロの純粋 TS。drizzle/next/react を import しない
│   ├── {entity}.ts          # entity / value object
│   ├── {rule}.ts            # domain service・純粋関数(計算ルール等)
│   └── {x}-repository.ts    # Repository interface(Driven Port)
├── application/     # ユースケース。domain にのみ依存(依存は引数注入)
│   ├── {use-case}.ts        # 例: list-xxx.ts / create-xxx.ts
│   └── dto.ts               # Command/Query DTO + 表示 DTO + 変換関数
├── infrastructure/  # Driven Adapter。db を import してよい唯一の層
│   ├── drizzle-{x}-repository.ts  # Repository 実装
│   └── {x}-mapper.ts        # DB 行 → domain のマッピング
└── web/             # Driving Adapter(RSC/Client 境界)
    ├── queries.ts           # RSC が呼ぶ composition root(repo 組立→usecase→Result吸収)
    ├── actions.ts           # 'use server'(変更操作)
    ├── view-models/         # 表示状態の Client hook(use-xxx.ts)
    └── components/          # UI コンポーネント
```

認可ルールが必要なら `domain/policies.ts`(純粋関数)に置く。

### domain/{rule}.ts(純粋なビジネスルール → 単体テスト対象)

```ts
import type { Xxx } from './xxx';

// 計算ルールは SQL に直書きせず純粋関数に。infrastructure はこの定義を参照する
export const computeScore = (x: Xxx): number => /* ... */ 0;
```

### domain/{x}-repository.ts(Driven Port)

```ts
import type { Xxx } from './xxx';

// 実装は infrastructure。domain は実装を知らない
export interface XxxRepository {
  list(criteria: ListCriteria): Promise<Xxx[]>;
}
```

### application/{use-case}.ts(依存は引数注入 → DB なしでテスト可)

```ts
import { ok, type Result } from '@/shared/result';
import type { XxxRepository } from '../domain/xxx-repository';

export const listXxx =
  (deps: { xxx: XxxRepository }) =>
  async (input: ListXxxInput): Promise<Result<XxxDto[], XxxError>> => {
    const rows = await deps.xxx.list(/* ... */);
    return ok(rows.map(toXxxDto));
  };
```

### web/queries.ts(composition root。RSC から呼ぶ)

```ts
import { db } from '@/db/client';
import { listXxx } from '../application/list-xxx';
import { DrizzleXxxRepository } from '../infrastructure/drizzle-xxx-repository';

const xxxRepo = new DrizzleXxxRepository(db);

export async function getXxx(input: ListXxxInput): Promise<XxxDto[]> {
  const r = await listXxx({ xxx: xxxRepo })(input);
  if (!r.ok) throw new Error('取得に失敗しました'); // error.tsx へ
  return r.value;
}
```

### web/actions.ts

```ts
'use server';
import { requireSession } from '@/features/auth/server';
import { createXxx } from '../application/create-xxx';
// repo を組み立てて usecase に注入し、Result を返す(useActionState と整合)
```

## ステップ5: ページを作成

```
app/(public)/xxx/page.tsx       # 認証不要
app/(auth)/xxx/page.tsx          # 認証必須
```

- データ取得は features/{name}/web/queries.ts を呼ぶ
- フォームは features/{name}/web/actions.ts を `action` 属性に渡す
- ローディング状態は `loading.tsx`、エラーは `error.tsx`

## ステップ6: テスト

| 種別 | 必須度 | 対象 |
|---|---|---|
| Unit (Vitest) | 推奨 | `domain/`(純粋ルール)、`application/`(repo モックで usecase) |
| Integration (Vitest + Test DB) | 推奨 | `infrastructure/`(テスト用 DB / `TEST_DATABASE_URL`) |
| E2E (Playwright) | MVPは主要機能のみ | クリティカルパス |

## ステップ7: 観測・観測点を追加

- 重要なアクションは PostHog にイベント送信
- 失敗するかもしれない外部呼び出しは Sentry にcontext付きで記録
- ジョブ実行は Trigger.dev のダッシュボードで確認

## ステップ8: ドキュメント更新

実装後に以下を更新:

- [ ] `docs/features/{name}.md` の最終版を反映
- [ ] 仕様変更があれば `FEATURES.md` も更新
- [ ] スキーマ追加なら `docs/principles/data.md` の例を更新(必要なら)

## ステップ9: セルフレビュー

`AGENTS.md` のレビュー基準でセルフチェック:

- [ ] レイヤー境界を守っているか
- [ ] 型が Zod 由来か
- [ ] Server Action で認証チェックしているか
- [ ] Result型 で返しているか
- [ ] `'use client'` が必要最小限か
- [ ] コメントが Why のみか

可能なら `code-review` skill を実行して相互チェック。
