#!/usr/bin/env python3
# ============================================================
# _gates.py — check.sh 的 python 门禁内核（链接/预算/MUST/§引用）
# 由 check.sh 调用；不直接人工运行。
# 用法：_gates.py <gate> [args...]
#   links <mode>            门禁 1：相对链接校验（{{SYS}} 规则）
#   budget                  门禁 2：行数预算（manifest 驱动）
#   must                    门禁 4：MUST 稀缺性
#   sections                门禁 6：§引用可解析
# ============================================================
import re, os, sys, glob

DEPLOYED_SCOPE = ("AGENTS.md", "AGENTS.md.new", "CONTEXT.md", "backlog.md",
                   "docs/ability-domains.md", "docs/architecture-debt.md")

def repo_files(mode="source"):
    """source 模式扫全仓；deployed 模式只扫本系统产物（用户自己的 md 不属门禁管辖）。"""
    files = [f for f in glob.glob("**/*.md", recursive=True)]
    files += [f for f in glob.glob("**/*.md.template", recursive=True)]
    files += ["AGENTS.md.template"] if os.path.exists("AGENTS.md.template") else []
    seen, out = set(), []
    for f in files:
        if f not in seen:
            seen.add(f); out.append(f)
    if mode == "deployed":
        sysdir = os.environ.get("DSH_SYS_DIR", "ai-dev-guide")
        out = [f for f in out
               if f in DEPLOYED_SCOPE or f.startswith(sysdir + "/")
               or f.startswith("docs/journal/") or f.startswith("docs/specs/")]
    return out

def hist_exempt(f):
    return f.startswith(("specs/", "docs/journal/", "docs/archive/", "docs/adr/")) or f == "CHANGELOG.md"

def load_manifest():
    src = open("scripts/gen-index.py", encoding="utf-8").read().replace(
        'if __name__ == "__main__":', 'if False:')
    ns = {}
    ns['__file__'] = os.path.abspath('scripts/gen-index.py')
    exec(compile(src, "gen-index", "exec"), ns)
    return ns["load"]()

def gate_links(mode):
    broken = []
    for f in repo_files(mode):
        if hist_exempt(f): continue
        base = os.path.dirname(f)
        for i, line in enumerate(open(f, encoding="utf-8"), 1):
            for m in re.finditer(r"\]\(([^)\s]+)\)", line):
                t = m.group(1)
                if t.startswith(("http://", "https://", "mailto:", "#")): continue
                t2 = (t.split("#")[0] or t).strip()
                if "{{SYS}}" in t2:
                    if mode == "source" and f == "AGENTS.md.template": continue
                    broken.append(f"{f}:{i} 残留 {{SYS}}: {t2}"); continue
                if t2.startswith("<"): continue
                p = os.path.normpath(os.path.join(base, t2))
                if not os.path.exists(p): broken.append(f"{f}:{i} -> {t2}")
    if broken:
        print(f"✗ [1] 断链 {len(broken)} 处")
        for x in broken[:15]: print("  ", x)
        return 1
    print("✓ [1] 全部相对链接可解析（{{SYS}} 规则符合模式）")
    return 0

def gate_budget():
    data = load_manifest()
    over = []
    for d in data["docs"]:
        if d["kind"] == "template": continue
        budget = int(d.get("budget", data["defaults"]["line_budget"]))
        p = d["path"]
        if not os.path.exists(p): continue
        n = sum(1 for _ in open(p, encoding="utf-8"))
        if n > budget: over.append(f"{p}: {n} 行 > 预算 {budget}")
    if over:
        print(f"✗ [2] 超预算 {len(over)} 份")
        for x in over: print("  ", x)
        return 1
    print("✓ [2] 全部内容/登记文档在 manifest 申报预算内")
    return 0

def gate_must():
    data = load_manifest()
    limit = int(data["defaults"].get("must_limit", 7))
    n = sum(1 for d in data["docs"]
            if d["plane"] == "deployed" and d["level"] == "MUST"
            and d["indexed"] in ("true", True))
    if n > limit:
        print(f"✗ [4] 索引 MUST {n} 条 > 上限 {limit}——新增 MUST 必须挤掉一条旧的")
        return 1
    print(f"✓ [4] 索引 MUST {n} 条 ≤ {limit}")
    return 0

def gate_sections():
    bad_refs, total = [], 0
    headings = {}
    for f in repo_files(os.environ.get("DSH_GATE_MODE", "source")):
        if hist_exempt(f): continue
        base = os.path.dirname(f)
        for i, line in enumerate(open(f, encoding="utf-8"), 1):
            for m in re.finditer(r"§(\d+(?:\.\d+)?)", line):
                total += 1
                target = None
                lm = re.search(r"\]\(([^)\s]+\.md)\)", line)
                if lm:
                    t = lm.group(1).replace("{{SYS}}/", "")
                    cand = os.path.normpath(os.path.join(base, t))
                    if os.path.exists(cand): target = cand
                if target is None: target = f
                if target not in headings:
                    hs = set()
                    for h in open(target, encoding="utf-8"):
                        hm = re.match(r"^#{2,4}\s+(\d+)[\.\s]", h)
                        if hm: hs.add(hm.group(1))
                    headings[target] = hs
                sec = m.group(1).split(".")[0]
                if sec not in headings[target]:
                    bad_refs.append(f"{f}:{i} §{m.group(1)} 在 {target} 无对应编号标题")
    if bad_refs:
        print(f"✗ [6] §引用断裂 {len(bad_refs)} 处 / 共 {total}")
        for x in bad_refs[:15]: print("  ", x)
        return 1
    print(f"✓ [6] {total} 处 §引用全部可解析")
    return 0

def main():
    if len(sys.argv) < 2:
        print("用法: _gates.py <links|budget|must|sections> [args]"); return 2
    gate = sys.argv[1]
    if gate == "links":
        return gate_links(sys.argv[2] if len(sys.argv) > 2 else "source")
    if gate == "budget":
        return gate_budget()
    if gate == "must":
        return gate_must()
    if gate == "sections":
        return gate_sections()
    print(f"未知门禁 {gate}"); return 2

if __name__ == "__main__":
    sys.exit(main())
