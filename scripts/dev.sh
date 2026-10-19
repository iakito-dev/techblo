#!/bin/bash
# `bun run dev` を Node 22 以上で起動する(.claude/launch.json から使う)。引数はそのまま next dev に渡す。
# - worktree には gitignore された .env.local が引き継がれないので、main 本体の .env.local を symlink する
# - PATH 上の node が 22 未満なら、入っているバージョンマネージャ(nvm / asdf)から 22 系を探して使う。
#   マシンごとにパスや版が違うので決め打ちしない
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -e .env.local ]; then
  main_env="$(git rev-parse --git-common-dir)/../.env.local"
  [ -f "$main_env" ] && ln -sf "$main_env" .env.local
fi

node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }

if [ "$(node_major)" -lt 22 ]; then
  if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
    nvm use >/dev/null # .nvmrc の版
  elif command -v asdf >/dev/null; then
    v="$(asdf list nodejs 2>/dev/null | tr -d ' *' | grep -E '^2[2-9]\.' | sort -V | tail -1 || true)"
    [ -n "$v" ] && export ASDF_NODEJS_VERSION="$v"
  fi
  if [ "$(node_major)" -lt 22 ]; then
    echo "Node 22 以上が見つかりません(現在: $(node --version 2>/dev/null || echo なし))。nvm / asdf / mise で入れてください" >&2
    exit 1
  fi
fi

exec bun run dev "$@"
