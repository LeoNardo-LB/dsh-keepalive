#!/usr/bin/env bash
# ============================================================
# new-batch.sh — 创建新的工作批次 journal 文件
# 用法：new-batch.sh "<批次名kebab>"（在目标项目根运行）
# 产物：docs/journal/YYYY-MM-DD-<批次名>.md（由 templates/journal-entry.md 实例化）
# 纪律：开工时创建；证据直接写入；完结条目从 backlog 原文迁入。
# ============================================================
set -euo pipefail
NAME="${1:-}"
[ -n "$NAME" ] || { echo '用法: new-batch.sh "<批次名kebab>"'; exit 2; }
echo "$NAME" | grep -qE '^[a-z0-9][a-z0-9-]*$' || { echo '✗ 批次名须为 kebab-case（小写字母数字连字符）'; exit 2; }

# 定位模板：优先项目内部 ai-dev-guide，其次本脚本同级
for CAND in "ai-dev-guide/templates/journal-entry.md" "$(dirname "$0")/../templates/journal-entry.md"; do
  [ -f "$CAND" ] &&TPL="$CAND" && break
done
[ -f "${TPL:-}" ] || { echo '✗ 未找到 templates/journal-entry.md'; exit 1; }

DATE=$(date +%F)
mkdir -p docs/journal
OUT="docs/journal/${DATE}-${NAME}.md"
[ -f "$OUT" ] && { echo "✗ 已存在 $OUT"; exit 1; }
sed -e "s/<批次名>/<批次：$NAME>/" -e "s/<YYYY-MM-DD>/$DATE/g" "$TPL" > "$OUT"
echo "✓ $OUT"
echo "  开工即写入；证据直接追加；完结条目从 backlog 原文迁入本文件。"