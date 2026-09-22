# ADR-0002: Feature-sliced アーキテクチャ

- **状態**: Accepted
- **決定日**: 2026-05-28

## 背景

Next.js プロジェクトでよく見るディレクトリ構造には複数のパターンがある:

1. 技術別(`controllers/`, `services/`, `repositories/`)
2. ページ別(`pages/foo/...`, `pages/bar/...`)
3. 機能別(`features/foo/`, `features/bar/`)

長期保守性とAIアシスタントとの相性を考慮した選択が必要だった。

## 検討した選択肢

### A. 技術別レイヤー(Clean Architecture フル実装)

- 役割分担明確
- ファイル数が多くなりすぎる
- 1機能の変更で複数フォルダを編集する必要あり

### B. ページ別

- Next.js App Router の自然な構造
- 機能を横断する処理(複数ページから使うqueriesなど)の置き場所が曖昧
- コンポーネントの再利用が困難

### C. Feature-sliced

- 1機能 = 1フォルダ(types/queries/actions/components 同居)
- 機能の追加・削除が局所的
- 機能間の依存関係が明示的(features/A から features/B を import 禁止で凝集度up)

## 決定

**C. Feature-sliced** を採用。

```
features/
  feed/
    types.ts        # Zod schemas
    queries.ts      # 読み取り
    actions.ts      # Server Actions
    policies.ts     # 認可ルール
    components/     # UI
  bookmarks/
  favorites/
  subscriptions/
  auth/
```

加えて以下のルール:
- `features/A` は `features/B` を import しない
- 共有が必要なら `shared/` または `components/ui/` に上げる
- `app/` からは features/queries.ts と features/actions.ts のみ呼ぶ
- `db/` への直接アクセスは features/*/queries.ts に限定

## 結果

- ✅ 機能単位の変更が1フォルダに閉じる
- ✅ AIアシスタントが「この機能」のコンテキストを把握しやすい
- ✅ 削除・置き換えが容易(フォルダごと削除可能)
- ⚠️ features 間で似た処理が重複する可能性 → 抽象化のタイミングを慎重に
- ⚠️ 共有コンポーネントとfeature固有コンポーネントの判断が必要

## 関連リソース

- [ARCHITECTURE.md](/ARCHITECTURE.md)
- [docs/principles/architecture.md](../principles/architecture.md)
