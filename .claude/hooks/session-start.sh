#!/bin/bash
# セッション開始時に「lint / typecheck / test / dev がそのまま動く」状態へ揃える。
# - Claude Code on the web: セッションごとに新規 clone するため node_modules が無い
# - ローカルの git worktree: node_modules も gitignore された .env.local も引き継がれない
# main 本体のチェックアウトは install 済み前提なので何もしない。
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  # frozen にしない: コンテナ状態はフック完了後にキャッシュされるので差分 install で十分速い
  bun install
  exit 0
fi

# worktree では .git がディレクトリではなくファイルになる
[ -f .git ] || exit 0

main_root="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"
if [ ! -e .env.local ] && [ -f "$main_root/.env.local" ]; then
  ln -s "$main_root/.env.local" .env.local
fi

if [ ! -d node_modules ]; then
  # stdout はセッションのコンテキストに入るので捨てる。失敗してもセッション開始は止めない
  bun install --frozen-lockfile >/dev/null 2>&1 || echo "bun install に失敗しました。手動で実行してください" >&2
fi
