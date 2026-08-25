#!/usr/bin/env bash
# ============================================================
# release-version.sh — 相位阶梯版本管理（dev.n → beta → 正式版）
# 规则（workflows/release.md §2.1）：
#   每个新版本必须从上一正式版 bump 出 dev.1，依次走过 开发版 → 测试版 → 正式版；
#   禁止跳级（stable→beta、dev→stable 均非法）；beta 发现缺陷退回同版本 dev（n 续增）。
# 版本文件：KEY=VALUE 文本（VERSION_NAME / VERSION_CODE / DEV_CYCLE）。
#   DEV_CYCLE 由脚本维护（记录当前版本已用过的最大 dev 序号），禁止手改。
# ============================================================
set -euo pipefail

usage() {
cat <<'EOF'
用法: release-version.sh <版本文件> <命令> [选项]
命令:
  current                         显示当前 VERSION_NAME
  init <x.y.z>                    初始化版本文件（正式版，VERSION_CODE=1）
  next --bump <major|minor|patch> 正式版 → 下一版本 dev.1（新版本唯一入口）
  dev                             dev.n → dev.n+1（同版本继续迭代；beta 退回修复同用此命令）
  beta                            dev.n → beta（同版本）
  stable                          beta → 正式版（去后缀）
  validate                        校验版本文件格式与相位合法性（发版前必跑）
选项:
  --dry-run                       只显示将写入的版本，不落盘
EOF
exit 2; }

FILE="${1:-}"; CMD="${2:-}"; DRY=0; BUMP=""; EXTRA=""
[ -n "$FILE" ] && [ -n "$CMD" ] || usage
shift 2 || true
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1; shift ;;
    --bump) BUMP="$2"; shift 2 ;;
    *) [ -z "$EXTRA" ] || { echo "✗ 多余的位置参数：$1"; exit 2; }
       EXTRA="$1"; shift ;;
  esac
done

die() { echo "✗ $1"; exit 1; }

# 位置参数只对 init（版本号）合法；其余命令出现即拒（防静默吞参）
if [ "$CMD" != "init" ] && [ -n "$EXTRA" ]; then
  die "$CMD 不接受位置参数：$EXTRA"
fi

read_file() {
  [ -f "$FILE" ] || die "版本文件不存在：$FILE（用 init <x.y.z> 创建）"
  VN=$(grep -E '^VERSION_NAME='  "$FILE" | tail -1 | cut -d= -f2-)
  VC=$(grep -E '^VERSION_CODE='  "$FILE" | tail -1 | cut -d= -f2-)
  DC=$(grep -E '^DEV_CYCLE='    "$FILE" | tail -1 | cut -d= -f2-)
  [ -n "$VN" ] || die "缺 VERSION_NAME"
  [ -n "$VC" ] || die "缺 VERSION_CODE"
}

write_file() { # $1=新VN $2=新VC $3=新DC
  if [ "$DRY" = 1 ]; then echo "[dry-run] VERSION_NAME=$1  VERSION_CODE=$2  DEV_CYCLE=$3"; return; fi
  sed -i.bak -e "s|^VERSION_NAME=.*|VERSION_NAME=$1|" \
              -e "s|^VERSION_CODE=.*|VERSION_CODE=$2|" \
              -e "s|^DEV_CYCLE=.*|DEV_CYCLE=$3|" "$FILE" && rm -f "$FILE.bak"
  echo "✓ VERSION_NAME=$1  VERSION_CODE=$2  DEV_CYCLE=$3"
}

parse() { # 解析 $VN → 相位
  if [[ "$VN" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    PHASE=stable; MAJ=${BASH_REMATCH[1]}; MIN=${BASH_REMATCH[2]}; PAT=${BASH_REMATCH[3]}; DN=0
  elif [[ "$VN" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)-dev\.([0-9]+)$ ]]; then
    PHASE=dev; MAJ=${BASH_REMATCH[1]}; MIN=${BASH_REMATCH[2]}; PAT=${BASH_REMATCH[3]}; DN=${BASH_REMATCH[4]}
  elif [[ "$VN" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)-beta$ ]]; then
    PHASE=beta; MAJ=${BASH_REMATCH[1]}; MIN=${BASH_REMATCH[2]}; PAT=${BASH_REMATCH[3]}; DN=0
  else
    die "VERSION_NAME 非法：$VN（合法格式 x.y.z / x.y.z-dev.n / x.y.z-beta）"
  fi
}

case "$CMD" in
  current)
    [ -z "$EXTRA" ] || { echo "✗ current 不接受位置参数：$EXTRA"; exit 2; }
    read_file; echo "$VN" ;;

  init)
    NEW="$EXTRA"
    [[ "$NEW" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "init 需要正式版号 x.y.z（得到：$NEW）"
    [ -f "$FILE" ] && die "版本文件已存在；如需重置请人工确认后删除"
    if [ "$DRY" = 1 ]; then echo "[dry-run] 初始化 $FILE：VERSION_NAME=$NEW VERSION_CODE=1 DEV_CYCLE=0"; exit 0; fi
    printf 'VERSION_NAME=%s\nVERSION_CODE=1\nDEV_CYCLE=0\n' "$NEW" > "$FILE"
    echo "✓ 已初始化 $FILE：$NEW（VERSION_CODE=1）" ;;

  next)
    read_file; parse
    [ "$PHASE" = stable ] || die "next 只能从正式版出发（当前 $VN 是 $PHASE）；先走完 beta → stable"
    case "$BUMP" in
      major) N="$((MAJ+1)).0.0" ;;
      minor) N="$MAJ.$((MIN+1)).0" ;;
      patch) N="$MAJ.$MIN.$((PAT+1))" ;;
      *) die "next 需要 --bump <major|minor|patch>（递进判据见 release.md §2.1）" ;;
    esac
    write_file "$N-dev.1" "$((VC+1))" 1 ;;

  dev)
    read_file; parse
    case "$PHASE" in
      dev)  write_file "$MAJ.$MIN.$PAT-dev.$((DN+1))" "$((VC+1))" "$((DN+1))" ;;
      beta) [ -n "$DC" ] && [ "$DC" -ge 1 ] 2>/dev/null || die "缺 DEV_CYCLE，无法从 beta 退回 dev"
            write_file "$MAJ.$MIN.$PAT-dev.$((DC+1))" "$((VC+1))" "$((DC+1))" ;;
      stable) die "正式版不能直接回 dev；用 next --bump 开启新版本" ;;
    esac ;;

  beta)
    read_file; parse
    [ "$PHASE" = dev ] || die "只有开发版可升 beta（当前 $VN 是 $PHASE）——阶梯不可跳级"
    write_file "$MAJ.$MIN.$PAT-beta" "$((VC+1))" "${DC:-$DN}" ;;

  stable)
    read_file; parse
    [ "$PHASE" = beta ] || die "只有测试版可转正（当前 $VN 是 $PHASE）——阶梯不可跳级"
    write_file "$MAJ.$MIN.$PAT" "$((VC+1))" "${DC:-0}" ;;

  validate)
    read_file; parse
    [ "$VC" -ge 1 ] 2>/dev/null || die "VERSION_CODE 必须为 ≥1 的整数（当前 $VC）"
    if [ -n "$DC" ]; then
      [ "$DC" -ge 0 ] 2>/dev/null || die "DEV_CYCLE 必须为 ≥0 的整数（当前 $DC）"
      if [ "$PHASE" = dev ] && [ "$DC" != "$DN" ]; then
        die "DEV_CYCLE($DC) 与 dev 序号($DN) 不一致"
      fi
    fi
    echo "✓ $VN（相位 $PHASE，VERSION_CODE=$VC）格式合法" ;;

  *) usage ;;
esac