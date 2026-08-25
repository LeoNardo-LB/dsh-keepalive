#!/usr/bin/env bash
# ============================================================
# scan-secrets.sh — 敏感信息扫描（提交/发版前与 CI 运行）
# 检测：私钥/证书块、API token 各家格式、密码赋值、
#       内网地址、个人信息（邮箱/手机/身份证）。
# 白名单 scripts/scan-secrets.allow 两种规则（每行一条，# 开头为注释）：
#   路径 glob   如 scripts/scan-secrets.sh —— 整个文件放行（按路径匹配）
#   :字面量     以冒号起头 —— 仅当命中行包含该字面量时放行（内容豁免）
# 退出码：0 干净 / 1 发现疑似敏感信息
# 设计约束：计数与判定必须在主 shell 完成——命中先落临时文件再读，
#   禁止 grep | while 管道（子 shell 内变量自增会丢失）。
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."
FAIL=0; HITS=0
ALLOW=scripts/scan-secrets.allow
[ -f "$ALLOW" ] || : > "$ALLOW"

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

# 路径规则：整个文件放行（glob 匹配相对仓根路径）
allow_path() {
  local f="$1" rule
  f="./${f#./}"
  while IFS= read -r rule; do
    case "$rule" in ''|'#'*|:*) continue ;; esac
    case "$f" in ./$rule) return 0 ;; esac
  done < "$ALLOW"
  return 1
}

# 内容规则：命中行包含指定字面量时放行
allow_content() {
  local content="$1" rule
  while IFS= read -r rule; do
    case "$rule" in :*) ;; *) continue ;; esac
    rule="${rule#:}"
    [ -z "$rule" ] && continue
    case "$content" in *"$rule"*) return 0 ;; esac
  done < "$ALLOW"
  return 1
}

# $1=类别；$2=临时文件（每行 file:lineno）
scan_category() {
  local cat="$1" file="$2" line f n content
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    f="${line%%:*}"; n="${line##*:}"
    f="./${f#./}"
    if allow_path "$f"; then continue; fi
    content=$(sed -n "${n}p" "$f" 2>/dev/null | head -c 90)
    if allow_content "$content"; then continue; fi
    echo "✗ [$cat] $line"
    echo "    $content"
    HITS=$((HITS+1)); FAIL=1
  done < "$file"
}
echo "== 敏感信息扫描 =="

grep -rnI -E 'BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY|BEGIN CERTIFICATE' --include='*' . 2>/dev/null \
  | grep -v '^./.git/' | cut -d: -f1,2 > "$TMP" || true
scan_category "私钥/证书" "$TMP"

grep -rnI -E 'gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}' --include='*' . 2>/dev/null \
  | grep -v '^./.git/' | cut -d: -f1,2 > "$TMP" || true
scan_category "token" "$TMP"

grep -rniI -E '(password|passwd|secret|api[_-]?key|access[_-]?token).{0,4}[:=].{0,4}[^ <>{}]+' \
  --include='*.sh' --include='*.py' --include='*.yml' --include='*.yaml' --include='*.properties' . 2>/dev/null \
  | grep -v '^./.git/' \
  | grep -viE '占位|待填|placeholder|<[a-z]+>|\$\{|用 Secrets|CI Secrets|不进.?git|Secrets? 注入' \
  | cut -d: -f1,2 > "$TMP" || true
scan_category "密钥赋值" "$TMP"

grep -rnI -E '\b(10\.[0-9]+|172\.(1[6-9]|2[0-9]|3[01])|192\.168)\.[0-9]+\.[0-9]+\b' \
  --include='*.md' --include='*.yml' --include='*.sh' . 2>/dev/null \
  | grep -v '^./.git/' | grep -v '10\.0\.2\.2' \
  | grep -vE '示例|范文|template|待填' \
  | cut -d: -f1,2 > "$TMP" || true
scan_category "内网地址" "$TMP"

grep -rnI -E '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-z]{2,})+' --include='*.md' --include='*.yml' --include='*.sh' . 2>/dev/null \
  | grep -v '^./.git/' \
  | grep -vE 'semver\.org|keepachangelog\.com|github\.com|example\.com|@param|@see|@return' \
  | cut -d: -f1,2 > "$TMP" || true
scan_category "邮箱" "$TMP"

grep -rnI -E '\b1[3-9][0-9]{9}\b|\b[0-9]{17}[0-9Xx]\b' --include='*.md' . 2>/dev/null \
  | grep -v '^./.git/' | cut -d: -f1,2 > "$TMP" || true
scan_category "手机/身份证" "$TMP"

echo "---"
if [ "$FAIL" -eq 0 ]; then
  echo "扫描结果：干净（0 疑似命中）"
else
  echo "扫描结果：发现 $HITS 处疑似敏感信息"
  echo "处置：真敏感 → 脱敏后重新提交；确认误报 → 加白名单 scripts/scan-secrets.allow（路径 glob 或 :字面量）"
  exit 1
fi
