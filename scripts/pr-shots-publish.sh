#!/usr/bin/env bash
# scripts/pr-shots.cjs で撮った変更前後の画像を、画像置き場ブランチ(factory-screenshots)に push し、
# PR 本文やコメントに貼る Markdown の比較表を標準出力に出す(ADR-0047)。
#
#   bash scripts/pr-shots-publish.sh <PR 番号> <画像ディレクトリ>
#
# 画像を PR のブランチに入れると main に残ってしまうため、main と履歴を共有しない専用ブランチに置く。
set -euo pipefail

PR=${1:?usage: bash scripts/pr-shots-publish.sh <pr-number> <shots-dir>}
SRC=$(cd "${2:?usage: bash scripts/pr-shots-publish.sh <pr-number> <shots-dir>}" && pwd)
BRANCH=factory-screenshots
cd "$(dirname "$0")/.."

REPO=$(git remote get-url origin | sed -E 's#^.*github\.com[:/]##; s#\.git$##; s#^git@[^:]+:##')
# プロキシ経由の URL(…/git/owner/repo)でも owner/repo だけを取り出す
REPO=$(echo "$REPO" | awk -F/ '{print $(NF-1)"/"$NF}')
WORKTREE=$(mktemp -d)
trap 'git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true' EXIT

if git fetch -q origin "$BRANCH" 2>/dev/null; then
  git worktree add -q "$WORKTREE" "origin/$BRANCH" --detach
else
  git worktree add -q --detach "$WORKTREE"
  (cd "$WORKTREE" && git checkout -q --orphan "$BRANCH" && git rm -rq --cached . && git clean -fdq)
fi

mkdir -p "$WORKTREE/pr-$PR"
cp "$SRC"/*.png "$WORKTREE/pr-$PR/"
# 標準出力は比較表だけにする(git やフックのメッセージは標準エラーへ)
(
  exec 1>&2
  cd "$WORKTREE"
  git add "pr-$PR"
  if ! git diff --cached --quiet; then
    git commit -q --no-verify -m "chore: screenshots for #$PR"
  fi
  for i in 1 2 3 4; do
    git push -q origin "HEAD:refs/heads/$BRANCH" && break
    # 別のセッションが同時に push したときは取り込み直して再送する
    git pull -q --rebase origin "$BRANCH" || true
    sleep $((2 ** i))
  done
)

url() { echo "https://github.com/$REPO/blob/$BRANCH/pr-$PR/$1?raw=true"; }

echo "| 画面 | Before | After |"
echo "|---|---|---|"
for after in "$SRC"/*-after.png; do
  [ -e "$after" ] || continue
  name=$(basename "$after" -after.png)
  before="$name-before.png"
  if [ -e "$SRC/$before" ]; then
    echo "| \`$name\` | <img src=\"$(url "$before")\" width=\"320\"> | <img src=\"$(url "$(basename "$after")")\" width=\"320\"> |"
  else
    echo "| \`$name\` | (なし) | <img src=\"$(url "$(basename "$after")")\" width=\"320\"> |"
  fi
done
