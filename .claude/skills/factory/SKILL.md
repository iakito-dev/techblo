---
name: factory
description: ソフトウェアファクトリー(ADR-0045 / ADR-0046)の 1 回分の実行手順。定期起動されたクラウドセッションが、機能追加・UI/UX 改善・不具合修正・保守を自分で選び、factory/* ブランチで実装・検証して PR を出す。1 回の実行で上限まで複数本出す。小さく安全な変更は factory:automerge を付けて auto-merge する。「ファクトリーを回して」「/factory」と言われたときや、スケジュール実行のプロンプトから起動される。
---

# factory — 1 回の実行で、やれるところまで改善を出荷する

このスキルは、スケジュール実行される Claude Code クラウドセッションの作業手順です。人はその場にいない前提で動きます。
何を作るかはあなたが判断してよい(オーナーから委任済み)。背景と安全設計は [ADR-0045](../../../docs/adr/0045-software-factory.md) と [ADR-0046](../../../docs/adr/0046-factory-features-and-multi-pr.md)、運用は [docs/guides/software-factory.md](../../../docs/guides/software-factory.md)。

## 上限(1 回の実行あたり)

| 項目 | 上限 |
|---|---|
| 新しく出す PR | **5 本**(仕掛かり PR の修正は数えない) |
| open な「人のレビュー待ち」factory PR(`factory:automerge` なし) | **3 本**。超えたら、自動マージできる作業だけを続ける |
| 1 本の PR | 1 つのまとまった改善。自動マージの上限(15 ファイル・400 行)を超える機能は、動く最小単位に切って出す |

上限に届くか、出す価値のある候補がなくなったら終わる。質の低い PR で本数を稼がない。

## 0. 前提を読む

1. `AGENTS.md` と `CLAUDE.md`(コーディング規則・モジュール境界・禁止事項)
2. `REQUIREMENTS.md`・`FEATURES.md`・`ROADMAP.md`(プロダクトの方向)と `docs/README.md`
3. 選んだ作業に関係する `docs/features/*.md`・`docs/adr/*.md`・`docs/architecture/frontend.md`

## 1. 仕掛かり中の factory PR を先に片付ける

GitHub MCP で、head ブランチが `factory/` で始まる open な PR を一覧する。

- CI が赤い、またはマージコンフリクトがある PR があれば、先にすべて直して push する
  - コンフリクトは main をマージして解消する(rebase・force push はしない)
  - 直せない、または変更が保護領域に広がるなら、`factory:automerge` を外して PR に状況をコメントする
- 人のレビューコメントが付いていれば対応する(小さな指摘は直して push、大きな指摘は PR に方針をコメント)

## 2. サンドボックスで画面を見る

UI を触る回は必ず、触らない回もなるべく、実際の画面を見て候補を探す。

```bash
bash scripts/sandbox.sh up     # 使い捨て Postgres + デモ記事 + next dev(http://localhost:3100)
```

Playwright(`require('playwright')`、`chromium.launch()`)で主要ページを撮って見る。

- ページ: `/`(フィード)、人気順、`/companies`・企業ページ、`/tags`・タグページ、記事詳細、検索結果、`/about`、ログイン画面、存在しない URL(404)
- 幅: モバイル 390px とデスクトップ 1280px。ライト / ダーク(`colorScheme` を切り替える)
- 見るもの: 表示崩れ・はみ出し・重なり、読みにくさ(行間・余白・コントラスト)、空/読み込み中/エラー時の表示、タップしにくい要素、キーボード操作とフォーカス、`pageerror` やコンソールエラー
- ログインが要る画面(ブックマーク・お気に入り・設定)は OAuth を通せないので、コードを読んで判断する

## 3. 作業を選ぶ

候補を集めてから、**ユーザー(日本の企業テックブログを読むエンジニア)にとっての価値が大きい順**に並べ、上から取る。迷ったら次の順を目安にする。

| 優先 | 種類 | 探す場所・例 |
|---|---|---|
| 1 | `factory` ラベル付き Issue(古い順) | オーナーが投げ込んだ依頼。最優先 |
| 2 | 壊れているもの | `bun run check` の失敗、サンドボックスで見つけた表示崩れ・エラー |
| 3 | UI/UX の改善 | 手順 2 で見つけた読みにくさ・操作しにくさ・アクセシビリティ・空状態の不親切さ |
| 4 | 機能の追加 | `ROADMAP.md` の未完了項目、`FEATURES.md`・`docs/features/*.md` の「今後」「未実装」、手順 2 で気づいた「あると便利」 |
| 5 | 保守 | テストの欠け、docs と実装のずれ、AGENTS.md の規則違反(1 回の実行で 1 本まで) |

判断の基準:

- **やってよい**: 既存の設計(ADR-0010 の 4 層・デザイントークン・shadcn/ui)に沿った改善と機能追加。既存の UI パターンに合わせる
- **人のレビューに回す(PR は出してよい)**: DB スキーマ変更、認証まわり、新しい依存パッケージ、アーキテクチャ判断を伴う機能(ADR を同じ PR に書く)。これらは保護領域に触れるので、Factory guard が自動で人のレビュー行きにする
- **やらない**: 有料サービス・新しい外部 API キー・新しい環境変数が要るもの、本番データや外部サービスの設定を変えるもの、既存機能を消す・大きく作り替えるもの、デザインの全面刷新
- 直近 30 日に **マージされずに close された** factory PR と同じ題材は選ばない(オーナーが却下した印)
- open / closed の factory PR と重複しないか、タイトルとブランチ名で確かめる
- 同じ実行で出す PR 同士は、**同じファイルを触らない**ように選ぶ(コンフリクトを避ける)

## 4. 実装する(PR 1 本ごとに繰り返す)

```bash
git fetch origin main
git checkout -B factory/$(date +%Y%m%d)-<短い-slug> origin/main
```

- 1 PR 1 まとまり。AGENTS.md §6 のチェックリストに従う
- 機能を足したら `docs/features/{name}.md` を更新する。アーキテクチャ判断があれば `docs/adr/` に ADR を足す
- UI は既存のコンポーネント・トークンを使い、モバイルとデスクトップ、ライトとダークの両方で成り立たせる
- テストを足す(domain / application のロジックは unit test。UI の振る舞いはコードで検証できる範囲で)

## 5. 検証する

```bash
bun run check            # lint + depcruise + typecheck + unit test
bun run build            # app/・components/・features/*/web に触れたとき
```

UI を変えたら、サンドボックス(手順 2)で変更前後を同じ条件で撮り、崩れ・エラーがないことを目で確かめる。
すべて通るまで push しない。直せない失敗が残ったらその作業は捨てて次へ進む。
最後に `code-review` スキルで自己レビューし、見つかった問題を直してから再度 `bun run check` を通す。

## 6. 自動マージ可否を決める

```bash
bun run scripts/factory-guard.ts --local
```

CI の `Factory guard` と同じルールで判定する。✓ が出て、かつ次のすべてに当てはまるときだけ自動マージ対象にする。

- 振る舞いの変化を説明でき、テストまたはサンドボックスの画面で確かめた
- 人がレビューしても判断が分かれない変更である(好みが割れる見た目の変更は人のレビューに回す)

判定ルール(`scripts/factory-guard.ts` が真実源):

| 条件 | 上限 / 対象 |
|---|---|
| 変更ファイル数 | 15 まで |
| 変更行数(追加 + 削除) | 400 まで |
| 保護領域(触れたら必ず人がマージ) | `db/`・認証(`lib/auth*`・`features/auth/`・`app/(login\|signup)/`)・`app/api/`・`lib/env.ts`・`trigger/`・`scripts/`・`infra/`・`.github/`・`.claude/`・`.agents/`・`docs/adr/`・`AGENTS.md`・`CLAUDE.md`・`package.json`・`bun.lock`・各種設定ファイル・`.env*` |

## 7. PR を出す

1. Conventional Commits(英語)でコミットし、`git push -u origin <branch>`
2. GitHub MCP で PR を作る。本文は `.github/PULL_REQUEST_TEMPLATE.md` の見出しに沿って埋め、冒頭に次を書く
   - 「🏭 ソフトウェアファクトリーによる自動 PR」
   - 選んだ理由(どこで何を見つけ、ユーザーにとって何が良くなるか)
   - UI を変えたら、サンドボックスで確かめた画面・幅・テーマと、変化の説明
   - Issue 起点なら `Closes #N`
3. ラベル `factory` を付ける
4. 自動マージ対象なら、さらに `factory:automerge` を付け、`enable_pr_auto_merge`(squash)を有効にする

出したら手順 3 に戻り、上限に届くか候補がなくなるまで続ける。

## 8. 終わり方

`bash scripts/sandbox.sh down` で止めてから、最後のメッセージに次を残す(スケジュール実行の履歴で人が読む):

- 出した PR の一覧(リンク・1 行の要約・自動マージ対象か人のレビュー待ちか)
- 直した仕掛かり PR
- 見送った候補と理由(次回以降の参考になるもの)

## してはいけないこと

- main へ直接 push、force push、`--no-verify`
- テストの skip・削除・閾値の緩和で CI を通す
- 保護領域を変更した PR に `factory:automerge` を付ける
- `scripts/factory-guard.ts`・このスキル・`.github/` を、ファクトリーの作業として書き換える(ハーネスの変更は人が行う)
- 上限を超えて PR を出す
