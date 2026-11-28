#!/usr/bin/env python3
"""Route a prompt to the right skill(s) and find conflicts between installed skills.

  route "<prompt>"  [--dirs D1,D2,…] [--top 8]     Rank matching skills, apply priority rules,
                                                  print primary / overlays / supporting / ask
  conflicts         [--dirs …] [--focus DIR] [--min 0.35]
                                                  Overlapping skills (similar triggers) and the
                                                  same name installed with different content
  table             [--dirs …] [--focus DIR]      Routing table (name, tier, top trigger words)

Default dirs (earlier wins ties): ~/.claude/skills, ~/.agents/skills; override with --dirs or
SKILL_ROUTER_DIRS (comma-separated). Rules: routing.toml next to this script, then the user's
~/.config/skill-router/routing.toml (or --rules FILE) on top. Standard library only (Python 3.11+).
"""
from __future__ import annotations

import hashlib
import math
import re
import sys
import tomllib
from collections import Counter, defaultdict
from pathlib import Path

import os

HOME = Path.home()
DEFAULT_DIRS = [HOME / ".claude/skills", HOME / ".agents/skills"]
USER_RULES = Path(os.environ.get("XDG_CONFIG_HOME", HOME / ".config")) / "skill-router" / "routing.toml"
STOP = set("""a an and are as at be by for from has have in into is it its of on or that the this to use
use when with without your you any all can will not only also via per more than then them they their
what which who how why where whether skill skills asked asks ask user users agent agents e g eg etc""".split())
# Built-in defaults; routing.toml can extend or replace them.
DEFAULT_RULES = {
    # Overlays are guards layered on top of whatever workflow runs; they are never the primary.
    # Workflow skills (debugging, planning) are "process" tier and compete to be primary.
    "overlays": {
        "strict-scope-reviewer": ["implement", "fix", "refactor", "feature", "code", "patch", "bug"],
        "git-guardrails": ["push", "force", "reset", "rebase", "delete branch"],
    },
    "process": ["debug", "investigat", "plan", "brainstorm", "review", "audit", "diagnos", "verif", "root-cause"],
    "project_prefixes": [],
    "project_dirs": [],   # skill folders whose skills count as project/owner-specific
    "prefer": {},    # "loser" = "winner": when both match, winner is primary
    "intents": {},   # skill name -> words/phrases that signal it (routing.toml supplies these)
}


def stem(w: str) -> str:
    for suf in ("ations", "ation", "ings", "ing", "ers", "er", "ies", "es", "ed", "s"):
        if len(w) > len(suf) + 3 and w.endswith(suf):
            return w[: -len(suf)] + ("y" if suf == "ies" else "")
    return w


def tokens(text: str) -> list[str]:
    return [stem(w) for w in re.findall(r"[a-z][a-z0-9+#.-]{2,}", text.lower()) if w not in STOP]


def frontmatter(path: Path) -> dict | None:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.S)
    if not m:
        return None
    fm, data, key = m.group(1), {}, None
    for line in fm.splitlines():
        km = re.match(r"^([a-zA-Z_-]+):\s*(.*)$", line)
        if km:
            key, val = km.group(1), km.group(2).strip()
            data[key] = "" if val in (">", "|", ">-", "|-") else val.strip("'\"")
        elif key and line.startswith((" ", "\t")):
            data[key] = (data.get(key, "") + " " + line.strip()).strip()
    if "name" not in data:
        return None
    data["_hash"] = hashlib.sha256(text.encode()).hexdigest()[:12]
    return data


def load(dirs: list[Path]):
    skills, by_name = [], defaultdict(list)
    for prio, d in enumerate(dirs):
        if not d.is_dir():
            continue
        for p in sorted(d.glob("*/SKILL.md")) + sorted(d.glob("*/*/SKILL.md")):
            fm = frontmatter(p)
            if not fm:
                continue
            by_name[fm["name"]].append((prio, p, fm["_hash"]))
            if len(by_name[fm["name"]]) > 1:
                continue            # first (highest-priority dir) copy wins for routing
            desc = fm.get("description", "")
            phrases = [x.lower() for x in re.findall(r'"([^"]{4,60})"', desc)]
            skills.append({"name": fm["name"], "desc": desc, "path": p, "prio": prio, "phrases": phrases,
                           "tokens": Counter(tokens(fm["name"].replace("-", " ") + " " + desc))})
    return skills, by_name


def idf_table(skills):
    df = Counter()
    for s in skills:
        df.update(set(s["tokens"]))
    n = len(skills)
    return {t: math.log((n + 1) / (c + 0.5)) for t, c in df.items()}


def rules(o) -> dict:
    r = {k: (dict(v) if isinstance(v, dict) else list(v)) for k, v in DEFAULT_RULES.items()}
    files = [Path(__file__).with_name("routing.toml"), Path(str(o["rules"])) if o.get("rules") else USER_RULES]
    for path in files:                       # bundled rules first, personal rules on top
        if not path.exists():
            continue
        user = tomllib.loads(path.read_text(encoding="utf-8"))
        for k, v in user.items():
            if isinstance(v, dict) and isinstance(r.get(k), dict):
                r[k].update(v)
            elif isinstance(v, list) and isinstance(r.get(k), list) and k != "process":
                r[k] = list(dict.fromkeys(r[k] + v))
            else:
                r[k] = v
    r["project_dirs"] = [str(Path(p).expanduser()) for p in r.get("project_dirs", [])]
    return r


def tier(s, R) -> str:
    if s["name"] in R["overlays"]:
        return "overlay"
    if any(p in s["name"] for p in R["process"]):
        return "process"
    if (R["project_prefixes"] and s["name"].startswith(tuple(R["project_prefixes"]))) or \
            any(str(s["path"]).startswith(d) for d in R["project_dirs"]):
        return "project"
    return "domain"


def score(prompt: str, s, idf) -> tuple[float, list[str]]:
    pt = Counter(tokens(prompt))
    why = []
    sc = sum(idf.get(t, 0) * min(pt[t], 2) for t in pt if t in s["tokens"])
    matched = [t for t in pt if t in s["tokens"]]
    pl = " " + re.sub(r"[^a-z0-9+#. -]", " ", prompt.lower()) + " "
    for ph in s["phrases"]:
        if " " not in ph.strip():
            continue                     # single quoted words are too generic to count as phrases
        if " " + ph + " " in pl or (len(ph) > 12 and ph in pl):
            sc += 8 + len(ph) / 6
            why.append(f'phrase "{ph}"')
    name_hit = [w for w in s["name"].split("-") if len(w) > 3 and stem(w) in pt]
    if name_hit:
        sc += 2 * len(name_hit)
    norm = math.sqrt(sum(v * v for v in s["tokens"].values())) or 1
    sc = sc / (norm ** 0.25)      # long descriptions shouldn't win by sheer size
    if matched:
        why.append("words: " + ", ".join(matched[:6]))
    return sc, why


def opts(argv):
    pos, o, i = [], {}, 0
    while i < len(argv):
        if argv[i].startswith("--"):
            if i + 1 < len(argv) and not argv[i + 1].startswith("--"):
                o[argv[i][2:]] = argv[i + 1]
                i += 2
                continue
            o[argv[i][2:]] = True
        else:
            pos.append(argv[i])
        i += 1
    return pos, o


def get_dirs(o) -> list[Path]:
    spec = o.get("dirs") or os.environ.get("SKILL_ROUTER_DIRS")
    return [Path(d).expanduser() for d in str(spec).split(",") if d.strip()] if spec else DEFAULT_DIRS


def cmd_route(pos, o) -> int:
    if not pos:
        print('usage: route "<prompt>"', file=sys.stderr)
        return 2
    prompt = " ".join(pos)
    skills, _ = load(get_dirs(o))
    R, idf = rules(o), idf_table(skills)
    names = {s["name"]: s for s in skills}
    # Rule 1: an explicitly named skill wins
    explicit = [n for n in re.findall(r"(?:^|\s)/?([a-z0-9][a-z0-9:-]{2,})", prompt.lower()) if n in names
                and (f"/{n}" in prompt.lower() or f"skill {n}" in prompt.lower() or f"{n} skill" in prompt.lower())]
    pl = " " + prompt.lower() + " "
    scored = []
    for s in skills:
        sc, why = score(prompt, s, idf)
        hits = [w for w in R["intents"].get(s["name"], []) if re.search(r"(?<![a-z])" + re.escape(w.lower()) + r"(?![a-z])", pl)]
        if hits:
            sc += 6 * min(len(hits), 2)
            why = [f"intent: {', '.join(hits[:3])}"] + why
        scored.append((sc, why, s))
    ranked = [x for x in sorted(scored, key=lambda x: -x[0]) if x[0] > 0]
    if not ranked and not explicit:
        print("no skill matches; proceed without one")
        return 0
    words = set(re.findall(r"[a-z]+", prompt.lower()))
    overlays = [n for n, trig in R["overlays"].items() if n in names and any(t in words or t in prompt.lower() for t in trig)]
    cands = [(sc, why, s) for sc, why, s in ranked if s["name"] not in R["overlays"]][: int(o.get("top", 8))]
    if explicit:
        primary = names[explicit[0]]
        reason = "named explicitly in the prompt (rule 1)"
    else:
        top = cands[0][0] if cands else 0
        close = [c for c in cands if c[0] >= top * 0.90]      # tiers only break near-ties
        # Rules 3-5: process before domain, project-specific before generic, then dir order
        order = {"process": 0, "project": 1, "domain": 2}
        close.sort(key=lambda c: (order.get(tier(c[2], R), 3), -c[0], c[2]["prio"]))
        primary = close[0][2] if close else None
        for loser, winner in R["prefer"].items():
            if primary and primary["name"] == loser and any(c[2]["name"] == winner for c in close):
                primary = names[winner]
        reason = (f"top match, tier '{tier(primary, R)}'" + (" (won a near-tie by tier/priority)" if len(close) > 1 else "")) if primary else ""
    print(f'prompt: "{prompt}"\n')
    if primary:
        print(f"PRIMARY    {primary['name']:<34} {reason}\n           {primary['path']}")
    for n in overlays:
        print(f"OVERLAY    {n:<34} discipline skill, always layered on (rule 2)")
    support = [c for c in cands if primary and c[2]["name"] != primary["name"]
               and c[0] >= max(cands[0][0] * 0.70, 4.0)][:3]
    for sc, why, s in support:
        print(f"SUPPORTING {s['name']:<34} score {sc:.1f}; {'; '.join(why)[:70]}")
    if not explicit and len(cands) > 1 and cands[1][0] >= cands[0][0] * 0.92 and \
            tier(cands[0][2], R) == tier(cands[1][2], R) and primary and primary["name"] in (cands[0][2]["name"], cands[1][2]["name"]):
        other = cands[1][2]["name"] if primary["name"] == cands[0][2]["name"] else cands[0][2]["name"]
        print(f"ASK?       near-tie with {other}: if the intent is unclear, ask which workflow is wanted (rule 7)")
    print("\nranked:")
    for sc, why, s in cands:
        print(f"  {sc:6.1f}  {s['name']:<34} [{tier(s, R)}] {'; '.join(why)[:60]}")
    return 0


def cmd_conflicts(pos, o) -> int:
    skills, by_name = load(get_dirs(o))
    idf = idf_table(skills)
    focus = Path(str(o["focus"])).expanduser() if o.get("focus") else get_dirs(o)[0]
    fset = [s for s in skills if str(s["path"]).startswith(str(focus))]
    vec = {s["name"]: {t: c * idf.get(t, 0) for t, c in s["tokens"].items()} for s in skills}
    norms = {n: math.sqrt(sum(v * v for v in d.values())) or 1 for n, d in vec.items()}
    found = 0
    print(f"focus: {focus} ({len(fset)} skills) vs {len(skills)} installed\n")
    for name, copies in sorted(by_name.items()):
        hashes = {h for _, _, h in copies}
        if len(copies) > 1 and len(hashes) > 1 and any(str(p).startswith(str(focus)) for _, p, _ in copies):
            found += 1
            print(f"SHADOWED   '{name}' has {len(hashes)} different versions:")
            for prio, p, h in copies:
                print(f"           {h}  {p}")
    lim = float(o.get("min", 0.35))
    seen = set()
    for a in fset:
        va, na = vec[a["name"]], norms[a["name"]]
        hits = []
        for b in skills:
            if b["name"] == a["name"] or (b["name"], a["name"]) in seen:
                continue
            vb = vec[b["name"]]
            sim = sum(w * vb.get(t, 0) for t, w in va.items()) / (na * norms[b["name"]])
            shared = set(a["phrases"]) & set(b["phrases"])
            if sim >= lim or shared:
                hits.append((sim, b, shared))
        for sim, b, shared in sorted(hits, key=lambda x: -x[0])[:5]:
            seen.add((a["name"], b["name"]))
            found += 1
            extra = f"; same trigger phrases: {', '.join(sorted(shared))[:60]}" if shared else ""
            print(f"OVERLAP    {sim:.2f}  {a['name']}  <->  {b['name']}{extra}")
    print(f"\n{found} finding(s). Resolve with a 'Not for … (use X)' line in the losing skill's description,"
          f" a [prefer] entry in routing.toml, or by removing a duplicate.")
    return 0


def cmd_table(pos, o) -> int:
    skills, _ = load(get_dirs(o))
    R, idf = rules(o), idf_table(skills)
    focus = Path(str(o["focus"])).expanduser() if o.get("focus") else get_dirs(o)[0]
    print("| Skill | Tier | Distinctive trigger words |\n|---|---|---|")
    for s in sorted((s for s in skills if str(s["path"]).startswith(str(focus))), key=lambda s: s["name"]):
        top = sorted(s["tokens"], key=lambda t: -idf.get(t, 0) * s["tokens"][t])[:6]
        print(f"| `{s['name']}` | {tier(s, R)} | {', '.join(top)} |")
    return 0


def main(argv) -> int:
    cmds = {"route": cmd_route, "conflicts": cmd_conflicts, "table": cmd_table}
    if len(argv) < 2 or argv[1] not in cmds:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    pos, o = opts(argv[2:])
    return cmds[argv[1]](pos, o)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
