# ADR-0008: AIエンジニアリング・ハーネス整備

- **状態**: Accepted
- **決定日**: 2026-05-28
- **関連**: ADR-0007

## 背景

このプロジェクトは AI assistants(Claude Code / Codex / Cursor 等)を主要な開発パートナーとして使う前提。
AI を効率的かつ安全に使うには、以下を最初から整える必要がある:

- AIに渡す指示の集約場所
- 安全な実行範囲(allowlist/denylist)
- AI生成コードの品質ゲート
- 将来のAI機能(要約等)のEval基盤

## 検討した選択肢

### A. 何も整備しない、必要になったら追加

- 開始は早い
- ルールが暗黙化、AIエージェントが毎回コンテキストを再構築
- 安全策の漏れ

### B. ツール固有設定を個別に管理

- Claude用は `.claude/`、Cursor用は `.cursor/`、Codex用は `.codex/`...
- 重複が大量発生
- 設計原則が同期しない

### C. 共通ファイル + ツール固有委譲

- `AGENTS.md` をマスター指示書に
- 各ツールのファイル(`CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`)は AGENTS.md に委譲
- `docs/` に詳細を集約
- `.claude/settings.json` でClaude固有のハーネス設定

## 決定

**C. 共通ファイル + ツール固有委譲** を採用。

### ハーネスの構成要素

| 領域 | 仕組み |
|---|---|
| **指示の集約** | `AGENTS.md` をマスターに、ツール固有は委譲 |
| **設計原則** | `docs/principles/*.md`(不変) |
| **過去の判断** | `docs/adr/*.md`(凍結) |
| **機能仕様** | `docs/features/*.md`(実装と共に成長) |
| **手順書** | `docs/guides/*.md` |
| **品質ゲート** | lefthook(pre-commit) + GitHub Actions(CI) |
| **Claude Code 安全策** | `.claude/settings.json`(allowlist/denylist/hooks) |
| **AIコード追跡** | Conventional Commits + PR template の "AI assist 利用状況" |
| **Eval基盤** | (将来)`evals/` + PromptFoo |

### Claude Code 設定の方針

- 読み取り系コマンドは広めに allowlist
- 破壊的操作・パブリッシュ系は denylist
- PostToolUse hook で編集後に自動 `biome check --apply`
- 自己改変防止(`.claude/settings.json` 自体は AI に書かせない)

### AIコードのレビュー

- すべての生成後に `code-review` skill を実行(推奨)
- セキュリティが絡む変更は `security-review` を追加
- 人間のレビュアーは「AI assist 利用状況」を見て注意深く確認

## 結果

- ✅ Claude / Codex / Cursor で同じプロジェクト原則を共有
- ✅ AIエージェントが暴走しても破壊的操作はdenylistで防げる
- ✅ pre-commit hook で人間もAIも同じ品質ゲートを通る
- ✅ 将来AI機能を追加する際のEval基盤の場所が決まっている
- ⚠️ 文書量が多くなり、AIに渡すコンテキストが膨らみがち → 「必要な docs を選んで読ませる」運用が必要
- ⚠️ 新ツールが出るたびに委譲ファイル追加(`CODEX.md` 等)が必要になる可能性
- ❌ AIの能力向上で設定が陳腐化する速度が早い、定期見直しが必要

## 関連

- `AGENTS.md` — マスター指示書
- `CLAUDE.md` — Claude固有設定
- `docs/guides/ai-engineering.md` — AI開発のベストプラクティス
- `docs/principles/testing.md` — テスト戦略
- `.github/PULL_REQUEST_TEMPLATE.md` — AI利用箇所の明示欄
- `lefthook.yml` — pre-commit hooks
