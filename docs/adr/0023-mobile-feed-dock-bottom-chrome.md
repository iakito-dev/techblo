# ADR-0023: モバイルのフィルタ/ソートドックと bottom chrome の一体退避

- **状態**: Accepted
- **決定日**: 2026-06-11
- **関連**: ADR-0016, ADR-0019, ADR-0020, ADR-0021, ADR-0022

## 背景

モバイル(<md)のフィード絞り込み/並び替えは、ヘッダー直下の sticky チップ行で提供していた。
この位置は片手操作で届きにくく、下スクロール時にボトムナビとは別々に動くため、主要操作のまとまりが弱かった。

一方でフィードのツールバーは `Suspense` の静的フォールバックで初回描画に出す必要がある(ADR-0019)。
Portal でボトムナビと単一コンテナに合成すると一体退避は簡単になるが、フィード側の SSR/PPR 境界を崩しやすい。

## 決定

モバイル(<md)では上部 sticky チップ行を廃止し、ボトムナビ直上に固定の2分割ドックを置く。

- 左セル: 絞り込み。企業/既読/期間の適用数をバッジで表示し、`FeedFilterSheet` を開く
- 右セル: 並び替え。現在のソートラベルを表示し、`FeedSortSheet` を開く
- 各セルは 48px 高の全面タップ領域、中央は 0.5px の縦区切り線、角丸とシャドウは使わない
- 表示範囲は <md に限定し、md〜lg の上部1行ツールバーは維持する

ボトムナビとドックは `components/layout/bottom-chrome.tsx` の共有 Context を購読する。
Provider は単一の scroll listener を持ち、スクロール方向から `hidden` を計算する。
両コンポーネントは `translate-y-[calc(var(--mobile-nav-h)+3.5rem)]` を使い、同じ px 距離で退避する。

`MobileNav` は `ResizeObserver` で自身の高さを測定し、`--mobile-nav-h` を document root に設定する。
この値をドックの `bottom`、退避距離、フィード末尾余白の単一ソースにする。
JS 測定前の fallback として `app/globals.css` に safe-area 込みの初期値を置く。

フィルタ適用中は `MobileFeedDock` が `setKeepVisible(true)` を設定し、下スクロールでも bottom chrome を隠さない。
ユーザーが絞り込み状態を確認・解除できることを優先するため。

## 検討した選択肢

### A. 上部 sticky チップ行を維持

- 実装変更が小さい
- 片手操作で届きにくく、ボトムナビとの動きが分離したまま残る

### B. Portal でボトムナビとフィードバーを単一 fixed コンテナに合成

- DOM 上も完全に1要素として退避できる
- フィードバーの SSR/PPR フォールバックと相性が悪く、初回表示で操作面が欠けやすい

### C. 共有 Context + 同一 transform 距離(採用)

- SSR/PPR を維持したまま、視覚的には一体退避できる
- layout 層の横断 UI 状態として扱えるため、feature 間依存ではなく `components/layout` に閉じられる
- Portal より DOM は分かれるが、退避距離を `--mobile-nav-h` に集約することでズレを防げる

## 結果

- ✅ モバイルの主要操作が親指に近い位置へ移動する
- ✅ ボトムナビとフィードドックが同じ距離で退避し、動きが一体化する
- ✅ フィルタ適用中はドックが隠れず、適用状態の確認性が保たれる
- ✅ タブレット(md〜lg)の既存上部ツールバーは維持される
- ⚠️ layout の Context を feed feature が購読する。依存は `features/feed -> components/layout` の一方向に限定し、`components/layout -> features` の逆流は禁止する
