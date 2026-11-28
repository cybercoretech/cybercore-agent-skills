#!/usr/bin/env python3
"""Create, index and lint Architectural Decision Records (ADRs).

  new    "Title" [--dir docs/adr] [--status Proposed] [--supersedes N] [--date YYYY-MM-DD]
         Next number (width follows existing files, default 4), slugged filename, concise template.
         --supersedes N also marks ADR N as "Superseded by ADR-M".
  status N <Proposed|Accepted|Rejected|Deprecated|Superseded> [--by M] [--dir ...]
  index  [--dir ...]   Write the ADR table into <dir>/README.md (between index markers)
  lint   [--dir ...]   Check numbering, headings, status, date, sections, supersede links, length

Auto-detects docs/adr or docs/decisions when --dir is not given. Accepts both the bullet style
(`- **Status:** Accepted`) and the Nygard style (`## Status` section). Exit: 0 ok, 1 lint errors,
2 bad usage. Standard library only.
"""
from __future__ import annotations

import datetime as dt
import re
import sys
from pathlib import Path

STATUSES = ["Proposed", "Accepted", "Rejected", "Deprecated", "Superseded"]
FILE_RX = re.compile(r"^(\d{3,5})-([a-z0-9][a-z0-9-]*)\.md$")
START, END = "<!-- adr-index:start -->", "<!-- adr-index:end -->"

TEMPLATE = """# ADR-{num}: {title}

- **Status:** {status}
- **Date:** {date}
{extra}
## Context

<!-- The forces at play: the problem, constraints, requirements and facts (with numbers where
     possible). Two to six sentences. No solution yet. -->

## Decision

<!-- One clear statement in active voice: "We will …". Include the scope and what is
     explicitly out of scope. -->

## Considered options

<!-- Two to four real options, including "do nothing" when it was viable. -->

1. **Option A (chosen)** — pros; cons.
2. **Option B** — pros; cons; why it lost.

## Consequences

<!-- What becomes easier, what becomes harder, new risks, follow-up work, and how we will
     know if this decision is wrong (the revisit trigger). -->

- Positive:
- Negative:
- Revisit if:
"""


def find_dir(o) -> Path:
    if o.get("dir"):
        return Path(str(o["dir"]))
    for cand in ("docs/adr", "docs/decisions", "doc/adr", "adr"):
        if Path(cand).is_dir():
            return Path(cand)
    return Path("docs/adr")


def records(d: Path):
    out = []
    for p in sorted(d.glob("*.md")):
        m = FILE_RX.match(p.name)
        if m:
            out.append((int(m.group(1)), len(m.group(1)), p))
    return out


def slug(title: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return re.sub(r"-{2,}", "-", s)[:60].rstrip("-") or "decision"


def read_meta(p: Path) -> dict:
    text = p.read_text(encoding="utf-8")
    h1 = re.search(r"^#\s+(.+)$", text, re.M)
    status = re.search(r"^\s*[-*]\s*\*\*Status:?\*\*:?\s*(.+)$", text, re.M | re.I)
    if not status:
        sec = re.search(r"^##\s+Status\s*\n+\s*(.+)$", text, re.M | re.I)
        status = sec
    date = re.search(r"^\s*[-*]\s*\*\*Date:?\*\*:?\s*(\S+)", text, re.M | re.I) or \
        re.search(r"^##\s+Date\s*\n+\s*(\S+)", text, re.M | re.I)
    sections = {s.strip().lower() for s in re.findall(r"^##\s+(.+)$", text, re.M)}
    return {"text": text, "h1": h1.group(1).strip() if h1 else "",
            "status": status.group(1).strip() if status else "",
            "date": date.group(1).strip() if date else "", "sections": sections}


def set_status(p: Path, new: str) -> None:
    text = p.read_text(encoding="utf-8")
    if re.search(r"^\s*[-*]\s*\*\*Status:?\*\*", text, re.M | re.I):
        text = re.sub(r"^(\s*[-*]\s*\*\*Status:?\*\*:?\s*).*$", lambda m: m.group(1) + new, text, count=1, flags=re.M | re.I)
    elif re.search(r"^##\s+Status\s*$", text, re.M | re.I):
        text = re.sub(r"^(##\s+Status\s*\n+\s*).*$", lambda m: m.group(1) + new, text, count=1, flags=re.M | re.I)
    else:
        raise ValueError(f"{p.name}: no Status line to update")
    p.write_text(text, encoding="utf-8")


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


def cmd_new(pos, o) -> int:
    if len(pos) != 1:
        print('usage: new "Title" [--dir D] [--status S] [--supersedes N]', file=sys.stderr)
        return 2
    d = find_dir(o)
    d.mkdir(parents=True, exist_ok=True)
    recs = records(d)
    width = recs[-1][1] if recs else 4
    n = (max(r[0] for r in recs) + 1) if recs else 1
    num = str(n).zfill(width)
    status = str(o.get("status", "Proposed")).capitalize()
    if status not in STATUSES:
        print(f"status must be one of {STATUSES}", file=sys.stderr)
        return 2
    extra = ""
    old = None
    if o.get("supersedes"):
        old = next((r for r in recs if r[0] == int(o["supersedes"])), None)
        if not old:
            print(f"no ADR {o['supersedes']} in {d}", file=sys.stderr)
            return 2
        oldnum = str(old[0]).zfill(old[1])
        extra = f"- **Supersedes:** [ADR-{oldnum}]({old[2].name})\n"
    path = d / f"{num}-{slug(pos[0])}.md"
    date = str(o.get("date", dt.date.today().isoformat()))
    path.write_text(TEMPLATE.format(num=num, title=pos[0].strip(), status=status, date=date, extra=extra), encoding="utf-8")
    if old:
        set_status(old[2], f"Superseded by [ADR-{num}]({path.name})")
        print(f"marked {old[2].name} as superseded")
    print(f"created {path}")
    return 0


def cmd_status(pos, o) -> int:
    if len(pos) != 2 or pos[1].capitalize() not in STATUSES:
        print(f"usage: status N <{'|'.join(STATUSES)}> [--by M]", file=sys.stderr)
        return 2
    d = find_dir(o)
    recs = {r[0]: r for r in records(d)}
    n, new = int(pos[0]), pos[1].capitalize()
    if n not in recs:
        print(f"no ADR {n} in {d}", file=sys.stderr)
        return 2
    if new == "Superseded":
        if not o.get("by") or int(o["by"]) not in recs:
            print("Superseded needs --by M (an existing ADR)", file=sys.stderr)
            return 2
        by = recs[int(o["by"])]
        new = f"Superseded by [ADR-{str(by[0]).zfill(by[1])}]({by[2].name})"
    set_status(recs[n][2], new)
    print(f"{recs[n][2].name}: status -> {new}")
    return 0


def cmd_index(pos, o) -> int:
    d = find_dir(o)
    recs = records(d)
    if not recs:
        print(f"no ADRs in {d}", file=sys.stderr)
        return 2
    rows = ["| ADR | Title | Status | Date |", "|---|---|---|---|"]
    for n, w, p in recs:
        m = read_meta(p)
        title = re.sub(r"^ADR[- ]?\d+[:.]?\s*", "", m["h1"], flags=re.I)
        status = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", m["status"])
        rows.append(f"| [{str(n).zfill(w)}]({p.name}) | {title} | {status} | {m['date']} |")
    table = START + "\n" + "\n".join(rows) + "\n" + END
    readme = d / "README.md"
    if readme.exists() and START in readme.read_text(encoding="utf-8"):
        text = re.sub(re.escape(START) + r".*?" + re.escape(END), table, readme.read_text(encoding="utf-8"), flags=re.S)
    elif readme.exists():
        text = readme.read_text(encoding="utf-8").rstrip() + "\n\n" + table + "\n"
    else:
        text = ("# Architectural Decision Records\n\nWhy we made the technical choices we did. "
                "New ADR: copy the template via `adr.py new \"Title\"`.\n\n" + table + "\n")
    readme.write_text(text, encoding="utf-8")
    print(f"wrote {readme} ({len(recs)} ADRs)")
    return 0


def cmd_lint(pos, o) -> int:
    d = find_dir(o)
    if not d.is_dir():
        print(f"no ADR directory at {d}", file=sys.stderr)
        return 2
    findings = []
    stray = [p.name for p in d.glob("*.md") if p.name.lower() not in ("readme.md", "index.md", "template.md")
             and not FILE_RX.match(p.name)]
    for s in stray:
        findings.append(("ERROR", s, "filename must be NNNN-lower-case-slug.md"))
    recs = records(d)
    nums = [r[0] for r in recs]
    for n in sorted({x for x in nums if nums.count(x) > 1}):
        findings.append(("ERROR", f"{n}", "duplicate ADR number"))
    if nums:
        missing = sorted(set(range(1, max(nums) + 1)) - set(nums))
        if missing:
            findings.append(("WARN", d.name, f"numbering gaps: {missing} (fine if deleted on purpose; never reuse numbers)"))
        if len({r[1] for r in recs}) > 1:
            findings.append(("WARN", d.name, "mixed number widths in filenames"))
    by_num = {r[0]: r[2] for r in recs}
    for n, w, p in recs:
        m = read_meta(p)
        name = p.name
        if not re.match(rf"ADR[- ]?0*{n}\b", m["h1"], re.I):
            findings.append(("WARN", name, f"H1 should start 'ADR-{str(n).zfill(w)}:' (found '{m['h1'][:50]}')"))
        status_word = m["status"].split()[0].strip("*:,.").capitalize() if m["status"] else ""
        if status_word not in STATUSES:
            findings.append(("ERROR", name, f"status '{m['status']}' not one of {STATUSES}"))
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", m["date"] or ""):
            findings.append(("ERROR", name, f"date '{m['date']}' must be YYYY-MM-DD"))
        secs = m["sections"]
        if "context" not in secs:
            findings.append(("ERROR", name, "missing '## Context'"))
        if not secs & {"decision", "proposal", "decision outcome"}:
            findings.append(("ERROR", name, "missing '## Decision' (or '## Proposal' while proposed)"))
        if not any(s.startswith("consequence") for s in secs):
            findings.append(("ERROR", name, "missing '## Consequences'"))
        if not any(("option" in s or "alternative" in s) for s in secs):
            findings.append(("WARN", name, "no considered options/alternatives section: record what was rejected and why"))
        if status_word == "Accepted" and "decision" not in secs and "decision outcome" not in secs:
            findings.append(("WARN", name, "accepted ADR still titled 'Proposal': rename the section to 'Decision'"))
        if "<!--" in m["text"] and re.search(r"<!--\s*(The forces|One clear statement|Two to four|What becomes)", m["text"]):
            findings.append(("WARN", name, "template guidance comments still present"))
        lines = m["text"].count("\n")
        if lines > 200:
            findings.append(("WARN", name, f"{lines} lines; ADRs should fit on about one page (move detail to linked docs)"))
        if status_word == "Superseded":
            ref = re.search(r"ADR[- ]?(\d+)", m["status"])
            if not ref or int(ref.group(1)) not in by_num:
                findings.append(("ERROR", name, "superseded but does not name an existing superseding ADR"))
            elif not re.search(rf"Supersedes:?\**:?\s*\[?ADR[- ]?0*{n}\b", read_meta(by_num[int(ref.group(1))])["text"], re.I):
                findings.append(("WARN", name, f"ADR-{ref.group(1)} does not link back with 'Supersedes: ADR-{n}'"))
    order = {"ERROR": 0, "WARN": 1}
    for sev, where, msg in sorted(findings, key=lambda f: (order[f[0]], f[1])):
        print(f"{sev:<6} {where}: {msg}")
    errors = sum(f[0] == "ERROR" for f in findings)
    print(f"\n{len(recs)} ADR(s) in {d}: {errors} error(s), {len(findings) - errors} warning(s)")
    return 1 if errors else 0


def main(argv) -> int:
    cmds = {"new": cmd_new, "status": cmd_status, "index": cmd_index, "lint": cmd_lint}
    if len(argv) < 2 or argv[1] not in cmds:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    pos, o = opts(argv[2:])
    try:
        return cmds[argv[1]](pos, o)
    except ValueError as exc:
        print(exc, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
