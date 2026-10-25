# コーディング規約

## 1. TypeScript

- `strict: true` 必須
- `any` 禁止 → `unknown` + 絞り込みで対処
- 型は **Zodスキーマから派生**: `type X = z.infer<typeof xSchema>`
- 関数の引数/戻り値には明示的な型(推論に頼りすぎない)
- enum は禁止 → `as const` + union type

```ts
// ❌
enum Status { Active, Inactive }

// ✅
const STATUS = ['active', 'inactive'] as const;
type Status = typeof STATUS[number];
```

## 2. 命名

| 対象 | 規則 | 例 |
|---|---|---|
| ファイル | kebab-case | `article-card.tsx` |
| コンポーネント | PascalCase | `ArticleCard` |
| 関数・変数 | camelCase | `fetchArticles` |
| 定数 | UPPER_SNAKE | `MAX_PAGE_SIZE` |
| 型・interface | PascalCase | `ArticleInput` |
| Hook | use-プレフィクス | `use-bookmark.ts` / `useBookmark` |
| Server Action | 動詞始まり | `createBookmark`, `removeBookmark` |
| Query | get/list 始まり | `getFeed`, `listBookmarks` |

## 3. インポート/エクスポート

- **named export を優先**(default export は Next.js の page/layout のみ)
- バレル(`index.ts`)は使わない(Tree shaking と import解析が遅くなる)
- import 順序(Biomeが自動整列):
  1. node標準
  2. 外部パッケージ
  3. `@/` 始まりの内部モジュール
  4. 相対パス
  5. 型のみ import

## 4. エラーハンドリング

- **throw しない**。`Result<T, E>` を返す
- 例外は最上位の error boundary でのみ捕捉
- ユーザー入力エラーは Zod の parse fail として表現

```ts
// shared/result.ts
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

## 5. 非同期処理

- Promise を **await せず投げっぱなしにしない**(`void` 明示で意図を示す場合は除く)
- `Promise.all` は失敗で全停止 → 一部失敗を許容するなら `Promise.allSettled`
- タイムアウトを明示(`AbortSignal.timeout(10_000)`)

## 6. React/Next.js

- Server Component がデフォルト
- `'use client'` は最小範囲(コンポーネントを分割して境界を狭く)
- 状態管理は **Server Actions + useOptimistic** で大半解決、足りなければ TanStack Query
- Zustand は **本当にクライアント横断状態が必要な時のみ**
- `useEffect` は **データfetchに使わない**(RSC で取得)

## 7. コメント

- **Whatは書かない**(コードが説明する)
- **Whyのみ書く**(非自明な制約・最適化・バグ回避)
- TODO/FIXMEは禁止 → GitHub Issue で管理

```ts
// ❌ Whatコメント
// ユーザーIDを取得
const userId = session.user.id;

// ✅ Whyコメント
// Better Auth は session.user が常に存在することを保証するが、TypeScriptは推論できない
const userId = session.user!.id;
```

## 8. テスト

- ユニットテスト: `features/*/policies.ts` と `lib/` の純粋関数を中心に
- 統合テスト: Server Action はテスト用 DB(`TEST_DATABASE_URL`)で実行
- E2E: 主要シナリオ(閲覧 → ログイン → ブックマーク)のみ
- テストファイル名: `xxx.test.ts` を実装の隣に配置(`__tests__/` フォルダは使わない)

## 9. Git/コミット

- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
- 1コミット1論理変更
- メッセージ言語: **日本語**(プロジェクト現状)

## 10. 禁止事項リスト

| 禁止 | 代替 |
|---|---|
| `any` | `unknown` + 絞り込み |
| `as` (型assertion) | 型ガード関数 |
| `enum` | `as const` + union |
| `index.ts` (バレル) | 個別 named import |
| `throw` | Result型 |
| `console.log` 本番残し | observability/logger |
| `useEffect` でfetch | RSC または TanStack Query |
| ORM型を上層に漏らす | domain / application の型で再定義し、infrastructure の mapper で変換 |
