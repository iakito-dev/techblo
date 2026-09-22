# ADR-0015: フィード UI のレイアウト・操作性リファインメント(配色は維持)

- **状態**: Accepted
- **決定日**: 2026-06-03
- **関連**: ADR-0011 (Refines), ADR-0013
- **一部 Superseded by**: ADR-0035

## 背景

ADR-0011 で採用した Base44 参照デザイン(白背景 + インディゴ `#4f46e5` アクセント +
クール系スレート)を運用したところ、配色そのものは気に入っているが、
レイアウトと操作性に改善余地があった:

- カードのタイポグラフィ・余白が詰まり気味で、コンテンツ(記事タイトル)が主役になりきれない
- フィードグリッドが全 breakpoint でマルチカラム。design.md / ADR-0011 が想定する
  「~639px は 1 カラム」が未実装で、モバイルで 2 カラムのまま窮屈だった
- ダイアログ(デスクトップ中央モーダル)に明示的な閉じるボタンがなく、発見性が低い
- 並び替え/期間タブや企業フィルタのキーボード操作・スクリーンリーダー対応が手薄

OpenAI(ChatGPT Apps SDK の UI ガイドライン)や Apple(HIG)の
「ニュートラルで余白を効かせ、コンテンツを主役にする / アクセシビリティを担保する」
方針を参考に、**配色は変えずに**レイアウトと操作性を磨く。

参考: <https://developers.openai.com/apps-sdk/concepts/ui-guidelines>

## 検討した選択肢

### A. 配色も含めて刷新(モノクロ化 / アクセント差し替え)

- 印象を大きく変えられる
- 既存のインディゴ配色はプロダクトの個性・想起性。試作したが「既存配色のほうが好き」と判断
- ブランド資産を捨てるコストに見合わない

### B. 配色は ADR-0011 を維持し、レイアウト・操作性のみ磨く【採用】

- ブランド資産(インディゴ + 企業ブランドカラー)を保てる
- 変更はタイポ/余白/グリッド/ダイアログ/a11y に限定でき、リスクが小さい

## 決定

選択肢 B を採用する。**配色トークン(neutral=slate / accent=indigo / brand)は ADR-0011 のまま。**
以下のレイアウト・操作性・トークン(色以外)を更新した。

トークン(`app/globals.css`、色以外):

- **Radius**: カード `--radius-md` を 14px → 16px、`--radius-xs` を 6px → 8px に微調整

コンポーネント:

- **記事カード**: 余白を `p-4/p-5` → `p-5/p-6` に、タイトルを `text-base` →
  `text-[17px] font-semibold tracking-tight`・`line-clamp-2` → `line-clamp-3` に。
  ホバーで境界を `border-strong` 強調 + リフト。カード全体に `has-[:focus-visible]` リング。
  ブランドカラーのトップバー・企業名のブランドカラーは **維持**(ADR-0011 の配色表現)
- **フィードグリッド**: `grid-cols-2 ...` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
  でモバイル 1 カラム化(design.md / ADR-0011 の想定に整合)
- **ダイアログ**: デスクトップ中央モーダルに閉じる(×)ボタンを追加。
  タイトルを `text-xl font-semibold tracking-tight` に
- **ヘッダー**: 固定ヘッダーに `backdrop-blur`(スクロール時の可読性)
- **企業フィルタ**: Escape で閉じてトリガーへフォーカス復帰、↑↓ で項目移動、
  `aria-controls` 付与、シェブロンの開閉アニメーション
- **並び替え/期間タブ**: `role="group"` + `aria-label` でグループを明示

## 結果

- ✅ 余白とタイポの調整で記事タイトルが読みやすくなり、コンテンツが主役に
- ✅ モバイル 1 カラム化で窮屈さが解消(design.md の想定に追随)
- ✅ ダイアログの閉じる導線・キーボード操作・グループラベルで a11y が向上
- ✅ 配色は据え置きのため、ブランド資産(インディゴ・企業カラー)を損なわない
- ⚠️ モバイル 1 カラム化で初期スクロール量は増える(可読性とのトレードオフ)
- ⚠️ セグメント型トグルは `role="group"` を採用し、biome の `useSemanticElements` は
  理由付きで抑制(`fieldset` は文脈に過剰)

## 関連リソース

- OpenAI Apps SDK UI Guidelines: <https://developers.openai.com/apps-sdk/concepts/ui-guidelines>
- Apple Human Interface Guidelines
- `app/globals.css`(トークンの真実の源)、`docs/principles/design.md`
