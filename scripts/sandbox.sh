#!/usr/bin/env bash
# ローカルのサンドボックス(使い捨て Postgres + デモデータ + next dev)を起動する。
#
# クラウドのエージェント環境から本番 DB や RSS の取得先には届かないため、UI を変える作業で
# 画面を実際に見て確かめるのに使う(ソフトウェアファクトリー / ADR-0046)。人の手元でも使える。
#
#   bash scripts/sandbox.sh up     # DB 起動 → マイグレーション → 企業マスタ → デモ記事 → next dev(:3100)
#   bash scripts/sandbox.sh env    # サンドボックスの環境変数を表示(eval "$(bash scripts/sandbox.sh env)")
#   bash scripts/sandbox.sh down   # next dev と DB を止める
#
# データは $SANDBOX_DIR(既定 /tmp/techblo-sandbox)に置き、.env.local には触れない。
set -euo pipefail

SANDBOX_DIR=${SANDBOX_DIR:-/tmp/techblo-sandbox}
PG_PORT=${SANDBOX_PG_PORT:-54329}
APP_PORT=${SANDBOX_APP_PORT:-3100}
PGDATA="$SANDBOX_DIR/pg"
cd "$(dirname "$0")/.."

pg_bin() {
  local dir
  dir=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
  if [ -z "$dir" ]; then
    dir=$(dirname "$(command -v initdb 2>/dev/null || true)")
  fi
  if [ ! -x "$dir/initdb" ]; then
    echo "Postgres のサーバーバイナリ(initdb)が見つかりません" >&2
    exit 1
  fi
  echo "$dir"
}

# initdb / postgres は root で動かせないため、root のときは postgres ユーザーで動かす
as_pg() {
  if [ "$(id -u)" = 0 ]; then
    su postgres -s /bin/bash -c "$(printf '%q ' "$@")"
  else
    "$@"
  fi
}

print_env() {
  cat <<EOF
export DATABASE_URL=postgresql://postgres@127.0.0.1:$PG_PORT/techblo
export BETTER_AUTH_SECRET=sandbox-secret-sandbox-secret-sandbox
export BETTER_AUTH_URL=http://localhost:$APP_PORT
export NEXT_PUBLIC_APP_URL=http://localhost:$APP_PORT
export NEXT_PUBLIC_POSTHOG_KEY=phc_sandbox
export NEXT_PUBLIC_POSTHOG_HOST=http://localhost:9
export SKIP_ENV_VALIDATION=true
EOF
}

up() {
  local bin
  bin=$(pg_bin)
  mkdir -p "$SANDBOX_DIR"
  chmod 777 "$SANDBOX_DIR"
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    as_pg "$bin/initdb" -D "$PGDATA" -U postgres --auth=trust >/dev/null
  fi
  if ! as_pg "$bin/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    as_pg "$bin/pg_ctl" -D "$PGDATA" -l "$SANDBOX_DIR/pg.log" -w \
      -o "-p $PG_PORT -k $SANDBOX_DIR -c listen_addresses=127.0.0.1" start >/dev/null
  fi
  psql -h 127.0.0.1 -p "$PG_PORT" -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='techblo'" | grep -q 1 \
    || psql -h 127.0.0.1 -p "$PG_PORT" -U postgres -c "CREATE DATABASE techblo" >/dev/null

  eval "$(print_env)"
  bunx --bun drizzle-kit migrate >/dev/null
  bun run scripts/seed.ts >/dev/null
  bun run scripts/sandbox-demo-data.ts

  if ! curl -fsS -o /dev/null "http://localhost:$APP_PORT/healthz" 2>/dev/null \
    && ! curl -fsS -o /dev/null "http://localhost:$APP_PORT/" 2>/dev/null; then
    # next dev は起動時に AGENTS.md / CLAUDE.md のエージェント向けブロックを書き直す。
    # 作業の差分に混ざると保護領域の変更になり、ファクトリーの PR が自動マージできなくなるので戻す
    local agent_files_clean=true
    git diff --quiet -- AGENTS.md CLAUDE.md || agent_files_clean=false
    nohup bunx next dev --port "$APP_PORT" >"$SANDBOX_DIR/next.log" 2>&1 &
    echo $! >"$SANDBOX_DIR/next.pid"
    for _ in $(seq 1 90); do
      if curl -fsS -o /dev/null "http://localhost:$APP_PORT/" 2>/dev/null; then break; fi
      sleep 2
    done
    if [ "$agent_files_clean" = true ]; then git checkout -- AGENTS.md CLAUDE.md; fi
  fi
  echo "サンドボックス起動: http://localhost:$APP_PORT (ログ: $SANDBOX_DIR/next.log)"
}

down() {
  if [ -f "$SANDBOX_DIR/next.pid" ]; then
    kill "$(cat "$SANDBOX_DIR/next.pid")" 2>/dev/null || true
    rm -f "$SANDBOX_DIR/next.pid"
  fi
  if [ -f "$PGDATA/PG_VERSION" ]; then
    as_pg "$(pg_bin)/pg_ctl" -D "$PGDATA" stop -m fast >/dev/null 2>&1 || true
  fi
  echo "サンドボックスを停止しました"
}

case "${1:-}" in
  up) up ;;
  env) print_env ;;
  down) down ;;
  *)
    echo "usage: bash scripts/sandbox.sh up|env|down" >&2
    exit 1
    ;;
esac
