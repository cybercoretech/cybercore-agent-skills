#!/usr/bin/env python3
"""Check a diff against the requested scope: flag bloat before it is committed.

    python3 scope_check.py [--base REF] [--staged] [--scope 'src/parser/**,tests/parser*']
                           [--allow-deps] [--allow-new-files N] [--max-added N]

Diff source: --staged (index vs HEAD), else working tree vs --base (default HEAD).

ERROR (exit 1)
  - file changed outside --scope globs (when --scope is given)
  - new dependency in a manifest (package.json, Cargo.toml, pyproject.toml, requirements*.txt,
    go.mod, Gemfile, composer.json) unless --allow-deps
WARN
  - new abstraction: interface/trait/abstract class/protocol, or a Factory/Manager/Strategy/
    Adapter/Provider/Builder/Registry/Wrapper/Helper/Base type, or generic type parameters added
  - new configuration surface: CLI flags, env vars, config keys, feature flags
  - speculative comments: "in the future", "for extensibility", "just in case", "TODO: support"
  - whitespace/formatting-only hunks (unrelated reformatting)
  - more new files than --allow-new-files (default 2); more added lines than --max-added
Standard library only; needs git. Heuristics: every finding is a question to answer, not a verdict.
"""
from __future__ import annotations

import fnmatch
import json
import re
import subprocess
import sys

MANIFESTS = re.compile(r"(^|/)(package\.json|Cargo\.toml|pyproject\.toml|requirements[\w.-]*\.txt|go\.mod|Gemfile|composer\.json)$")
ABSTRACTION = re.compile(
    r"^\+\s*(export\s+)?(pub(\([^)]*\))?\s+)?("
    r"(abstract\s+class|interface|trait|protocol)\s+\w+"
    r"|(class|struct|type|enum)\s+\w*(Factory|Manager|Strategy|Adapter|Provider|Builder|Registry|Wrapper|Helper|Handler|Base|Abstract)\w*"
    r"|class\s+\w+\s*\(\s*(ABC|Protocol)\s*\)"
    r")")
GENERIC = re.compile(r"^\+.*\b(fn|function|class|struct|interface|type|def)\s+\w+\s*<[A-Z]\w*(\s*[:,=].*)?>")
CONFIG = re.compile(
    r"^\+.*(add_argument\(\s*['\"]--|\.option\(\s*['\"]--|#\[arg\(|clap::Arg|flag\.(String|Bool|Int)\(|"
    r"process\.env\.[A-Z_]{3,}|os\.environ(\.get)?\[?\(?\s*['\"][A-Z_]{3,}|std::env::var\(\s*\"[A-Z_]{3,}|getenv\(\s*['\"][A-Z_]{3,}|"
    r"feature_?flag|FEATURE_[A-Z_]+|isEnabled\(\s*['\"])", re.I)
SPECULATIVE = re.compile(r"^\+.*(in the future|future[- ]proof|for extensibility|extensible|just in case|"
                         r"might need|may need later|could be useful|TODO:?\s*(support|add|allow|handle)|"
                         r"placeholder for|for now we|reserved for)", re.I)


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or "git failed")
    return r.stdout


def opts(argv):
    o, i = {}, 0
    while i < len(argv):
        if argv[i].startswith("--"):
            if i + 1 < len(argv) and not argv[i + 1].startswith("--"):
                o[argv[i][2:]] = argv[i + 1]
                i += 2
                continue
            o[argv[i][2:]] = True
        i += 1
    return o


def in_scope(path: str, globs: list[str]) -> bool:
    return any(fnmatch.fnmatch(path, g) or path.startswith(g.rstrip("*").rstrip("/") + "/") and g.endswith("**")
               for g in globs)


def new_deps(path: str, removed: list[str], added: list[str]) -> list[str]:
    """Dependency names present in added lines but not removed ones (version bumps are not new)."""
    def names(lines):
        out = set()
        for l in lines:
            l = l.strip()
            if path.endswith("package.json") or path.endswith("composer.json"):
                m = re.match(r'"(@?[\w./-]+)"\s*:\s*"[~^<>=*\d]', l)
            elif path.endswith("Cargo.toml"):
                m = re.match(r"([\w-]+)\s*=\s*(\"|\{)", l)
            elif path.endswith("pyproject.toml"):
                m = re.match(r'"([A-Za-z0-9_.-]+)\s*(\[|[<>=!~]|")', l) or re.match(r"([A-Za-z0-9_.-]+)\s*=\s*\"", l)
            elif "requirements" in path:
                m = re.match(r"([A-Za-z0-9_.-]+)\s*([<>=!~\[]|$)", l)
            elif path.endswith("go.mod"):
                m = re.match(r"(?:require\s+)?([\w.-]+\.[\w./-]+)\s+v\d", l)
            elif path.endswith("Gemfile"):
                m = re.match(r"gem\s+['\"]([\w-]+)", l)
            else:
                m = None
            if m and m.group(1) not in ("version", "name", "edition", "description", "license", "private", "type", "main"):
                out.add(m.group(1).lower())
        return out
    return sorted(names(added) - names(removed))


def main(argv) -> int:
    o = opts(argv[1:])
    if o.get("help"):
        print(__doc__.strip())
        return 0
    try:
        git("rev-parse", "--git-dir")
        args = ["diff", "--cached"] if o.get("staged") else ["diff", str(o.get("base", "HEAD"))]
        status = git(*args, "--name-status", "-M")
        # Force a/ b/ prefixes: user config (diff.mnemonicPrefix, diff.noprefix) changes them
        diff = git(*args, "-U0", "--no-color", "--no-ext-diff", "--src-prefix=a/", "--dst-prefix=b/")
        untracked = [] if o.get("staged") else git("ls-files", "--others", "--exclude-standard").split()
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 2
    scope = [g.strip() for g in str(o.get("scope", "")).split(",") if g.strip()] if o.get("scope") else []
    files = []
    for line in status.splitlines():
        f = line.split("\t")
        files.append((f[0][0], f[-1]))
    files += [("A", p) for p in untracked]
    if not files:
        print("no changes to review", file=sys.stderr)
        return 1

    findings = []
    if scope:
        for st, p in files:
            if not in_scope(p, scope):
                findings.append(("ERROR", p, f"outside the requested scope ({', '.join(scope)}); revert or justify"))

    # per-file hunks
    per_file, cur = {}, None
    for line in diff.splitlines():
        if line.startswith("+++ "):
            cur = line[6:] if line.startswith("+++ b/") else None
            per_file.setdefault(cur, {"add": [], "del": [], "hunks": []})
        elif cur and line.startswith("@@"):
            per_file[cur]["hunks"].append({"add": [], "del": []})
        elif cur and line.startswith("+") and not line.startswith("+++"):
            per_file[cur]["add"].append(line)
            if per_file[cur]["hunks"]:
                per_file[cur]["hunks"][-1]["add"].append(line[1:])
        elif cur and line.startswith("-") and not line.startswith("---"):
            per_file[cur]["del"].append(line)
            if per_file[cur]["hunks"]:
                per_file[cur]["hunks"][-1]["del"].append(line[1:])
    for p in untracked:
        try:
            text = open(p, encoding="utf-8", errors="ignore").read().splitlines()
        except OSError:
            continue
        per_file[p] = {"add": ["+" + l for l in text], "del": [], "hunks": []}

    added_total = 0
    for p, d in per_file.items():
        if not p:
            continue
        added_total += len(d["add"])
        if MANIFESTS.search(p) and not o.get("allow-deps"):
            for dep in new_deps(p, [l[1:] for l in d["del"]], [l[1:] for l in d["add"]]):
                findings.append(("ERROR", p, f"new dependency '{dep}': was it requested? (use the standard library or existing deps, or pass --allow-deps)"))
        for l in d["add"]:
            if ABSTRACTION.search(l):
                findings.append(("WARN", p, f"new abstraction: {l[1:].strip()[:80]}  (is there a second real use today?)"))
            elif GENERIC.search(l):
                findings.append(("WARN", p, f"new generic parameter: {l[1:].strip()[:80]}  (is more than one type used now?)"))
            if CONFIG.search(l):
                findings.append(("WARN", p, f"new configuration surface: {l[1:].strip()[:80]}  (requested? hard-code until asked)"))
            if SPECULATIVE.search(l):
                findings.append(("WARN", p, f"speculative comment/code: {l[1:].strip()[:80]}"))
        for h in d["hunks"]:
            if h["add"] and h["del"] and len(h["add"]) == len(h["del"]) and \
                    [re.sub(r"\s+", "", x) for x in h["add"]] == [re.sub(r"\s+", "", x) for x in h["del"]]:
                findings.append(("WARN", p, "formatting-only hunk (whitespace changes in code you weren't asked to touch)"))
                break

    new_files = [p for st, p in files if st == "A"]
    limit = int(o.get("allow-new-files", 2))
    if len(new_files) > limit:
        findings.append(("WARN", "(diff)", f"{len(new_files)} new files (limit {limit}): {', '.join(new_files[:6])}"))
    if o.get("max-added") and added_total > int(o["max-added"]):
        findings.append(("WARN", "(diff)", f"{added_total} added lines (budget {o['max-added']})"))

    findings = list(dict.fromkeys(findings))
    order = {"ERROR": 0, "WARN": 1}
    for sev, where, msg in sorted(findings, key=lambda f: (order[f[0]], f[1])):
        print(f"{sev:<6} {where}: {msg}")
    errors = sum(f[0] == "ERROR" for f in findings)
    print(f"\n{len(files)} file(s), +{added_total} lines: {errors} error(s), {len(findings) - errors} warning(s)")
    if o.get("json"):
        print(json.dumps([{"severity": s, "where": w, "message": m} for s, w, m in findings]))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
