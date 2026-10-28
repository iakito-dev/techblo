# ソフトウェアファクトリーの運用

定期起動した Claude Code クラウドセッションが、機能追加・UI/UX 改善・不具合修正・保守を自分で選んで PR を出し、小さく安全なものだけ自動でマージする仕組み。1 回の実行で最大 5 本まで出す。
設計判断は [ADR-0045](../adr/0045-software-factory.md) と [ADR-0046](../adr/0046-factory-features-and-multi-pr.md)。

```
スケジュール実行(claude.ai)
   ↓ 新しいクラウドセッションを起動
factory スキル(.claude/skills/factory/SKILL.md)
   ↓ 仕掛かり PR の修正 → サンドボックスで画面を見る → 作業を選ぶ → 実装 → bun run check / 画面確認 → 自己レビュー
   ↓ (上限 5 本か、候補がなくなるまで繰り返す)
PR(factory/* ブランチ, label: factory [+ factory:automerge])
   ↓ CI(All checks passed)+ Factory guard
条件を満たす → github-actions[bot] が承認 → auto-merge(squash)
条件を満たさない / ラベルなし → 人がレビューしてマージ
```

## 1. 初回セットアップ

### リポジトリ設定(GitHub の Settings)

| 場所 | 設定 |
|---|---|
| General → Pull Requests | **Allow auto-merge** を有効にする |
| Actions → General → Workflow permissions | **Allow GitHub Actions to create and approve pull requests** を有効にする(Factory guard の承認に必要) |
| Branches → `main` の保護ルール | 必須チェックに **Factory guard** を追加する(既存の All checks passed と併せて) |
| 同上 | **Dismiss stale pull request approvals when new commits are pushed** を有効にする(承認後の push で条件を外れた PR が残らないように) |

### ラベル

| ラベル | 意味 |
|---|---|
| `factory` | ファクトリーが出した PR / ファクトリーに任せたい Issue |
| `factory:automerge` | 自動マージ対象(エージェントが申告し、Factory guard が検証する) |

### スケジュール実行

claude.ai の Claude Code で、このリポジトリを対象に「実行ごとに新しいセッションを作る」スケジュールを作る。手順・上限はスキル側にあるので、プロンプトは次の 1 行でよい(本数などをプロンプトに書くとスキルと食い違う):

```
リポジトリ iakito-dev/techblo で、factory スキル(.claude/skills/factory/SKILL.md)の手順に従ってソフトウェアファクトリーを 1 回実行してください。
```

- 現在の設定: 毎日 18:27(日本時間)
- 接続ツール(connector)は不要。無人で動くので、メールやドライブなどは外しておく
- 人のレビュー待ちの factory PR が 3 本を超えると、ファクトリーは自動マージできる作業だけを続ける。レビューが追いつかないなら頻度を減らす
- スケジュールの設定はリポジトリに残らないので、変えたらこの節を更新する

## 2. 日々の運用

- **画面を手元で確かめる**: `bash scripts/sandbox.sh up` で使い捨て DB + デモ記事 + `next dev`(http://localhost:3100)が立つ。`down` で止める。`.env.local` には触れない
- **タスクを投げ込む**: Issue を作って `factory` ラベルを付ける。何より先に取り組む。完了条件がはっきりしたものが向いている
- **やめさせる**: 却下したい PR は close する。ファクトリーは直近 30 日に close された題材を繰り返さない
- **止める**: スケジュールを無効にする。仕掛かりの PR はそのまま残る
- **履歴を見る**: Claude アプリのセッション一覧(各実行の最後に、何を選んだか・なぜかが残る)と、`label:factory` の PR 一覧

## 3. 自動マージの条件を変える

条件は `scripts/factory-guard.ts` が唯一の真実源。変えるときは:

1. `scripts/factory-guard.ts` と `scripts/factory-guard.test.ts` を直す
2. スキルの §6 の表と、ADR-0045 の決定(大きく変えるなら新しい ADR)を合わせる
3. `scripts/` と `.github/` は保護領域なので、この変更自体は必ず人がマージする
