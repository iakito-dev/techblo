#!/bin/bash
# Claude Code on the web はセッションごとに新規 clone するため node_modules が無く、
# lint / typecheck / test がそのままでは動かない。ローカルは install 済み前提なので何もしない。
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
# frozen にしない: コンテナ状態はフック完了後にキャッシュされるので差分 install で十分速い
bun install
