#!/usr/bin/env python3
"""Append-only mirroring, branch-protection audit and release sync between GitHub and GitLab.

  refs      --source URL --target URL [--cache DIR]
            Fetch both into a private bare cache and classify every branch and tag:
            new, up-to-date, fast-forward, DIVERGED (history rewritten), target-only.
  mirror    --source URL --target URL [--cache DIR] [--apply] [--pace 2]
            Push new refs and fast-forwards only. Never forces, never deletes: a diverged branch
            is preserved as refs/heads/rewritten/<branch>/<UTC> on the target. Dry run by default.
  protect   [--github OWNER/REPO] [--gitlab GROUP/PROJECT] [--branches main,release/*]
            [--require-reviews N]
            Audit protection: protected? force push / deletion blocked? required reviews?
  releases  --github OWNER/REPO --gitlab GROUP/PROJECT [--apply] [--assets] [--pace 2]
            GitHub releases missing on GitLab -> create them (tag must exist on GitLab),
            optionally re-uploading assets to GitLab's generic package registry.

API access goes through the `gh` and `glab` CLIs (their own auth; tokens are never read or
printed here). Exit: 0 clean, 1 drift/violations found, 2 bad usage or tool failure.
Testing hook: FORGE_SYNC_FIXTURES=<dir> answers API reads from JSON files and records writes.
"""
from __future__ import annotations

import datetime as dt
import fnmatch
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.parse
from pathlib import Path

FIXTURES = os.environ.get("FORGE_SYNC_FIXTURES")
WRITES: list[str] = []


def sh(*args, cwd=None, check=True) -> str:
    r = subprocess.run(list(args), capture_output=True, text=True, cwd=cwd)
    if check and r.returncode != 0:
        raise RuntimeError(f"{' '.join(args[:3])}…: {r.stderr.strip()[:300]}")
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


# ---------------- API layer (gh / glab, or fixtures) ----------------
def fixture_name(forge: str, path: str) -> Path:
    safe = path.strip("/").replace("/", "__").replace("?", "_").replace("&", "_").replace("=", "-")
    return Path(FIXTURES, forge, safe + ".json")


def api_get(forge: str, path: str):
    """Returns parsed JSON, or None on 404."""
    if FIXTURES:
        f = fixture_name(forge, path)
        return json.loads(f.read_text()) if f.exists() else None
    # gh: --slurp wraps every page in one array; glab: ndjson gives one object per line
    cmd = (["gh", "api", "--paginate", "--slurp", path] if forge == "github"
           else ["glab", "api", "--paginate", "--output", "ndjson", path])
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        if "404" in r.stderr or "Not Found" in r.stderr:
            return None
        raise RuntimeError(f"{forge} API {path}: {r.stderr.strip()[:200]}")
    text = r.stdout.strip()
    if not text:
        return None
    if forge == "gitlab":                       # all GitLab calls here are list endpoints
        return [json.loads(line) for line in text.splitlines() if line.strip()]
    pages = json.loads(text)
    if pages and all(isinstance(p, list) for p in pages):
        return [item for page in pages for item in page]      # list endpoint: flatten pages
    return pages[0] if len(pages) == 1 else pages              # single object (e.g. protection)


def api_write(forge: str, method: str, path: str, fields: dict, apply: bool) -> None:
    desc = f"{forge} {method} {path} {json.dumps(fields)[:160]}"
    if not apply or FIXTURES:
        WRITES.append(desc)
        return
    cmd = ["glab" if forge == "gitlab" else "gh", "api", "-X", method, path]
    for k, v in fields.items():
        cmd += ["-f", f"{k}={v}"]            # -f = raw string field in both gh and glab
    sh(*cmd)
    WRITES.append(desc + "  [done]")


def gitlab_base() -> str:
    """https://<host> for links in release assets: GITLAB_HOST, else glab's configured host."""
    if FIXTURES:
        return "https://gitlab.example"
    host = os.environ.get("GITLAB_HOST", "").strip()
    if not host:
        r = subprocess.run(["glab", "config", "get", "host"], capture_output=True, text=True)
        host = r.stdout.strip() or "gitlab.com"
    return host if host.startswith("http") else f"https://{host}"


def gl_project(path: str) -> str:
    return "projects/" + urllib.parse.quote(path, safe="")


# ---------------- refs / mirror ----------------
def cache_repo(o) -> str:
    d = str(o.get("cache") or Path(tempfile.gettempdir(), "forge-sync-cache"))
    if not Path(d, "HEAD").exists():
        Path(d).mkdir(parents=True, exist_ok=True)
        sh("git", "init", "--bare", "--quiet", d)
    return d


def fetch_side(cache: str, url: str, side: str) -> None:
    # refspecs keep both sides apart; --prune only affects this private cache's namespace
    sh("git", "fetch", "--quiet", "--prune", "--no-tags", url,
       f"+refs/heads/*:refs/{side}/heads/*", f"+refs/tags/*:refs/{side}/tags/*", cwd=cache)


def ref_map(cache: str, side: str) -> dict[str, str]:
    out = {}
    for line in sh("git", "for-each-ref", "--format=%(objectname) %(refname)", f"refs/{side}/", cwd=cache).splitlines():
        sha, ref = line.split(" ", 1)
        out[ref[len(f"refs/{side}/"):]] = sha
    return out


def classify(cache: str):
    src, dst = ref_map(cache, "src"), ref_map(cache, "dst")
    rows = []
    for ref, s in sorted(src.items()):
        d = dst.get(ref)
        if d is None:
            state = "new"
        elif d == s:
            state = "up-to-date"
        elif ref.startswith("heads/") and subprocess.run(
                ["git", "merge-base", "--is-ancestor", d, s], cwd=cache).returncode == 0:
            state = "fast-forward"
        else:
            state = "DIVERGED"
        rows.append((ref, state, s, d))
    for ref, d in sorted(dst.items()):
        if ref not in src:
            rows.append((ref, "target-only", None, d))
    return rows


def cmd_refs(o, mirror=False) -> int:
    if not o.get("source") or not o.get("target"):
        print("needs --source URL --target URL", file=sys.stderr)
        return 2
    cache = cache_repo(o)
    fetch_side(cache, str(o["source"]), "src")
    fetch_side(cache, str(o["target"]), "dst")
    rows = classify(cache)
    counts: dict[str, int] = {}
    for ref, state, s, d in rows:
        counts[state] = counts.get(state, 0) + 1
        if state != "up-to-date":
            print(f"{state:<12} {ref}  {(d or '-')[:9]} -> {(s or '-')[:9]}")
    print("\n" + ", ".join(f"{k}: {v}" for k, v in sorted(counts.items())))
    if not mirror:
        return 1 if any(st in ("new", "fast-forward", "DIVERGED") for _, st, _, _ in rows) else 0

    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dst_refs = ref_map(cache, "dst")
    pushes = []
    for ref, state, s, d in rows:
        kind, _, name = ref.partition("/")
        already = any(r.startswith(f"{kind}/rewritten/{name}/") and sha == s for r, sha in dst_refs.items())
        if state == "DIVERGED" and already:
            continue                     # this exact rewritten history is already preserved
        if state in ("new", "fast-forward"):
            if ref.startswith(("heads/rewritten/", "tags/rewritten/")):
                continue
            pushes.append((s, f"refs/{ref}", state))
        elif state == "DIVERGED" and ref.startswith("heads/"):
            pushes.append((s, f"refs/heads/rewritten/{ref[6:]}/{stamp}", "preserve rewritten history"))
        elif state == "DIVERGED":
            pushes.append((s, f"refs/tags/rewritten/{ref[5:]}/{stamp}", "preserve moved tag"))
    if not pushes:
        print("nothing to push")
        return 0
    print("\nplan (append-only: no --force, nothing deleted):")
    for s, dst_ref, why in pushes:
        print(f"  git push <target> {s[:12]}:{dst_ref}   # {why}")
    if not o.get("apply"):
        print("\n(dry run; add --apply to push)")
        return 0
    pace = float(o.get("pace", 2))
    for i, (s, dst_ref, why) in enumerate(pushes):
        sh("git", "push", "--quiet", str(o["target"]), f"{s}:{dst_ref}", cwd=cache)  # no --force, ever
        print(f"  pushed {dst_ref}")
        if i < len(pushes) - 1:
            time.sleep(pace)
    fetch_side(cache, str(o["target"]), "dst")
    left = [r for r in classify(cache) if r[1] in ("new", "fast-forward")]
    print(f"\nverified: {len(left)} ref(s) still behind")
    return 1 if left else 0


# ---------------- protection ----------------
def cmd_protect(o) -> int:
    branches = [b.strip() for b in str(o.get("branches", "main")).split(",")]
    need_reviews = int(o.get("require-reviews", 0))
    problems = 0

    def report(forge, branch, ok, msg):
        nonlocal problems
        problems += 0 if ok else 1
        print(f"{'ok  ' if ok else 'FAIL'} {forge:<7} {branch:<16} {msg}")

    if o.get("github"):
        repo = str(o["github"])
        for b in branches:
            if "*" in b:
                print(f"note    github  {b:<16} wildcards: check rulesets with `gh ruleset list`")
                continue
            p = api_get("github", f"repos/{repo}/branches/{b}/protection")
            rules = api_get("github", f"repos/{repo}/rules/branches/{b}") or []
            types = {r.get("type") for r in rules}
            if p is None and not rules:
                report("github", b, False, "not protected (no branch protection, no ruleset)")
                continue
            force_ok = (p or {}).get("allow_force_pushes", {}).get("enabled", False) and "non_fast_forward" not in types
            del_ok = (p or {}).get("allow_deletions", {}).get("enabled", False) and "deletion" not in types
            reviews = ((p or {}).get("required_pull_request_reviews") or {}).get("required_approving_review_count", 0)
            for r in rules:
                if r.get("type") == "pull_request":
                    reviews = max(reviews, r.get("parameters", {}).get("required_approving_review_count", 0))
            report("github", b, not force_ok, "force push " + ("ALLOWED" if force_ok else "blocked"))
            report("github", b, not del_ok, "deletion " + ("ALLOWED" if del_ok else "blocked"))
            report("github", b, reviews >= need_reviews, f"required reviews {reviews} (policy {need_reviews})")
    if o.get("gitlab"):
        proj = gl_project(str(o["gitlab"]))
        prot = api_get("gitlab", f"{proj}/protected_branches") or []
        for b in branches:
            match = next((p for p in prot if fnmatch.fnmatch(b, p["name"]) or p["name"] == b), None)
            if not match:
                report("gitlab", b, False, "not protected")
                continue
            report("gitlab", b, not match.get("allow_force_push", False),
                   "force push " + ("ALLOWED" if match.get("allow_force_push") else "blocked"))
            push_levels = [a.get("access_level") for a in match.get("push_access_levels", [])]
            report("gitlab", b, all(lv is None or lv >= 30 for lv in push_levels),
                   f"push allowed for access levels {push_levels} (30=Developer, 40=Maintainer, 0=No one)")
    if not o.get("github") and not o.get("gitlab"):
        print("needs --github OWNER/REPO and/or --gitlab GROUP/PROJECT", file=sys.stderr)
        return 2
    print(f"\n{problems} protection problem(s)")
    return 1 if problems else 0


# ---------------- releases ----------------
def cmd_releases(o) -> int:
    if not o.get("github") or not o.get("gitlab"):
        print("needs --github OWNER/REPO --gitlab GROUP/PROJECT", file=sys.stderr)
        return 2
    repo, proj = str(o["github"]), gl_project(str(o["gitlab"]))
    apply, pace = bool(o.get("apply")), float(o.get("pace", 2))
    gh_rel = [r for r in (api_get("github", f"repos/{repo}/releases?per_page=100") or []) if not r.get("draft")]
    gl_tags = {r["tag_name"] for r in (api_get("gitlab", f"{proj}/releases?per_page=100") or [])}
    gl_git_tags = {t["name"] for t in (api_get("gitlab", f"{proj}/repository/tags?per_page=100") or [])}
    missing = [r for r in gh_rel if r["tag_name"] not in gl_tags]
    print(f"GitHub releases: {len(gh_rel)}   on GitLab: {len(gh_rel) - len(missing)}   missing: {len(missing)}")
    blocked = 0
    for r in sorted(missing, key=lambda r: r.get("published_at") or ""):
        tag = r["tag_name"]
        if tag not in gl_git_tags:
            blocked += 1
            print(f"  BLOCKED {tag}: tag not on GitLab yet; run `mirror` first")
            continue
        notes = (r.get("body") or "") + f"\n\n_Mirrored from {r.get('html_url', 'GitHub')}_"
        api_write("gitlab", "POST", f"{proj}/releases",
                  {"tag_name": tag, "name": r.get("name") or tag, "description": notes,
                   "released_at": r.get("published_at") or ""}, apply)
        if o.get("assets"):
            for a in r.get("assets", []):
                pkg = f"{proj}/packages/generic/{urllib.parse.quote(repo.split('/')[-1])}/{urllib.parse.quote(tag.lstrip('v'))}/{urllib.parse.quote(a['name'])}"
                if apply and not FIXTURES:
                    with tempfile.TemporaryDirectory() as tmp:
                        sh("gh", "release", "download", tag, "-R", repo, "-p", a["name"], "-D", tmp)
                        f = Path(tmp, a["name"])
                        digest = hashlib.sha256(f.read_bytes()).hexdigest()
                        sh("glab", "api", "-X", "PUT", pkg, "--input", str(f), "-H", "Content-Type: application/octet-stream")
                        WRITES.append(f"gitlab PUT {pkg} sha256={digest[:16]}  [done]")
                else:
                    WRITES.append(f"gitlab PUT {pkg}  ({a.get('size', '?')} bytes, sha256 recorded on upload)")
                api_write("gitlab", "POST", f"{proj}/releases/{urllib.parse.quote(tag, safe='')}/assets/links",
                          {"name": a["name"], "url": f"{gitlab_base()}/api/v4/{pkg}", "link_type": "package"}, apply)
        if apply:
            time.sleep(pace)
    for w in WRITES:
        print(f"  {'' if apply and not FIXTURES else 'would: '}{w}")
    if not apply and missing:
        print("\n(dry run; add --apply to create releases" + (" and upload assets)" if o.get("assets") else ")"))
    return 1 if (missing and not apply) or blocked else 0


def main(argv) -> int:
    cmds = {"refs": lambda o: cmd_refs(o), "mirror": lambda o: cmd_refs(o, mirror=True),
            "protect": cmd_protect, "releases": cmd_releases}
    if len(argv) < 2 or argv[1] not in cmds:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    try:
        return cmds[argv[1]](opts(argv[2:]))
    except (RuntimeError, json.JSONDecodeError, FileNotFoundError) as exc:
        print(exc, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
