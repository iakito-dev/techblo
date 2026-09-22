# ADR-0020: shadcn/ui プリミティブの導入とサイドバー型レイアウトへの刷新

- **状態**: Accepted
- **決定日**: 2026-06-09
- **関連**: ADR-0001 (整合), ADR-0011 (レイアウト面を一部 Supersedes)
- **一部 Superseded by**: ADR-0035

## 背景

参照デザイン(Dewey 風のブックマークマネージャ)を基に、フィードのレイアウトを
「リッチな左サイドバー(セクション分けナビ + フォルダ + タグ) + 検索トップバー +
見出し操作行 + masonry カード」へ刷新する方針となった。

これにより 2 つの判断が必要になった。

1. **UI ライブラリ**: 現状は HeroUI(`@heroui/react` 3.1)で実装されているが、ADR-0001 と
   `TECH_STACK.md` / `ARCHITECTURE.md` は当初から **shadcn/ui**(Radix + Tailwind の copy-in 方式)を
   採用すると記載しており、実装が乖離していた。新レイアウトの細かなプリミティブ(折りたたみ・
   ツールチップ・スクロール領域・件数バッジ等)をどちらで作るか。
2. **レイアウト方針**: ADR-0011 は Base44 案に合わせ「サイドバー / 右ウィジェット / 検索を持たない、
   見出し + 並び替え + 均一カードグリッドのシンプル構成」を決めていた。今回これを覆し、
   サイドバー + 検索 + masonry を導入する。

配色(インディゴ)・タイポグラフィ・テキスト主体カードという ADR-0011 の他の判断は維持する。

## 検討した選択肢

### A. HeroUI のまま新レイアウトを実装

- 既存の依存・スタイルを流用できる
- ADR-0001 / TECH_STACK の記載(shadcn/ui)とは乖離したまま
- サイドバー等のプリミティブを HeroUI で組むと記述量が増える

### B. shadcn/ui 流のプリミティブを `components/ui/` に手置き(採用)

- ADR-0001 / TECH_STACK / ARCHITECTURE の記載と整合する
- Radix(挙動)+ cva + `cn()` + 既存3層トークンで、軽量に必要な物だけ追加できる
- HeroUI は既存箇所(Dialog / Dropdown / Avatar 等)で**当面共存**。全面移行は別タスク
- 当面 2 つの UI 系統が混在する

### C. shadcn/ui CLI(`components.json`)を導入して自動生成

- 自動化できるが、Tailwind v4 / biome / 既存3層トークンとの整合調整が増える
- 今回は必要なプリミティブが少数のため過剰

## 決定

**B を採用**。`components/ui/` に shadcn/ui 流のプリミティブ(`button` / `input` / `tooltip` /
`collapsible` / `scroll-area` / `separator` / `badge`)を **手置き**する。挙動が要る物は Radix
(`@radix-ui/react-{collapsible,tooltip,scroll-area,separator,slot}`)に委譲し、見た目は
**既存の3層トークン**(`bg-bg-surface` / `text-fg-default` 等)で記述する。shadcn 標準の別系統トークン
(`--background` 等)は導入せず、トークンの二重化を避ける。

レイアウトは ADR-0011 の「サイドバーなし」方針を**改定**し、デスクトップ(lg+)を Dewey 風シェルにする:

- 左サイドバー(`components/layout/app-sidebar.tsx`): ライブラリ / フィルタ(仮) /
  **フォルダ = 購読企業**(`getCompanies()` の実件数、`/?company=slug` で絞り込み) / タグ(仮) /
  下部ユーティリティ
- トップバー(`components/layout/feed-topbar.tsx`): 検索(仮) + 同期/オーバーフロー(仮) + 見出し操作行
  (並び替えは既存 view-model を流用、表示切替/選択は仮)
- カードは **masonry**(CSS columns)へ

モバイル(<lg)は従来の上部バー(`Header`)+ 下部ナビ(`MobileNav`)を維持する。
未実装機能(検索・フィルタ/タグの実データ・同期・表示切替・選択)は**プレースホルダ**として枠のみ置く。

## 結果

- ✅ ADR-0001 / TECH_STACK / ARCHITECTURE の「shadcn/ui」記載と実装が整合に近づく
- ✅ Radix により折りたたみ・ツールチップ等のアクセシビリティ/挙動を自前実装せずに済む
- ✅ 購読企業をフォルダとして実件数つきで一覧でき、フィード絞り込みの導線が増える
- ⚠️ HeroUI と shadcn 流プリミティブが**当面共存**する(見た目の一貫性に注意。全面移行は別タスク)
- ⚠️ ADR-0011 の「サイドバー/検索なし」レイアウト判断を覆す(配色・カード方針は維持)
- ⚠️ サイドバーで `getCompanies()` を全ページが参照する(認証不要・cache 済みのため軽量)
- ❌ プレースホルダ UI が増える(検索・タグ等は枠のみで未機能)

## 関連リソース

- ADR-0001(技術スタック選定: shadcn/ui を採用)
- ADR-0011(Base44 配色・テキスト主体カード。レイアウト面のみ本 ADR が改定)
- 参照デザイン: Dewey(ブックマークマネージャ)
- shadcn/ui(https://ui.shadcn.com/) / Radix UI(https://www.radix-ui.com/)
