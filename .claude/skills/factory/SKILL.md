---
name: factory
description: ソフトウェアファクトリー(ADR-0045)の 1 回分の実行手順。定期起動されたクラウドセッションが、改善点を 1 つ選んで factory/* ブランチで実装し、検証して PR を出す。小さく安全な変更だけ factory:automerge を付けて auto-merge する。「ファクトリーを回して」「/factory」と言われたときや、スケジュール実行のプロンプトから起動される。
---

# factory — 1 回の実行で 1 つの小さな改善を出荷する

このスキルは、スケジュール実行される Claude Code クラウドセッションの作業手順です。人はその場にいない前提で動きます。
背景と安全設計は [ADR-0045](../../../docs/adr/0045-software-factory.md)、運用は [docs/guides/software-factory.md](../../../docs/guides/software-factory.md) を参照してください。

**1 回の実行で出す PR は最大 1 本。** 迷ったら出さずに終わってよい。何もしない回は失敗ではありません。

## 0. 前提を読む

1. `AGENTS.md` と `CLAUDE.md`(コーディング規則・モジュール境界・禁止事項)
2. 選んだ作業に関係する `docs/features/*.md` と `docs/adr/*.md`

## 1. 仕掛かり中の PR を先に片付ける

GitHub MCP で、head ブランチが `factory/` で始まる open な PR を一覧します。

- CI が赤い、またはマージコンフリクトがある PR があれば、**新しい作業より先に** 1 本直して push し、そこで終わる
  - コンフリクトは main をマージして解消する(rebase・force push はしない)
  - 直し方が分からない、または変更が保護領域(下の表)に広がるなら、`factory:automerge` を外し、PR に状況をコメントして終わる
- open な factory PR が **2 本以上** あれば、新しい PR は作らずに終わる(人のレビューが詰まっている合図)

## 2. 作業を 1 つ選ぶ

上から順に探し、最初に見つかった **1 つ** に絞ります。

| 優先 | 探す場所 | 例 |
|---|---|---|
| 1 | open な Issue のうち `factory` ラベル付き(古い順) | 人が投げ込んだ小粒タスク |
| 2 | `bun run check` の失敗・警告、`bun audit` の指摘 | 型エラー、壊れたテスト、脆弱性のある依存 |
| 3 | ドキュメントと実装のずれ | `docs/features/*.md` に書かれた挙動と実装が違う |
| 4 | テストの欠け | `domain` / `application` 層でテストのない関数 |
| 5 | AGENTS.md の規則違反 | `console.log` の残り、`any`、throw している usecase、不要な `'use client'` |

選ばないもの:

- 新機能・UI の見た目の変更・ADR が要る設計判断(Issue で人が `factory` を付けたものを除く)
- 外部サービスの設定変更、本番データに触れる作業
- 直近 30 日に閉じられた(マージされずに close された)factory PR と同じ題材 — 人が却下した印なので繰り返さない
- open / closed の factory PR と重複するもの(PR 一覧をタイトルとブランチ名で検索して確かめる)

## 3. 実装する

```bash
git fetch origin main
git checkout -b factory/$(date +%Y%m%d)-<短い-slug> origin/main
```

- 1 PR 1 論理変更。AGENTS.md §6 のチェックリストに従う
- 仕様が変わるなら `docs/features/{name}.md` も更新する
- `factory` ラベル付き Issue が ADR レベルの判断を要すると分かったら、実装せず Issue に論点をコメントして終わる

## 4. 検証する

```bash
bun run check            # lint + depcruise + typecheck + unit test
bun run build            # app/ や components/ に触れたとき(node 22 以上が必要。CLAUDE.md 参照)
```

すべて通るまで push しない。直せない失敗が残ったら作業を捨てて終わる。
その後 `code-review` スキルで自己レビューし、見つかった問題を直してから再度 `bun run check` を通す。

## 5. 自動マージ可否を決める

```bash
bun run scripts/factory-guard.ts --local
```

CI の `Factory guard` と同じルールで判定します。✓ が出て、かつ次のすべてに当てはまるときだけ自動マージ対象にします。

- 振る舞いの変化が説明でき、テストで確かめられている(または docs のみの変更)
- 人がレビューしても判断が分かれない変更である

判定ルール(`scripts/factory-guard.ts` が真実源):

| 条件 | 上限 / 対象 |
|---|---|
| 変更ファイル数 | 15 まで |
| 変更行数(追加 + 削除) | 400 まで |
| 保護領域(触れたら必ず人がマージ) | `db/`・認証(`lib/auth*`・`features/auth/`・`app/(login\|signup)/`)・`app/api/`・`lib/env.ts`・`trigger/`・`scripts/`・`infra/`・`.github/`・`.claude/`・`.agents/`・`docs/adr/`・`AGENTS.md`・`CLAUDE.md`・`package.json`・`bun.lock`・各種設定ファイル・`.env*` |

## 6. PR を出す

1. Conventional Commits(英語)でコミットし、`git push -u origin <branch>`
2. GitHub MCP で PR を作る。本文は `.github/PULL_REQUEST_TEMPLATE.md` の見出しに沿って埋め、冒頭に「🏭 ソフトウェアファクトリーによる自動 PR」と、選んだ理由(どの探索元で何を見つけたか)を書く。Issue 起点なら `Closes #N`
3. ラベル `factory` を付ける
4. 自動マージ対象なら、さらに `factory:automerge` を付け、`enable_pr_auto_merge`(squash)を有効にする。
   CI と `Factory guard` が通ると github-actions[bot] が承認し、GitHub がマージする

## 7. 終わり方

最後のメッセージに次を残します(スケジュール実行の履歴で人が読む):

- 何を選んだか / なぜか(選ばなかった候補があれば 1 行で)
- PR のリンクと、自動マージ対象かどうか
- 何もしなかった場合はその理由

## してはいけないこと

- main へ直接 push、force push、`--no-verify`
- テストの skip・削除・閾値の緩和で CI を通す
- 保護領域を変更した PR に `factory:automerge` を付ける
- `scripts/factory-guard.ts` やこのスキル自体を、ファクトリーの作業として書き換える(ハーネスの変更は人が行う)
- 1 回の実行で 2 本以上の PR を出す
