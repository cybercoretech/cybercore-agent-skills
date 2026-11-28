#!/usr/bin/env python3
"""Prove a bug fix: the regression test FAILS on the old code and PASSES on the fixed code.

    python3 prove_fix.py --test "<command>" [--tests 'tests/**,**/*_test.*'] [--base HEAD]
                         [--repeat 3] [--expect-fail REGEX] [--setup "<command>"]
                         [--link node_modules,.venv] [--timeout 600] [--keep]

How: creates a temporary git worktree at --base (your working tree is never modified),
copies the changed/new test files (matching --tests) into it, runs --setup there if given,
then runs --test there (must fail every time) and in your working tree (must pass every time).
--expect-fail REGEX must appear in the old-code output, proving it fails for the right reason
(not "module not found"). --link symlinks heavy folders (deps, venvs) into the worktree.

Exit: 0 proven, 1 not proven (test passes on old code, fails on new code, or flaky),
2 bad usage / setup failure. Standard library only; needs git.
"""
from __future__ import annotations

import fnmatch
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

DEFAULT_TESTS = "tests/**,test/**,**/tests/**,**/__tests__/**,**/*_test.*,**/*.test.*,**/*.spec.*,**/test_*.py"


def git(*args, cwd=None) -> str:
    r = subprocess.run(["git", *args], capture_output=True, text=True, cwd=cwd)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or f"git {' '.join(args)} failed")
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


def matches(path: str, globs: list[str]) -> bool:
    return any(fnmatch.fnmatch(path, g) or fnmatch.fnmatch("/" + path, "*/" + g.lstrip("*/")) for g in globs)


def run(cmd: str, cwd: str, timeout: int) -> tuple[int, str]:
    try:
        r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, (r.stdout + r.stderr)
    except subprocess.TimeoutExpired:
        return 124, f"timed out after {timeout}s"


def tail(text: str, n: int = 12) -> str:
    lines = [l for l in text.strip().splitlines() if l.strip()]
    return "\n".join("    " + l for l in lines[-n:])


def main(argv) -> int:
    o = opts(argv[1:])
    if not o.get("test") or o.get("help"):
        print(__doc__.strip(), file=sys.stderr)
        return 2
    test_cmd, base = str(o["test"]), str(o.get("base", "HEAD"))
    repeat, timeout = int(o.get("repeat", 3)), int(o.get("timeout", 600))
    globs = [g.strip() for g in str(o.get("tests", DEFAULT_TESTS)).split(",") if g.strip()]
    try:
        root = git("rev-parse", "--show-toplevel").strip()
        git("rev-parse", "--verify", base, cwd=root)
        changed = set(git("diff", "--name-only", base, cwd=root).split())
        changed |= set(git("ls-files", "--others", "--exclude-standard", cwd=root).split())
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 2
    generated = re.compile(r"(^|/)(__pycache__|\.pytest_cache|node_modules|target|dist|build|\.venv|\.mypy_cache|"
                           r"\.ruff_cache|coverage|\.next|\.svelte-kit|\.astro)(/|$)|\.pyc$")
    changed = {p for p in changed if not generated.search(p)}
    tests = sorted(p for p in changed if matches(p, globs) and Path(root, p).is_file())
    sources = sorted(p for p in changed if p not in tests)
    if not tests:
        print(f"no changed test files match {globs}; write the failing regression test first", file=sys.stderr)
        return 2
    print(f"base: {base}\ntest files carried to the old code: {', '.join(tests)}")
    print(f"code changes under test (the fix): {', '.join(sources) or '(none!)'}")
    if not sources:
        print("\nnot proven: there is no code change besides tests, so nothing was fixed")
        return 1

    wt = tempfile.mkdtemp(prefix="prove-fix-")
    try:
        git("worktree", "add", "--detach", "--quiet", wt, base, cwd=root)
        for p in tests:
            dst = Path(wt, p)
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(Path(root, p), dst)
        for name in [x.strip() for x in str(o.get("link", "")).split(",") if x.strip()]:
            src = Path(root, name)
            if src.exists() and not Path(wt, name).exists():
                os.symlink(src, Path(wt, name))
        if o.get("setup"):
            code, out = run(str(o["setup"]), wt, timeout)
            if code != 0:
                print(f"\nsetup failed in the old-code worktree (exit {code}):\n{tail(out)}", file=sys.stderr)
                return 2

        print(f"\n[1/2] old code ({base}) + new tests: expecting FAILURE x{repeat}")
        old = [run(test_cmd, wt, timeout) for _ in range(repeat)]
        print(f"[2/2] fixed code (working tree): expecting SUCCESS x{repeat}")
        new = [run(test_cmd, root, timeout) for _ in range(repeat)]
    finally:
        if o.get("keep"):
            print(f"\n(kept worktree at {wt}; remove with: git worktree remove {wt})")
        else:
            subprocess.run(["git", "worktree", "remove", "--force", wt], cwd=root, capture_output=True)
            shutil.rmtree(wt, ignore_errors=True)

    old_fail = [c != 0 for c, _ in old]
    new_pass = [c == 0 for c, _ in new]
    problems = []
    if not any(old_fail):
        problems.append("the test PASSES on the old code: it does not reproduce the bug")
    elif not all(old_fail):
        problems.append(f"FLAKY on old code: failed {sum(old_fail)}/{repeat} runs")
    if o.get("expect-fail") and any(old_fail):
        rx = re.compile(str(o["expect-fail"]))
        wrong = [i for i, (c, out) in enumerate(old) if c != 0 and not rx.search(out)]
        if wrong:
            problems.append(f"old code failed for a DIFFERENT reason ({len(wrong)} run(s)): "
                            f"/{o['expect-fail']}/ not in output (missing deps? use --setup or --link)")
    if not any(new_pass):
        problems.append("the test FAILS on the fixed code: the fix does not work")
    elif not all(new_pass):
        problems.append(f"FLAKY on fixed code: passed {sum(new_pass)}/{repeat} runs")

    print(f"\nold code: {sum(old_fail)}/{repeat} failed   fixed code: {sum(new_pass)}/{repeat} passed")
    if problems:
        for p in problems:
            print(f"NOT PROVEN: {p}")
        bad = next((out for c, out in old if c == 0), None) if not any(old_fail) else None
        sample = bad or next((out for c, out in new if c != 0), None) or old[0][1]
        print(f"\noutput sample:\n{tail(sample)}")
        return 1
    print("PROVEN: the regression test fails without the fix and passes with it.")
    print(f"old-code failure (should show the bug):\n{tail(old[0][1], 8)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
