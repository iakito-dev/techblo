# AIエンジニアリング・ガイド

AIエージェント(Claude Code / Codex / Cursor 等)と効率的・安全に開発するためのプラクティス。
個別ツール固有の指示は各ツールファイル(`CLAUDE.md` 等)、共通指示は `AGENTS.md` を参照。

---

## 1. 開発の前提となる原則

### Spec-driven development(仕様駆動)

AIに「機能を作って」とだけ言うと迷子になる。次の順で進める:

1. **要件**を整理(`REQUIREMENTS.md` / 関連 Issue)
2. **機能仕様**を書く or 既存を読む(`docs/features/{name}.md`)
3. **設計判断**を文書化(必要なら `docs/adr/`)
4. **実装**(AIに任せやすい単位に細分化)
5. **レビュー**(`code-review` skill 等)
6. **ドキュメント更新**

### コンテキスト最小化

AIに渡すコンテキストは必要最小限。トークンと推論精度の両方に効く。

- 「全ファイル読んで」ではなく **特定機能ディレクトリだけ** を指定
- 大量データは要約してから渡す
- 不要なログ・出力をエージェントに食わせない

### 検証可能な単位で依頼

AIに任せる単位は **テスト or 目視で検証可能** な範囲にする。
「アプリ全部書いて」より「`features/feed/web/queries.ts`(composition root)と application 層の `listFeed` usecase を実装」が成功率高い。

---

## 2. ハーネス設定(Claude Code)

### `.claude/settings.json` の推奨設定

セキュリティ上、AI 自身がこのファイルを書き換えるとブロックされる。**初回はユーザーが手動で作成** してください。

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(bun:*)",
      "Bash(bunx:*)",
      "Bash(bun drizzle-kit:*)",
      "Bash(bunx biome:*)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)",
      "Bash(git show:*)",
      "Bash(gh pr view:*)",
      "Bash(gh pr list:*)",
      "Bash(gh issue view:*)",
      "Bash(gh issue list:*)",
      "Bash(gh repo view:*)",
      "Bash(ls:*)",
      "Bash(grep:*)",
      "Bash(rg:*)",
      "Bash(tree:*)",
      "Bash(bun --version)",
      "Bash(node --version)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(git push --force*)",
      "Bash(git push -f*)",
      "Bash(git reset --hard*)",
      "Bash(curl * | sh)",
      "Bash(curl * | bash)",
      "Bash(npm publish*)",
      "Bash(bun publish*)"
    ]
  },
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/session-start.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/biome-format.sh" }
        ]
      }
    ]
  }
}
```

### 何を allowlist に入れるか

| 入れる | 入れない |
|---|---|
| 読み取り系コマンド(`ls`, `cat`, `grep`, `git log` 等) | 破壊的操作(`rm -rf`, `git reset --hard`) |
| ビルドツール(`bun`, `bunx biome`, `drizzle-kit`) | 任意のbash実行 |
| GitHub PR/Issue 閲覧 | `git push --force` |
| プロジェクト固有のスクリプト | 認証情報を扱う操作 |

### Hook の活用

- **SessionStart** → Claude Code on the web(`CLAUDE_CODE_REMOTE=true`)では `bun install`、ローカルの git worktree では main 本体の `.env.local` を symlink し `node_modules` が無ければ `bun install`。どちらも新規チェックアウトで lint / test / dev が動かないのを防ぐ。main 本体では何もしない(`.claude/hooks/session-start.sh`)
- **PostToolUse(Edit/Write)** → 編集ファイルだけ `biome check --write`。対象パスは stdin JSON の `tool_input.file_path` から取る(`.claude/hooks/biome-format.sh`)
- **PreToolUse(Bash)** → 危険コマンドをブロック(ssh, scp 等)
- **Stop** → セッション終了時にテスト・lint を自動実行
- **SubagentStop** → サブエージェントの結果を集約

---

## 3. AIに任せやすいタスク・任せにくいタスク

### 任せやすい

- ✅ 仕様が明確な機能実装(`docs/features/{name}.md` 充実時)
- ✅ ボイラープレート(CRUD、Server Action、Drizzle スキーマ)
- ✅ テスト追加(既存実装の網羅テスト)
- ✅ リファクタリング(型変更、命名変更、ファイル分割)
- ✅ ドキュメント生成(JSDoc、README)
- ✅ 既知の小バグ修正

### 任せにくい(or 必ず人間レビュー)

- ⚠️ 認証・認可ロジック
- ⚠️ お金が関わる処理(課金、決済 — 将来)
- ⚠️ 破壊的変更(DB migration の DROP、設定削除)
- ⚠️ 暗号・セキュリティ実装
- ⚠️ パフォーマンスチューニング(プロファイル必要)
- ⚠️ 設計判断(ADR レベル) — 人間と協議

---

## 4. プロンプト・依頼の組み立て方

### 依頼テンプレート(理想)

```
## 目的
{何を達成したいか1-2文}

## コンテキスト
- 該当機能: docs/features/{name}.md
- 関連ADR: docs/adr/000X-xxx.md
- 既存実装: {ファイルパス}

## 完了条件
- [ ] {テスト名} が通る
- [ ] {関数} の型シグネチャが {expected}
- [ ] docs/features/{name}.md を更新

## 注意点
- {制約}
- {避けるべきパターン}
```

### NG例

- ❌「いい感じに作って」
- ❌「全部リファクタして」
- ❌「最適化して」

---

## 5. AIコードのレビュー

### セルフレビュー(AI生成直後)

`code-review` skill を使う:
```
/code-review
```

確認観点:
- レイヤー境界違反(features/A → features/B)
- ORM型を上層に漏らしていないか
- `'use client'` が不要に付いていないか
- throw していないか(Result型を使う)
- 認可チェックがあるか
- N+1 になっていないか
- ドキュメントとの整合性

### セキュリティが絡む変更

`security-review` skill を追加で:
```
/security-review
```

### PRレビュー

レビュー時にAIに観点を投げる:
```
gh pr view 123 | claude "このPRをレビューして。観点は docs/principles/code.md と AGENTS.md のレビュー基準"
```

---

## 6. AI機能のEval(将来フェーズ)

AI要約機能を入れる際は、Evalフレームワークを必ず設置。

### Eval戦略

| Eval種別 | ツール | 内容 |
|---|---|---|
| 単体eval | Vitest + 期待値 | 要約の長さ、フォーマット |
| 品質eval | PromptFoo | LLM-as-Judgeで類似度・正確性スコア |
| 回帰eval | 過去の悪い要約 → 修正案で改善 | プロンプト変更時に必須 |
| コストeval | OpenTelemetry + Vercel AI SDK | トークン数・レスポンス時間 |

### 構造の例(将来)

```
evals/
├── ai-summary/
│   ├── fixtures/          ← 過去記事の要約サンプル
│   ├── prompts/           ← バージョン管理されたプロンプト
│   ├── eval.test.ts       ← Vitest 実行
│   └── results/           ← 実行結果(gitignore)
└── promptfoo.config.yaml
```

### プロンプトのバージョニング

- プロンプトは **ファイルとしてコード管理**(`lib/ai/prompts/summarize.ts`)
- 変更時は git diff でレビュー
- 大きく変える時は ADR を書く

---

## 7. AI開発のメトリクス

PostHog や Sentry に以下を計測すると改善ループが回る:

- AI関数の成功率
- レスポンス時間
- 入出力トークン数
- ユーザーが「再生成」した回数
- プロンプトバージョン別の精度

---

## 8. 安全策(ガードレール)

### 入力検証

- ユーザーからの自由入力は Zod parse
- LLMに渡す前に **PII を除去** or **匿名化**
- 上限長を必ず設ける

### 出力検証

- LLM出力を **Zod parse** で構造化
- 想定外の出力は再生成 or fallback
- ハルシネーション対策(参照URL等の事実性チェック)

### Rate limit

- 1ユーザーあたりの呼び出し回数を制限
- 異常な大量呼び出しを Sentry alert

---

## 9. コミットの conventions(AI生成コードの追跡)

### Conventional Commits

すべてのコミットは型prefix付き:

```
feat(feed): add infinite scroll
fix(bookmarks): handle race condition on rapid toggle
refactor(shared): extract Result type
docs(adr): add 0007 ci/cd strategy
chore(deps): bump @sentry/nextjs to v8.45
```

### AI生成の明示(オプション)

AI主導で書いたコードはコミットメッセージのfooterで明示:

```
feat(feed): implement article cache

Generated with: Claude Code (Opus 4.7)
Reviewed-by: human
```

PRの「AI assist 利用状況」セクションでも明記。

---

## 10. ローカル開発のAI連携

### おすすめ作業フロー

1. `gh issue view NNN` で対象のIssueを把握
2. `git checkout -b feat/xxx` で作業ブランチ
3. 該当 `docs/features/{name}.md` と関連ADRを確認
4. Claude Code で `EnterPlanMode` → 計画立案
5. 計画承認後に実装
6. `bun run check`(lint + depcruise + typecheck + unit test = CI の Lint/Typecheck/Test 相当)で push 前に一括確認
7. `/code-review` でセルフレビュー
8. PR作成(テンプレに従う)
9. CI green を確認

### 効率化Tips

- `bun run dev:all` で Next.js + Trigger.dev + Drizzle Studio を並行起動
- `bun run db:studio` で Drizzle Studio を開いてデータ確認
- PostHog の Session Replay で実ユーザー操作を見る
- Sentry の Issue Stream を `gh issue list` 的に活用

---

## 11. 禁止事項

| 禁止 | 理由 |
|---|---|
| AI に `.env` の中身を見せる | 秘密情報漏洩 |
| AI に DB の本番接続情報を渡す | 本番事故 |
| `--no-verify` でcommit | pre-commit hook bypass |
| 認証ロジックを目視せずmerge | セキュリティ事故 |
| プロンプトに PII を生で入れる | データ漏洩 |
| Eval なしで AI機能をリリース | 品質劣化検知不可 |

---

## 12. 参照

- `AGENTS.md` — 全エージェント共通の指示
- `CLAUDE.md` — Claude Code 固有設定
- `docs/principles/code.md` — コーディング規約
- `docs/architecture/security.md` — セキュリティ設計
- `docs/principles/testing.md` — テスト戦略
- `docs/adr/0008-ai-engineering-harness.md` — このハーネス設計の判断記録
