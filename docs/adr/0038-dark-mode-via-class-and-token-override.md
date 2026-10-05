# ADR-0038: ダークモードは .dark クラス + プリミティブトークン上書きで実現する

- **状態**: Accepted
- **決定日**: 2026-10-05
- **関連**: ADR-0005, ADR-0010, ADR-0035

## 背景

MVP は ADR-0005 でライト固定としたが、夜間の閲覧需要があり、3層トークン(primitive → semantic → component)を既に導入済みでコンポーネントはセマンティックトークン経由で色を参照している。HeroUI(`@heroui/styles`)は `.dark` と `data-theme="dark"` のどちらでもテーマが切り替わる。Tailwind v4 の `@theme` では他の `var()` を参照するトークンが実行時に解決されるかを実ビルドで確認する必要があった。

## 検討した選択肢

### A. `prefers-color-scheme` のみ(CSS メディアクエリ)

- 内容: OS 設定にだけ追従する
- メリット: JS 不要、FOUC なし
- デメリット: ユーザーが手動で選べない

### B. next-themes + `.dark` クラスでプリミティブ上書き

- 内容: `<html>` にクラスを付け、`.dark` でプリミティブトークンだけ差し替える。既定は system
- メリット: 手動選択と OS 追従を両立。FOUC は next-themes の事前スクリプトで防げる。セマンティックトークンと各コンポーネントは無変更
- デメリット: クライアント側 Provider と localStorage 依存(サーバーは選択を知らない)

### C. コンポーネントごとに `dark:` variant を書く

- 内容: 各クラスに `dark:bg-...` を足す
- メリット: 個別に細かく調整できる
- デメリット: 全面に分散して漏れやすく、トークン設計と二重管理になる

## 決定

B を採用する。

- `app/providers.tsx` に `ThemeProvider`(`attribute=['class','data-theme']`、`defaultTheme="system"`、`enableSystem`、`disableTransitionOnChange`)を置く。HeroUI 用に `data-theme` も付ける
- `app/globals.css` の `.dark` でプリミティブ(ink / text / bg / surface / border / rule / accent / scrim / danger 等 / shadow)と HeroUI の主要変数を上書きする。ビルド出力でセマンティックトークンが `var()` 参照のまま残り、実行時に解決されることを確認した
- `@custom-variant dark` は `.dark` クラス基準に定義する(HeroUI 既定の `prefers-color-scheme` フォールバックは使わない)
- accent は暗背景でのコントラスト確保のため `#34C5B0` に明るくする
- LP(`/lp`)は暗色デザインを持たないためライト固定。ルートに `class="light" data-theme="light"` を付けてトークンをライトへ戻す
- 切替 UI は設定画面の「表示」セクション(モバイルは `/settings/appearance` へのドリルダウン)。マウント前は未選択表示にして hydration mismatch を避ける
- `viewport.themeColor` はライト/ダークの media 配列にする

## 結果

- ✅ コンポーネント側の変更が不要で、新しい色もセマンティックトークンを使えば自動でダーク対応になる
- ✅ 既定は OS 追従で、手動選択もできる
- ⚠️ `.light` ブロックはライトのプリミティブ値の複製。ライトの値を変えたら `.light` も更新する
- ⚠️ テーマ選択はブラウザの localStorage に保存され、アカウントや端末間では同期されない
- ❌ OG 画像・アイコン・manifest はライト固定のまま(ダーク対応しない)

## 関連リソース

- next-themes: https://github.com/pacocoursey/next-themes
- `docs/principles/design.md` 10章
