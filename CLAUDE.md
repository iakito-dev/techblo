# CLAUDE.md

Claude Code 向けの指示。共通の指示は `AGENTS.md` を参照してください。

## 必読(優先順)

1. `AGENTS.md` — 全エージェント共通の指示(コーディング規則・モジュール境界・禁止事項)
2. `docs/README.md` — ドキュメント索引
3. 該当する `docs/features/*.md` と `docs/adr/*.md`

## ローカル実行環境(必読)

このリポジトリは **Node 22 以上** 前提(`.nvmrc` = `22` / `.tool-versions`)。ただし node が要るのは `next` を起動する `bun run dev` / `build` / `start` だけ。lint 以外の検証(`typecheck` / `depcruise` / `test*`)と lefthook のフックは `bunx --bun` で Bun ランタイムに固定してあり、PATH 上の node の版に左右されない。

- `next` を動かす前に `node --version` で 22 以上か確かめる。足りていれば追加の設定は不要
- 古い場合、Bash ツールはコマンド間でシェル状態を保持しないので、node を使うコマンドごとに版を指定する(バージョンマネージャはマシン依存。パスを決め打ちせず、入っている版を確かめてから使う)
  - asdf: `asdf list nodejs` で入っている 22 系を確認 → `ASDF_NODEJS_VERSION=<その版> <bun/git コマンド>`
  - nvm: `nvm use >/dev/null && <コマンド>`
- 新しい node 製ツールを scripts やフックに足すときも `bunx --bun <tool>` で起動する(素の `<tool>` だと古い node を拾って落ちる環境がある)
- git worktree で開いたセッションは SessionStart フック(`.claude/hooks/session-start.sh`)が `.env.local` の symlink と `bun install` を済ませる。手動で揃える必要はない

## Claude固有の設定

### インストール済みスキル

| スキル | 用途 |
|---|---|
| `.agents/skills/find-skills` | 追加スキルの探索・インストール |
| `.agents/skills/ckm-design-system` | デザイントークン設計(3層アーキテクチャ) |

スキルが必要そうな場面では `find-skills` を起動して探索してください。

### Claude Code 利用時の作業手順

1. タスク開始前に `AGENTS.md` のチェックリストを参照
2. 該当する `docs/features/{name}.md` を読む
3. `TaskCreate` で作業を細分化(3ステップ以上の作業の場合)
4. 実装後に該当 `docs/features/{name}.md` を更新
5. アーキテクチャ判断を伴う変更は `docs/adr/` に新規ADRを追加

### アーキ規約(ADR-0010)

- 各 feature は4層に分割: `domain`(純粋TS)/ `application`(ユースケース + dto)/ `infrastructure`(Drizzle Repository)/ `web`(queries.ts composition root・actions.ts・view-models・components)
- 依存方向は内向きのみ: `web / infrastructure → application → domain`(逆流禁止)
- DB アクセスは `infrastructure` 層の Repository のみ(`db/` を直接 import してよいのは infrastructure)
- 新 feature は `bun run scaffold:feature <name>` で4層雛形を生成
- 実装後は `bun run depcruise` で依存方向を検証

### Plan モード

複雑な実装に取り掛かる前は `EnterPlanMode` で計画を立ててから実行してください。
Plan は ARCHITECTURE.md のレイヤー構造に従って作成します。

### コードレビュー

実装後の自己レビューには `code-review` skill を活用してください。
セキュリティが絡む変更には `security-review` を使ってください。

## 用語統一

- 「企業」= 公式テックブログを持つ会社(`companies` table)
- 「記事」= RSS取得した記事(`articles` table)
- 「ブックマーク」= 後で読む用の保存(`bookmarks` table)
- 「お気に入り」= 良かった記事の保存(`favorites` table)
- 「購読」= 表示対象の企業フィルタ(`subscriptions` table)

## ファイル参照記法

PR や応答内でファイルを参照する時は `[name](path:line)` 形式:
- 例: [article-card.tsx:42](features/feed/web/components/article-card.tsx:42)
