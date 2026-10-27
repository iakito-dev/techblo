# ソフトウェアファクトリーの運用

定期起動した Claude Code クラウドセッションが改善点を 1 つ選び、PR を出し、小さく安全なものだけ自動でマージする仕組み。
設計判断は [ADR-0045](../adr/0045-software-factory.md)。

```
スケジュール実行(claude.ai)
   ↓ 新しいクラウドセッションを起動
factory スキル(.claude/skills/factory/SKILL.md)
   ↓ 仕掛かり PR の修正 → 作業を 1 つ選ぶ → 実装 → bun run check → 自己レビュー
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

claude.ai の Claude Code で、このリポジトリを対象に「実行ごとに新しいセッションを作る」スケジュールを作る。プロンプトは次の 1 行でよい(手順はスキル側にある):

```
factory スキル(.claude/skills/factory/SKILL.md)の手順に従って、ソフトウェアファクトリーを 1 回実行してください。
```

- 頻度の目安: 平日 1 日 1 回。レビューが追いつかないなら減らす(open な factory PR が 2 本以上あると、新しい PR は作らない)
- スケジュールの設定はリポジトリに残らないので、変えたらこの節を更新する

## 2. 日々の運用

- **タスクを投げ込む**: Issue を作って `factory` ラベルを付ける。小さく、完了条件がはっきりしたものが向いている([ai-engineering.md §3](./ai-engineering.md) の「任せやすい」タスク)
- **やめさせる**: 却下したい PR は close する。ファクトリーは直近 30 日に close された題材を繰り返さない
- **止める**: スケジュールを無効にする。仕掛かりの PR はそのまま残る
- **履歴を見る**: Claude アプリのセッション一覧(各実行の最後に、何を選んだか・なぜかが残る)と、`label:factory` の PR 一覧

## 3. 自動マージの条件を変える

条件は `scripts/factory-guard.ts` が唯一の真実源。変えるときは:

1. `scripts/factory-guard.ts` と `scripts/factory-guard.test.ts` を直す
2. スキルの §5 の表と、ADR-0045 の決定(大きく変えるなら新しい ADR)を合わせる
3. `scripts/` と `.github/` は保護領域なので、この変更自体は必ず人がマージする
