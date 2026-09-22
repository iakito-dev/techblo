#!/bin/bash
# PostToolUse(Edit|Write): 編集されたファイルだけ Biome で整形する。
# 対象パスは stdin の JSON(tool_input.file_path)で渡される。整形失敗で編集自体は止めない。
file=$(bun -e 'const i = await Bun.stdin.json(); console.log(i.tool_input?.file_path ?? "")' 2>/dev/null)
[ -n "$file" ] && [ -f "$file" ] || exit 0

bunx --bun biome check --write --no-errors-on-unmatched --files-ignore-unknown=true "$file" >/dev/null 2>&1 || true
