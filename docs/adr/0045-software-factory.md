# ADR-0045: ソフトウェアファクトリー — 定期起動エージェントと条件付き自動マージ

- **状態**: Accepted
- **決定日**: 2026-10-27
- **関連**: ADR-0007, ADR-0008

## 背景

ADR-0008 で AI エージェント向けのハーネス(AGENTS.md・`.claude/`・lefthook・CI)を整えたが、エージェントは人が起動したときにしか動かない。
依存の脆弱性、ドキュメントと実装のずれ、テストの欠け、規則違反の残りといった小粒の改善は、人が気づくまで放置されがちだった。

これを「人がいなくても、小さな改善が継続的に出荷される仕組み」(ソフトウェアファクトリー)にしたい。
同時に、AI が本番データ・認証・デプロイ経路を壊すリスクは増やしたくない。

## 検討した選択肢

### A. GitHub Actions 上の claude-code-action を cron で動かす

- リポジトリ内で完結する
- API キーを Secrets に置く必要があり、ワークフローの権限設計(contents: write 等)も自前で持つ
- 実行ログが Actions のログに埋もれ、途中経過を追いにくい

### B. Claude Code クラウドのスケジュール実行(採用)

- 毎回新しいクラウドセッションがリポジトリを clone して動く。セッションは Claude アプリから追える
- 手順はリポジトリのスキル(`.claude/skills/factory/SKILL.md`)に置き、スケジュール側のプロンプトは「スキルを実行せよ」だけにする
- スケジュールの設定はリポジトリの外(claude.ai)にある

### 自動マージの判定方法

- **B-1. エージェントの自己判断だけで auto-merge する**: 判断の誤りやプロンプトの揺れがそのまま main に入る
- **B-2. 決定論的なガードを CI に置く(採用)**: `scripts/factory-guard.ts` がパス・規模を機械的に判定し、満たすときだけ github-actions[bot] が Approve する。エージェントは `factory:automerge` ラベルで「対象にしたい」と申告するだけ

## 決定

**B. Claude Code クラウドのスケジュール実行 + B-2. CI のガードによる条件付き自動マージ** を採用する。

- エージェントは 1 回の実行で最大 1 本の PR を `factory/*` ブランチから出す。手順は `factory` スキル
- 自動マージの条件(`scripts/factory-guard.ts`)
  - head が同一リポジトリの `factory/*` で、`factory:automerge` ラベルが付いている
  - 変更 15 ファイル・400 行まで
  - 保護領域(DB・認証・API ルート・Trigger.dev・CI/ハーネス・依存・設定・ADR)に触れない
- 条件を満たせば bot が Approve し、ブランチ保護の必須チェック(All checks passed / Factory guard)が通ったところで GitHub の auto-merge がマージする
- 条件を満たさない PR は Factory guard が失敗し、ラベルを外して人がレビューする
- ガードは PR の head ではなく base(main)のスクリプトで動かす。PR がガード自身を書き換えて自分を承認できないようにするため

## 結果

- ✅ 依存の更新・docs のずれ・テストの欠けなど、小粒の改善が人の起動なしに継続的に出る
- ✅ 自動マージの可否は CI のコードで決まり、エージェントの判断がぶれても保護領域は守られる
- ✅ 既存のブランチ保護(承認 1 件)を外さずに済む。承認するのは条件を満たした PR に限られる
- ⚠️ リポジトリ設定(auto-merge の許可、Actions による PR 承認の許可、必須チェックへの Factory guard 追加、stale approval の取り消し)が前提。手順は `docs/guides/software-factory.md`
- ⚠️ push 権限を持つ人は `factory/*` ブランチ + ラベルで同じ経路を使える。push 権限者は信頼する前提とする
- ⚠️ main に入った変更は deploy.yml で Trigger.dev の再デプロイを起こしうる(保護領域に `trigger/` はあるが、タスクが import するコードは対象外)
- ❌ スケジュールの設定はリポジトリに残らない。設定内容はガイドに記録して補う

## 関連リソース

- `.claude/skills/factory/SKILL.md` — 1 回の実行手順
- `scripts/factory-guard.ts` / `.github/workflows/factory-guard.yml` — 自動マージ判定
- `docs/guides/software-factory.md` — セットアップと運用
