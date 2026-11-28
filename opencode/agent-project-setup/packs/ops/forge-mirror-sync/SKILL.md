---
name: forge-mirror-sync
description: 'Mirror and back up repositories between GitHub and GitLab safely: append-only ref syncing that never force-pushes or deletes, branch-protection audits on both forges, and release (plus asset) syncing, with dry runs by default. Use when asked to "mirror a repo to GitLab", "back up GitHub", "sync branches/tags between forges", "push mirror", "check branch protection", "sync releases", "copy release assets", "set up a backup timer", or when a backup and its source have drifted. Not for everyday branch and pull request work (use git-workflow).'
metadata:
  version: '1'
---
# Cross-Forge Mirror & Backup Syncer

Keeps a second forge (usually a GitLab group) in step with the primary (usually GitHub)
without ever destroying history on either side. It audits refs, pushes only what's new or
fast-forward, preserves rewritten history under a separate name, checks that both forges
protect what matters, and recreates releases and their assets on the backup.

> [!CAUTION]
> **A backup must be append-only.** Never `git push --mirror` or `--force` to a backup:
> one rewritten or deleted branch on the source would wipe it from the backup too. The
> bundled script never forces and never deletes; diverged branches are kept as
> `rewritten/<branch>/<UTC>`. Every command is a **dry run unless `--apply`** is given. Get
> the owner's OK before the first `--apply`, before creating projects, and before changing
> protection settings. Pace API writes (no bursts), and never put tokens in remote URLs,
> logs or command lines.

---

## Steps

### 1. Inventory and decide what to sync

```bash
gh repo list <org> --limit 1000 --json name,isArchived,visibility,hasLFS 2>/dev/null || gh repo list <org> --limit 1000
glab repo list --group <backup-group> --all
```

| Data | Mirrored by this skill | Otherwise |
|---|---|---|
| Branches, tags | Yes (`mirror`) | |
| Releases (notes, dates) | Yes (`releases`) | |
| Release assets | Yes (`releases --assets`, via GitLab's generic package registry) | |
| Git LFS objects | No; step 5 | `git lfs push --all` from a local checkout |
| Issues, PRs, wikis, discussions | No | One-off export: GitHub migration archive or GitLab's GitHub importer; wikis are separate `.wiki.git` repos |
| Branch protection | Audited (`protect`), not copied | Set on each forge |

If an existing backup script or timer is already running, extend or audit it instead of
adding a second, competing one.

**Completion criterion:** a list of repos, what's synced for each, and what isn't (stated
to the owner).

---

### 2. Choose the mechanism

| Mechanism | Direction | Notes |
|---|---|---|
| **Scheduled job you control** (systemd timer, cron, CI schedule) running `forge_sync.py mirror` | Any | Append-only, LFS-aware, works on free plans. **Default.** |
| GitLab **pull mirroring** | GitHub → GitLab | Needs a paid GitLab tier for most setups, and it overwrites diverged refs |
| GitLab **push mirroring** | GitLab → GitHub | Free, but mirrors what GitLab has (wrong direction for a GitHub-primary backup) |
| GitHub Actions job pushing to GitLab | GitHub → GitLab | Runs on each push; needs a GitLab token as a GitHub secret; mind Actions minutes |
| `git push --mirror` | Any | **Never for backups**: deletes and force-overwrites |

**Completion criterion:** one mechanism chosen per repo set, with the reason.

---

### 3. Credentials (least privilege, never in URLs)

- **Read** on the source: `gh auth login` (or a fine-grained token with Contents: read).
- **Write** on the backup: a GitLab **group or project access token** with `write_repository`
  (and `api` for releases), or an SSH deploy key with write access.
- Push over **SSH**, or HTTPS with a credential helper. **Never** use
  `https://user:TOKEN@host/…`: it lands in `.git/config`, shell history, process lists and
  CI logs.
- Keep tokens in the system keyring or a secret store, with expiry dates and a rotation
  reminder.

**Completion criterion:** `gh auth status` and `glab auth status` succeed, and no token
appears in any remote URL (`git remote -v`).

---

### 4. Audit refs, then mirror (append-only)

```bash
S=<this-skill-dir>/scripts/forge_sync.py
python3 $S refs   --source git@github.com:org/repo.git --target git@gitlab.com:org-backup/repo.git --cache ~/.cache/forge-sync/repo.git
python3 $S mirror --source … --target … --cache …            # dry run: prints the push plan
python3 $S mirror --source … --target … --cache … --apply    # pushes, then re-verifies
```

`refs` fetches both sides into a private bare cache (your working clones are never touched)
and classifies every ref:

| State | Meaning | `mirror` does |
|---|---|---|
| `new` | Only on the source | Push it |
| `fast-forward` | Target is behind on the same history | Push it (a normal, non-forced push) |
| `up-to-date` | Same commit | Nothing |
| `DIVERGED` | History was rewritten on one side | Push the source version to `rewritten/<branch>/<UTC>` (tags: `rewritten/<tag>/<UTC>`); the target's ref is **left unchanged** |
| `target-only` | Deleted or never existed on the source | **Keep it** (the backup keeps deleted branches) |

Real run on two test repos:

```
new          heads/feature  - -> 897b169d6
DIVERGED     heads/hotfix  bcd50c68d -> 34ac46aad
fast-forward heads/main  07b36e47e -> a3c9a13f2
new          tags/v1.1  - -> a3c9a13f2
target-only  heads/legacy  b402a61b1 -> -
plan (append-only: no --force, nothing deleted):
  git push <target> 897b169d6040:refs/heads/feature                          # new
  git push <target> 34ac46aad4b1:refs/heads/rewritten/hotfix/20261128T010535Z # preserve rewritten history
  git push <target> a3c9a13f2439:refs/heads/main                              # fast-forward
  git push <target> a3c9a13f2439:refs/tags/v1.1                               # new
```

After `--apply`:
- The target's own `hotfix` and the target-only `legacy` were untouched, and the preserved
  copy matched the source's `hotfix` exactly.
- **Re-runs push nothing**: a rewritten history already preserved at that commit is skipped.
- A second rewrite adds exactly one more preserved copy.
- `--pace N` (default 2 seconds) spaces out pushes.

A `DIVERGED` branch needs a human look: someone force-pushed the source (or the backup).
Tell the owner which branch and both commit IDs; don't "fix" it by forcing either side.

**Completion criterion:** `mirror` reports `verified: 0 ref(s) still behind`, and every
DIVERGED ref was reported.

---

### 5. Git LFS (from a local checkout, not from the forge)

```bash
cd ~/path/to/local-checkout            # one that already has the LFS objects
git lfs fetch --all origin             # only if objects are missing locally
git lfs push --all git@gitlab.com:org-backup/repo.git
```

Pull LFS objects from a **local checkout** when possible: GitHub meters LFS bandwidth, and a
backup job that downloads every object from GitHub on each run burns the quota. Record which
local path serves each LFS repo in the job's config.

**Completion criterion:** `git lfs ls-files` on a fresh clone of the backup shows the
objects, not pointer files.

---

### 6. Audit branch protection on both forges

```bash
python3 $S protect --github org/repo --gitlab org-backup/repo --branches main,develop --require-reviews 1
```

| Checks | GitHub (classic protection **and** rulesets) | GitLab protected branches |
|---|---|---|
| Protected at all | Yes | Yes |
| Force push blocked | `allow_force_pushes` or a `non_fast_forward` rule | `allow_force_push` |
| Deletion blocked | `allow_deletions` or a `deletion` rule | Protected branches can't be deleted by non-maintainers |
| Required reviews ≥ policy | Classic, or a ruleset `pull_request` rule | (Merge request approvals are configured separately) |
| Who can push | | `push_access_levels` (30 Developer, 40 Maintainer, 0 No one) |

Real (recorded-response) run:

```
ok   github  develop          force push blocked        ← protected through a ruleset
FAIL github  develop          required reviews 0 (policy 1)
FAIL github  release          not protected (no branch protection, no ruleset)
FAIL gitlab  develop          force push ALLOWED
4 protection problem(s)   (exit 1)
```

**For backups, protect every branch on the backup** (`*`, force push off, push restricted
to the backup token's role) so even the backup job can't rewrite history. Change settings
only with the owner's approval; GitHub rulesets are preferred over classic protection for new
setups.

**Completion criterion:** `protect` exits 0 against the agreed policy, or every FAIL is
accepted by the owner in writing.

---

### 7. Sync releases and assets

```bash
python3 $S releases --github org/repo --gitlab org-backup/repo --assets           # dry run
python3 $S releases --github org/repo --gitlab org-backup/repo --assets --apply   # create
```

- **Skipped:** drafts. **Blocked** (reported, not created): releases whose tag isn't on
  GitLab yet, so run `mirror` first.
- Missing releases are created with the original name, notes (plus a "Mirrored from …" link)
  and date.
- With `--assets`, each asset is downloaded with `gh release download`, uploaded to
  GitLab's **generic package registry**
  (`packages/generic/<repo>/<version>/<file>`, sha256 recorded), and linked from the GitLab
  release. The link uses the real GitLab host (`GITLAB_HOST`, or `glab`'s configured host).
- Writes are paced (`--pace`).

Real (recorded-response) dry run: 3 releases (the draft excluded), 1 already on GitLab,
`v2.0-rc` **blocked** because its tag wasn't mirrored yet, and `v1.1` planned as a release
plus an asset upload plus an asset link.

**Completion criterion:** the counts on both forges match, nothing is blocked, and asset
links download the right files (spot-check one checksum).

---

### 8. Automate, monitor, and test a restore

A user-level systemd timer is a good default:

```ini
# ~/.config/systemd/user/forge-sync.service
[Service]
Type=oneshot
ExecStart=%h/.local/bin/forge-sync-all     # loops over repos: mirror --apply, releases --apply, protect
Nice=10

# ~/.config/systemd/user/forge-sync.timer
[Timer]
OnCalendar=*-*-* 00/6:20:00
Persistent=true
RandomizedDelaySec=300
[Install]
WantedBy=timers.target
```

- Use the exit codes: 0 clean, 1 drift or violations, 2 failure. Alert on 1 and 2 (a
  notification service, mail, or a status file the owner checks).
- Keep a state file (last success time per repo) and a log; `journalctl --user -u forge-sync`.
- Space repos out and keep runs modest: bursts of API calls or pushes look like abuse to
  forges.
- **Restore drill** (monthly): clone a repo from the backup into a temp dir, check out the
  default branch, run its build or tests, and compare `git rev-parse` of key refs with the
  source.

**Completion criterion:** the timer has run successfully at least once (check `systemctl
--user list-timers` and the log), and a restore drill passed.

---

## Reference

### Script commands

| Command | Reads | Writes (only with `--apply`) |
|---|---|---|
| `refs --source --target [--cache]` | Both remotes (into a private bare cache) | Nothing |
| `mirror … [--apply] [--pace]` | Same | Non-forced pushes of new/fast-forward refs and `rewritten/…` copies |
| `protect [--github] [--gitlab] [--branches] [--require-reviews]` | Protection, rulesets, protected branches | Nothing |
| `releases --github --gitlab [--assets] [--apply] [--pace]` | Releases, tags | GitLab releases, generic packages, release links |

API access goes through `gh` (`--paginate --slurp`) and `glab` (`--paginate --output ndjson`),
so their stored credentials are used and never printed. `FORGE_SYNC_FIXTURES=<dir>`
replays recorded API responses and logs writes, for testing.

### Anti-patterns

| Anti-pattern | Consequence | Fix |
|---|---|---|
| `git push --mirror` to the backup | A deleted or rewritten source branch destroys the backup copy | Append-only `mirror` |
| Token in the remote URL | Leaks via config, logs and process lists | SSH or a credential helper |
| Backup branches unprotected | The backup job itself can rewrite history | Protect `*` on the backup, force push off |
| Pulling LFS from GitHub on every run | Burns the LFS bandwidth quota | Push LFS from a local checkout |
| Releases synced before tags | Release creation fails or points at the wrong commit | `mirror` first, then `releases` |
| Never testing a restore | You learn the backup is broken during an emergency | Monthly restore drill |
| Silently "fixing" a diverged branch with `--force` | Destroys evidence and history | Preserve as `rewritten/…`, tell the owner |
