# ADR-0044: 記事の横断合成を `components/article/` から `app/_composition/` へ移す

- **状態**: Accepted
- **決定日**: 2026-10-25
- **関連**: ADR-0013(記事に対する横断機能は app 層で合成する), ADR-0010(レイヤード+ヘキサゴナル), ADR-0020(shadcn/ui プリミティブ)

## 背景

ADR-0013 で「記事に対する横断機能(保存・購読・既読と記事の組み合わせ)は app 層で合成する」と決めたが、
実際の置き場所は `components/article/` だった。ここには次の2種類が混ざっていた。

- 複数 feature をまたぐ合成: Server Action(`feed-actions.ts` / `saved-articles-actions.ts` など)、
  データ取得(`feed-load-more.tsx` は 7 feature を import)、合成済みの一覧 UI
- feature に依存しない UI 部品: `company-favicon.tsx`

`features/feed` などが `company-favicon` や `feed-load-more` の型を import していたため、
「features → components/article → 他の features」という経路で feature 間の依存が間接的にできていた。
`bun run depcruise` は `features/A → features/B` の直接 import しか見ないので、これを検出できなかった。

## 検討した選択肢

### A. 合成を `app/_composition/` へ移し、UI 部品と型は内側へ下ろす(採用)

- `components/article/*` → `app/_composition/article/*`、サイドバーの composition root
  (`components/layout/sidebar.tsx`)→ `app/_composition/sidebar.tsx`
- `company-favicon.tsx` は `components/ui/` へ、フィルタ用の型(`FilterCompany` / `FilterUserFeed`)は
  `features/feed/web/view-models/feed-filter-options.ts` へ移す
- 「他の層から app を import しない」ルール(`no-import-app`)がそのまま「features / components から合成層を
  import しない」の機械チェックになる
- `_` 始まりのフォルダは Next.js のルーティング対象外(private folder)なので URL は増えない

### B. 配置はそのままで規約に明記する

- 差分ゼロだが、UI 部品置き場と合成層の混在と、features からの間接依存が残る

### C. トップレベルに `composition/` を新設する

- 役割は明確だが、ADR-0013 の「app 層で合成」とずれ、新しい最上位ディレクトリの概念が増える

## 決定

**A を採用**。ADR-0013 の決定を、ディレクトリ配置と depcruise ルールの両方で実態に合わせる。

## 結果

- ✅ `components/` は UI(ui / layout / seo / legal)だけになり、合成は `app/_composition/` に集まる
- ✅ features から合成層への逆流が `no-import-app` で自動的に止まる
- ⚠️ `components/layout/*` の一部(ヘッダー・サイドバーのクライアント部品など)は引き続き features を import する
  (ADR-0013 の「components → features は許容」の範囲)
- ❌ import パスが `@/components/article/*` から `@/app/_composition/article/*` に変わる

## 関連リソース

- [ADR-0013](./0013-cross-feature-article-composition.md)
- `.dependency-cruiser.cjs` の `no-import-app`
