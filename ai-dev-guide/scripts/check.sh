#!/usr/bin/env bash
# ============================================================
# check.sh — ai-dev-guide 机械门禁（10 项）
# 用法：
#   check.sh                    源仓模式（在本仓库根运行）
#   check.sh --deployed <dir>   部署模式（在已部署的目标项目根运行）
#   check.sh --only 1,5,6       只跑指定门禁
#   check.sh --skip 9,10        跳过指定门禁
# 复杂校验逻辑在 _gates.py；本脚本只做编排与 bash 原生门禁（9/10）。
# 历史面豁免：specs/、docs/journal/、docs/archive/、CHANGELOG.md
#   允许出现旧词汇/旧路径（变更故事的合法归宿）。
# ============================================================
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

MODE="source"; TARGET=""
ONLY=""; SKIP=""
while [ $# -gt 0 ]; do
  case "$1" in
    --deployed) MODE="deployed"; TARGET="$(cd "$2" 2>/dev/null && pwd)"; shift 2 ;;
    --only) ONLY="$2"; shift 2 ;;
    --skip) SKIP="$2"; shift 2 ;;
    *) echo "未知参数 $1"; exit 2 ;;
  esac
done

if [ "$MODE" = "source" ]; then ROOT="$HERE/.."; else ROOT="$TARGET"; fi
if [ "$MODE" = "deployed" ] && { [ -z "$TARGET" ] || [ ! -d "$TARGET" ]; }; then
  echo "✗ --deployed 目标目录不存在或不可进入——拒绝回退到当前目录扫描"
  exit 2
fi
cd "$ROOT" || { echo "✗ 无法进入 $ROOT"; exit 2; }
# 部署模式：本脚本位于 <目标>/<sys>/scripts/ —— sys 目录名由此推得（支持 --dir 改名）
if [ "$MODE" = "deployed" ]; then
  SYS_DIR="$(basename "$(dirname "$HERE")")"
else
  SYS_DIR=""
fi
export DSH_GATE_MODE="$MODE" DSH_SYS_DIR="$SYS_DIR"
FAIL=0; WARN=0; RAN=""

want() {
  if [ -n "$ONLY" ] && ! echo ",$ONLY," | grep -q ",$1,"; then return 1; fi
  if [ -n "$SKIP" ] && echo ",$SKIP," | grep -q ",$1,"; then return 1; fi
  return 0
}
mark() { RAN="$RAN $1"; }
bad()  { echo "✗ [$1] $2"; FAIL=1; }
ok()   { echo "✓ [$1] $2"; }
warn() { echo "⚠ [$1] $2"; WARN=1; }

# ---------- 门禁 1：链接校验（{{SYS}} 规则感知） ----------
if want 1; then mark 1
  if [ "$MODE" = "source" ]; then
    python3 "$HERE/_gates.py" links source || FAIL=1
  else
    python3 "$HERE/_gates.py" links deployed || FAIL=1
  fi
fi

# ---------- 门禁 2：行数预算（manifest 驱动） ----------
if want 2; then mark 2
  if [ "$MODE" = "source" ]; then
    python3 "$HERE/_gates.py" budget || FAIL=1
  else
    ok 2 "部署模式跳过（预算属源仓门禁）"
  fi
fi

# ---------- 门禁 3：占位符残留 ----------
if want 3; then mark 3
  if [ "$MODE" = "source" ]; then
    python3 "$HERE/_ph_gate.py" || FAIL=1
  else
    ok 3 "部署模式：项目占位符由 init 首检报告"
  fi
fi

# ---------- 门禁 4：MUST 稀缺性 ----------
if want 4; then mark 4
  if [ "$MODE" = "source" ]; then
    python3 "$HERE/_gates.py" must || FAIL=1
  else
    ok 4 "部署模式由源仓保证"
  fi
fi

# ---------- 门禁 5：生成物幂等 ----------
if want 5; then mark 5
  if [ "$MODE" = "source" ]; then
    if python3 "$HERE/gen-index.py" --check >/dev/null 2>&1; then ok 5 "GEN 段与 manifest 一致（幂等）"
    else bad 5 "GEN 段漂移——运行 python3 scripts/gen-index.py 同步"; fi
  else
    ok 5 "部署模式不适用（无 manifest）"
  fi
fi

# ---------- 门禁 6：§引用可解析 ----------
if want 6; then mark 6
  python3 "$HERE/_gates.py" sections || FAIL=1
fi

# ---------- 门禁 7：唯一归宿表指纹 ----------
if want 7; then mark 7
  for KEY in priority status-flow patch-three; do
    N=$(grep -rl "CANON:${KEY}" --include='*.md' . 2>/dev/null | wc -l)
    if [ "$N" -eq 1 ]; then ok 7 "CANON:${KEY} 唯一归宿"
    elif [ "$N" -eq 0 ]; then warn 7 "CANON:${KEY} 未标记（迁移期允许）"
    else bad 7 "CANON:${KEY} 出现 ${N} 处——唯一归宿被破坏"; fi
  done
fi

# ---------- 门禁 8：术语与禁用词 ----------
if want 8; then mark 8
  BANNED=$(grep -rn '维度[ ]*[1-5]' --include='*.md' . 2>/dev/null | grep -vE 'specs/|docs/journal/|docs/archive/|CHANGELOG' | head -5 || true)
  BANNED2=$(grep -rn 'D[0-4][ ]*维度' --include='*.md' . 2>/dev/null | grep -vE 'specs/|docs/journal/|docs/archive/|CHANGELOG' | head -5 || true)
  BANNED3=$(grep -rn 'ai-spec/ai-dev-docs' --include='*.md' . 2>/dev/null | grep -vE 'specs/|docs/journal/|docs/archive/|CHANGELOG' | head -5 || true)
  if [ -n "$BANNED$BANNED2$BANNED3" ]; then
    bad 8 "退役词汇残留（合法归宿仅 specs/journal/archive/CHANGELOG）"
    echo "$BANNED"; echo "$BANNED2"; echo "$BANNED3"
  else ok 8 "零退役词汇（旧维度编号/旧仓库名）"; fi
  if [ "$MODE" = "source" ]; then
    MISS=""
    for T in 铁律 红线 门禁 承重规则; do
      grep -q "$T" meta/system-design.md 2>/dev/null || MISS="$MISS $T"
    done
    if [ -n "$MISS" ]; then bad 8 "术语表缺：$MISS"
    else ok 8 "承重术语已定义于 meta/system-design.md"; fi
  fi
fi

# ---------- 门禁 9：backlog 不变量（部署模式） ----------
if want 9; then mark 9
  if [ "$MODE" = "deployed" ] && [ -f backlog.md ]; then
    NX=$(grep -c '^- \[x\]' backlog.md || true)
    if [ "$NX" -gt 0 ]; then
      bad 9 "backlog 含 $NX 个顶层 [x]——完结条目必须迁入 docs/journal/"
      grep -n '^- \[x\]' backlog.md | head -3
    else ok 9 "零完结残留"; fi
    NEXT=$(grep -oP '下一编号：\*\*#\K[0-9]+' backlog.md | head -1)
    if [ -n "$NEXT" ]; then
      MAX=$(cat backlog.md docs/journal/*.md docs/specs/*.md 2>/dev/null | grep -v '下一编号' | grep -oP '(^|\s|\*\*|>)#\K[0-9]{1,4}(?=[\s：:*）]|$)' | sort -n | tail -1)
      [ -z "$MAX" ] && MAX=0
      if [ "$NEXT" -le "$MAX" ]; then bad 9 "计数器 #$NEXT ≤ 最大编号 #$MAX"; else ok 9 "计数器 #$NEXT > #$MAX"; fi
    else bad 9 "缺「下一编号：**#N**」计数器"; fi
    DANGLING=$(grep -oP '\]\(\K(docs/[^)#]+)' backlog.md 2>/dev/null | sort -u | while read -r p; do [ -e "$p" ] || echo "$p"; done)
    if [ -n "$DANGLING" ]; then bad 9 "悬空链接：$DANGLING"; else ok 9 "卡片链接全部存在"; fi
    NA=$(grep -c 'docs/archive/' backlog.md || true)
    if [ "$NA" -gt 0 ]; then bad 9 "backlog 含 $NA 处 archive 引用"; else ok 9 "零 archive 引用"; fi
    SECS=$(grep '^## P[0-3] ' backlog.md | awk '{print substr($2,1,2)}' | tr -d '\n')
    if [ "$SECS" = "P0P1P2P3" ]; then ok 9 "P0-P3 节有序唯一"; else bad 9 "P 节异常: '$SECS'"; fi
    L=$(wc -l < backlog.md)
    if [ "$L" -gt 250 ]; then warn 9 "backlog $L 行 > 250——考虑迁移"; else ok 9 "backlog $L 行 ≤ 250"; fi
  elif [ "$MODE" = "deployed" ]; then
    ok 9 "无 backlog.md，跳过"
  else
    ok 9 "源仓模式跳过（项目 backlog 门禁）"
  fi
fi

# ---------- 门禁 10：journal/specs 命名规约（部署模式） ----------
if want 10; then mark 10
  if [ "$MODE" = "deployed" ]; then
    BADN=$(ls docs/journal/*.md docs/specs/*.md 2>/dev/null | grep -v 'README.md' | grep -vE '[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+\.md$' | head -5 || true)
    if [ -n "$BADN" ]; then bad 10 "命名不符 YYYY-MM-DD-<kebab>.md：$BADN"; else ok 10 "journal/specs 命名合规"; fi
  else
    ok 10 "源仓模式跳过"
  fi
fi

echo "---"
echo "已运行门禁:$RAN"
if [ "$FAIL" -eq 0 ]; then
  echo "结果：通过$([ $WARN -eq 1 ] && echo '（含警告）')"
else
  echo "结果：不通过"
fi
exit $FAIL