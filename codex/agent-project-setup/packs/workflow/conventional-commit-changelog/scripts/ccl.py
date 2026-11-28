#!/usr/bin/env python3
"""Plan atomic Conventional Commits from staged changes, lint messages, update CHANGELOG.md.

  plan       [--all]                 Group staged files (or all changes with --all) into atomic
                                     commits with suggested headers. Prints commands; runs nothing.
  lint-msg   <file|-> [--max 72]     Validate a commit message (usable as a commit-msg hook)
  changelog  [--since TAG] [--version X.Y.Z | --unreleased] [--file CHANGELOG.md]
             [--include-internal] [--write]
                                     Commits since the last tag -> Keep a Changelog entries.
                                     Dry run prints the new section; --write edits the file.

Exit: 0 ok, 1 problem (lint failure, nothing to do), 2 bad usage / not a git repo.
Standard library only; needs git on PATH.
"""
from __future__ import annotations

import datetime as dt
import re
import subprocess
import sys
from collections import OrderedDict, defaultdict
from pathlib import Path

TYPES = ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"]
HEADER_RX = re.compile(r"^(?P<type>[a-z]+)(?:\((?P<scope>[a-z0-9][a-z0-9._/-]*)\))?(?P<bang>!)?: (?P<desc>\S.*)$")
LOCKFILES = re.compile(r"(^|/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|Cargo\.toml|Cargo\.lock|"
                       r"go\.mod|go\.sum|pyproject\.toml|uv\.lock|poetry\.lock|requirements[\w.-]*\.txt|Gemfile(\.lock)?|"
                       r"composer\.(json|lock)|flake\.lock|deno\.lock)$")
CI = re.compile(r"(^\.github/workflows/|^\.gitlab-ci\.yml$|^\.circleci/|^\.woodpecker|^Jenkinsfile$|^\.forgejo/workflows/)")
DOCS = re.compile(r"(^docs?/|\.mdx?$|\.rst$|^README|^LICENSE|^CONTRIBUTING)", re.I)
TESTS = re.compile(r"(^|/)(tests?|__tests__|spec)/|(_test|\.test|\.spec|_spec)\.[a-z]+$|(^|/)test_[^/]+\.py$")
CONFIG = re.compile(r"(^|/)(\.editorconfig|\.gitignore|\.gitattributes|\.prettierrc[\w.]*|\.eslintrc[\w.]*|eslint\.config\.\w+|"
                    r"rustfmt\.toml|clippy\.toml|\.pre-commit-config\.yaml|tsconfig[\w.]*\.json|\.npmrc)$")
SECTIONS = ["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"]


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or f"git {' '.join(args)} failed")
    return r.stdout


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


# ---------------- plan ----------------
def scope_of(path: str) -> str:
    parts = path.split("/")
    for anchor in ("crates", "packages", "apps", "libs", "services", "modules", "plugins"):
        if parts[0] == anchor and len(parts) > 2:
            return parts[1]
    if parts[0] in ("src", "lib", "app", "internal", "pkg", "cmd") and len(parts) > 2:
        return re.sub(r"\.\w+$", "", parts[1])
    if parts[0] in ("src", "lib") and len(parts) == 2:
        return re.sub(r"\.\w+$", "", parts[1])
    return parts[0] if len(parts) > 1 else "core"


def cmd_plan(pos, o) -> int:
    try:
        git("rev-parse", "--git-dir")
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 2
    entries = []  # (status, paths)
    if o.get("all"):
        for line in git("status", "--porcelain=v1", "-uall").splitlines():
            st, rest = line[:2].strip() or "M", line[3:]
            paths = rest.split(" -> ") if " -> " in rest else [rest]
            entries.append(("A" if st == "??" else st[0], [p.strip('"') for p in paths]))
    else:
        for line in git("diff", "--cached", "--name-status", "-M").splitlines():
            f = line.split("\t")
            entries.append((f[0][0], f[1:]))
    if not entries:
        print("nothing staged (stage files first, or use --all)", file=sys.stderr)
        return 1
    partial = [l[3:] for l in git("status", "--porcelain=v1").splitlines() if l[0] not in " ?" and l[1] not in " ?"]

    groups: "OrderedDict[tuple[str, str], list]" = OrderedDict()
    tests = []
    for st, paths in entries:
        p = paths[-1]
        if p == "CHANGELOG.md":
            key = ("chore", "release")
        elif LOCKFILES.search(p):
            key = ("build", "deps")
        elif CI.search(p):
            key = ("ci", "")
        elif TESTS.search(p):
            tests.append((st, paths))
            continue
        elif DOCS.search(p):
            key = ("docs", "")
        elif CONFIG.search(p):
            key = ("chore", "config")
        else:
            key = ("code", scope_of(p))
        groups.setdefault(key, []).append((st, paths))
    # Tests travel with the code they test (atomic: a change and its tests in one commit)
    for st, paths in tests:
        p = paths[-1].lower()
        home = next((k for k in groups if k[0] == "code" and k[1].lower() in re.split(r"[/_.-]", p)), None)
        loose_scope = scope_of(paths[-1])
        if loose_scope in ("tests", "test", "spec", "__tests__", "core"):
            loose_scope = ""
        groups.setdefault(home or ("test", loose_scope), []).append((st, paths))

    print(f"{len(groups)} proposed commit(s) from {len(entries)} file(s):\n")
    for i, ((kind, scope), items) in enumerate(groups.items(), 1):
        statuses = {s for s, _ in items}
        if kind == "code":
            hint = "feat" if "A" in statuses and statuses <= {"A", "M"} else ("refactor" if statuses == {"R"} else "fix|feat|refactor|perf")
            header = f"{hint}({scope}): <describe the change>"
            note = "  # choose ONE type from the diff; split further if it does two things"
        else:
            header = f"{kind}{f'({scope})' if scope else ''}: <describe the change>"
            note = ""
        print(f"[{i}] {header}{note}")
        for st, paths in items:
            print(f"      {st}  {' -> '.join(paths)}")
    print("\ncommands (review each header first; nothing has been run):")
    print("  git restore --staged -- .        # unstage everything (working tree unchanged)")
    for i, ((kind, scope), items) in enumerate(groups.items(), 1):
        files = " ".join(f"'{p}'" for _, paths in items for p in paths)
        print(f"  git add -- {files}")
        print(f"  git commit   # [{i}] write the header shown above")
    if partial:
        print("\nWARNING: these files have BOTH staged and unstaged changes; re-adding whole files would sweep in\n"
              "the unstaged hunks. Use `git add -p <file>` for them instead:")
        for p in partial:
            print(f"  {p}")
    return 0


# ---------------- lint ----------------
def lint_message(msg: str, max_len: int) -> list[str]:
    lines = [l for l in msg.splitlines() if not l.startswith("#")]
    while lines and not lines[-1].strip():
        lines.pop()
    if not lines:
        return ["empty message"]
    errs = []
    head = lines[0]
    if re.match(r"^(Merge|Revert \"|fixup!|squash!|amend!)", head):
        return []
    m = HEADER_RX.match(head)
    if not m:
        errs.append(f"header must be 'type(scope)!: description' — got: {head!r}")
    else:
        if m["type"] not in TYPES:
            errs.append(f"unknown type '{m['type']}' (allowed: {', '.join(TYPES)})")
        d = m["desc"]
        if d.endswith("."):
            errs.append("description must not end with a period")
        if re.match(r"^[A-Z][a-z]", d) and not re.match(r"^[A-Z]{2,}", d):
            errs.append("description should start lower-case (imperative: 'add', not 'Added'/'Adds')")
        if re.match(r"^(added|adds|fixed|fixes|updated|updates|changed|changes|removed|removes)\b", d, re.I):
            errs.append("use the imperative mood ('add', 'fix', 'update')")
    if len(head) > max_len:
        errs.append(f"header is {len(head)} chars (max {max_len})")
    if len(lines) > 1 and lines[1].strip():
        errs.append("line 2 must be blank (separates header from body)")
    body = "\n".join(lines[1:])
    if re.search(r"^BREAKING[ -]CHANGE(?!: )", body, re.M):
        errs.append("breaking footer must be 'BREAKING CHANGE: <description>'")
    for n, l in enumerate(lines[2:], 3):
        if len(l) > 100 and not re.match(r"^\S+:\s*https?://|^\s*https?://", l):
            errs.append(f"line {n} is {len(l)} chars; wrap the body at ~72")
            break
    return errs


def cmd_lint(pos, o) -> int:
    if len(pos) != 1:
        print("usage: lint-msg <file|->", file=sys.stderr)
        return 2
    msg = sys.stdin.read() if pos[0] == "-" else Path(pos[0]).read_text(encoding="utf-8")
    errs = lint_message(msg, int(o.get("max", 72)))
    for e in errs:
        print(f"commit-msg: {e}", file=sys.stderr)
    return 1 if errs else 0


# ---------------- changelog ----------------
def parse_commits(rng: str):
    sep, end = "\x1f", "\x1e"
    raw = git("log", "--no-merges", f"--format=%H{sep}%s{sep}%b{end}", *([rng] if rng else []))
    out = []
    for rec in raw.split(end):
        rec = rec.strip("\n")
        if not rec:
            continue
        h, subj, body = (rec.split(sep) + ["", ""])[:3]
        m = HEADER_RX.match(subj.strip())
        if not m:
            out.append({"hash": h, "type": None, "scope": None, "breaking": False, "desc": subj.strip(), "body": body})
            continue
        breaking = bool(m["bang"]) or bool(re.search(r"^BREAKING[ -]CHANGE: ", body, re.M))
        bnote = re.search(r"^BREAKING[ -]CHANGE: (.+)$", body, re.M)
        out.append({"hash": h, "type": m["type"], "scope": m["scope"], "breaking": breaking,
                    "desc": m["desc"].strip(), "body": body, "bnote": bnote.group(1).strip() if bnote else None})
    return list(reversed(out))  # oldest first


def section_for(c, internal: bool) -> str | None:
    t, d = c["type"], c["desc"].lower()
    if c["scope"] == "security" or re.match(r"^(security|sec)\b", d):
        return "Security"
    if re.match(r"^(deprecate|deprecated)\b", d):
        return "Deprecated"
    if re.match(r"^(remove|drop|delete)\b", d) and t in ("feat", "refactor", "chore", None):
        return "Removed"
    if c["breaking"]:               # a breaking change alters existing behaviour
        return "Changed"
    if t == "feat":
        return "Added"
    if t == "fix":
        return "Fixed"
    if t in ("perf", "revert") or c["breaking"]:
        return "Changed"
    if internal and t in ("refactor", "build", "ci", "docs", "style", "test", "chore"):
        return "Changed"
    return None


def parse_sections(block: str) -> dict[str, list[str]]:
    """'### Added' etc. -> list of bullet lines (continuation lines kept with their bullet)."""
    out, cur = {}, None
    for line in block.splitlines():
        m = re.match(r"^### (\w+)", line)
        if m:
            cur = m.group(1).capitalize()
            out.setdefault(cur, [])
        elif cur and line.strip():
            if line.lstrip().startswith(("- ", "* ")) or not out[cur]:
                out[cur].append(line.rstrip())
            else:
                out[cur][-1] += "\n" + line.rstrip()
    return out


def render(heading: str, sections: dict[str, list[str]]) -> str:
    body = [heading, ""]
    for sec in SECTIONS:
        if sections.get(sec):
            body += [f"### {sec}", "", *sections[sec], ""]
    return "\n".join(body).rstrip() + "\n"


def last_tag() -> str | None:
    try:
        return git("describe", "--tags", "--abbrev=0").strip()
    except RuntimeError:
        return None


def bump(tag: str | None, commits) -> str:
    m = re.match(r"v?(\d+)\.(\d+)\.(\d+)", tag or "0.0.0")
    major, minor, patch = (int(x) for x in m.groups()) if m else (0, 0, 0)
    if any(c["breaking"] for c in commits):
        return f"{major}.{minor + 1}.0" if major == 0 else f"{major + 1}.0.0"
    if any(c["type"] == "feat" for c in commits):
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


def remote_compare_base() -> str | None:
    try:
        url = git("remote", "get-url", "origin").strip()
    except RuntimeError:
        return None
    m = re.match(r"(?:git@|https://)(github\.com|gitlab\.com|codeberg\.org)[:/](.+?)(?:\.git)?$", url)
    return f"https://{m.group(1)}/{m.group(2)}" if m else None


def cmd_changelog(pos, o) -> int:
    try:
        git("rev-parse", "--git-dir")
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 2
    tag = str(o["since"]) if o.get("since") else last_tag()
    commits = parse_commits(f"{tag}..HEAD" if tag else "")
    if not commits:
        print(f"no commits since {tag or 'the beginning'}", file=sys.stderr)
        return 1
    path = Path(str(o.get("file", "CHANGELOG.md")))
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    entries = defaultdict(list)
    skipped = []
    for c in commits:
        sec = section_for(c, bool(o.get("include-internal")))
        if not sec:
            skipped.append(c)
            continue
        text = c["desc"][0].upper() + c["desc"][1:]
        if c["scope"] and c["scope"] != "security":
            text = f"**{c['scope']}:** {text}"
        if c["breaking"]:
            text = f"**BREAKING:** {text}" + (f" — {c['bnote']}" if c.get("bnote") else "")
        short = c["hash"][:7]
        if f"({short})" in existing or c["desc"].lower() in existing.lower():  # already recorded
            continue
        entries[sec].append(f"- {text} ({short})")
    suggested = bump(tag, commits)
    ver = None if (o.get("unreleased") or not o.get("version")) else str(o["version"]).lstrip("v")

    header = ("# Changelog\n\nAll notable changes to this project are documented in this file.\n\n"
              "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),\n"
              "and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n")
    text = existing or header
    if not re.search(r"^## \[Unreleased\]", text, re.M):
        first = re.search(r"^## \[", text, re.M)
        at = first.start() if first else len(text)
        text = text[:at].rstrip() + "\n\n## [Unreleased]\n\n" + text[at:]
    unrel = re.search(r"^## \[Unreleased\][^\n]*\n", text, re.M)
    nxt = re.search(r"^## \[|^\[[^\]]+\]: ", text[unrel.end():], re.M)
    block_end = unrel.end() + (nxt.start() if nxt else len(text) - unrel.end())
    current = parse_sections(text[unrel.end():block_end])          # what Unreleased already holds
    merged = {s: current.get(s, []) + entries.get(s, []) for s in SECTIONS}

    print(f"{len(commits)} commit(s) since {tag or 'start'}; {len(skipped)} internal commit(s) left out "
          f"(use --include-internal to add them); suggested next version: {suggested}\n")
    if ver:
        heading = f"## [{ver}] - {dt.date.today().isoformat()}"
        if not any(merged.values()):
            print("nothing to release: Unreleased is empty and there are no new user-facing commits", file=sys.stderr)
            return 1
        new_block = "## [Unreleased]\n\n" + render(heading, merged) + "\n"
    else:
        if not any(entries.values()):
            print("no new user-facing entries (already recorded, or only internal commits)", file=sys.stderr)
            return 1
        new_block = render("## [Unreleased]", merged) + "\n"
    print(new_block)
    if not o.get("write"):
        print("(dry run; add --write to update the file)")
        return 0
    text = text[:unrel.start()] + new_block + text[block_end:]
    base = remote_compare_base()
    if base and ver:
        link = f"[{ver}]: {base}/compare/{tag}...v{ver}" if tag else f"[{ver}]: {base}/releases/tag/v{ver}"
        unrel_link = f"[Unreleased]: {base}/compare/v{ver}...HEAD"
        text = re.sub(r"^\[Unreleased\]: .*\n?", "", text, flags=re.M).rstrip() + f"\n\n{unrel_link}\n{link}\n"
    text = re.sub(r"\n{3,}", "\n\n", text)
    path.write_text(text, encoding="utf-8")
    print(f"updated {path}")
    return 0


def main(argv) -> int:
    cmds = {"plan": cmd_plan, "lint-msg": cmd_lint, "changelog": cmd_changelog}
    if len(argv) < 2 or argv[1] not in cmds:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    pos, o = opts(argv[2:])
    try:
        return cmds[argv[1]](pos, o)
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
