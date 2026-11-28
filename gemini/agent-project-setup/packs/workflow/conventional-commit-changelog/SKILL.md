---
name: conventional-commit-changelog
description: Split staged changes into atomic Conventional Commits and keep CHANGELOG.md current in Keep a Changelog format, with a semantic-version suggestion for each release. Use when asked to "commit these changes", "split this into commits", "atomic commits", "write a commit message", "conventional commits", "lint commit messages", "commit-msg hook", "update the changelog", "generate CHANGELOG.md", "prepare a release", "what version should this be", or "keep a changelog". Not for branching, rebasing or pull request process (use git-workflow).
metadata:
  version: '1'
---
# Conventional Commit & Changelog Generator

Turns a pile of staged changes into a sequence of atomic, well-described commits, checks
every message against the Conventional Commits spec, and turns the history since the last
tag into human-readable Keep a Changelog entries with the right semantic version.

> [!CAUTION]
> The bundled script **plans and prints; it never commits, pushes or tags.** Show the owner
> the proposed grouping and messages before committing, follow the repo's own commit rules
> (required trailers, credit lines, signed-off-by, branch policy) on top of this skill, and
> never rewrite history that has been pushed. Re-staging whole files when some hunks are
> only partly staged sweeps unrelated work into a commit, so watch the plan's partial-stage
> warning.

---

## Steps

### 1. Read the repo's conventions first

```bash
git log --oneline -20                       # existing message style, scopes in use
ls .commitlintrc* commitlint.config.* cliff.toml release-please-config.json .changeset 2>/dev/null
cat CONTRIBUTING.md 2>/dev/null | grep -iA5 commit
```

- If the repo uses **commitlint, git-cliff, release-please, changesets or semantic-release**,
  use that tool's config as the rules and its generator for the changelog. Use this skill's
  script only where it fills a gap.
- Note required **trailers** (for example a credit line, `Co-Authored-By`,
  `Signed-off-by`) and add them to every commit; the linter allows trailers.
- Scopes: reuse the ones already in history (`git log --format=%s | grep -o '^[a-z]*([^)]*)' | sort | uniq -c`).

**Completion criterion:** you know the allowed types, scopes, trailers and any existing release tooling.

---

### 2. Review what's staged

```bash
git diff --cached --stat
git diff --cached             # read every hunk; a commit message can only be as good as your understanding
git status --short            # anything unstaged or untracked that belongs in these commits?
```

**Completion criterion:** you can say in one line what each changed file does.

---

### 3. Plan atomic commits

```bash
python3 <this-skill-dir>/scripts/ccl.py plan          # staged files
python3 <this-skill-dir>/scripts/ccl.py plan --all    # include unstaged and untracked
```

Real output (scratch repo):

```
6 proposed commit(s) from 8 file(s):
[1] ci: <describe the change>                 A .github/workflows/ci.yml
[2] build(deps): <describe the change>        M Cargo.toml
[3] docs: <describe the change>               A docs/guide.md
[4] fix|feat|refactor|perf(cli): …            M src/cli/main.rs
[5] feat(parser): …                           A src/parser/lexer.rs, M src/parser/mod.rs,
                                              A tests/parser_lexer_test.rs
[6] test: <describe the change>               A tests/other_test.rs
WARNING: these files have BOTH staged and unstaged changes … use `git add -p`: src/cli/main.rs
```

How it groups:
- **Separate commits for:** dependency manifests and lockfiles (`build(deps)`), CI config
  (`ci`), docs (`docs`), tooling config (`chore(config)`), and the changelog (`chore(release)`).
- **Code by scope:** the crate, package or app name, or the first folder under `src/`.
- **Tests travel with the code they test** (matched by scope name in the test path).
  Leftover tests become a `test:` commit.
- A suggested type: `feat` when the group only adds or edits files with new ones among them;
  otherwise you choose from the diff.

Then refine by hand. **An atomic commit:**
- Does **one** logical thing (if the message needs "and", split it).
- Leaves the project **building and passing tests** at that commit.
- Includes its own tests and docs for that change.
- Contains no unrelated formatting or drive-by edits (put those in a separate `style:` or
  `refactor:` commit).

Split a single file across commits with `git add -p <file>` (or `git add -e`). Order the
commits so each one builds: dependencies first, then code, then docs.

**Completion criterion:** a list of commits, each with its files or hunks and one purpose,
shown to the owner.

---

### 4. Write each message

```
<type>(<scope>)!: <imperative description, lower-case, no period, ≤ 72 chars>

<body: what changed and WHY, wrapped at ~72; not a list of files>

BREAKING CHANGE: <what breaks and how to migrate>
Refs: #123
<repo-required trailers>
```

| Type | For | Version effect |
|---|---|---|
| `feat` | A new capability for users | minor |
| `fix` | A bug fix for users | patch |
| `perf` | Faster or leaner, same behaviour | patch |
| `refactor` | Code change, no behaviour change | none |
| `docs` | Documentation only | none |
| `test` | Tests only | none |
| `build` | Build system, dependencies | none (unless shipped) |
| `ci` | CI configuration | none |
| `style` | Formatting only | none |
| `chore` | Maintenance that fits nothing else | none |
| `revert` | Reverts an earlier commit | depends |
| `!` or `BREAKING CHANGE:` | Incompatible change (any type) | **major** (minor while 0.x) |

Lint every message before committing, and optionally install it as a hook (ask the owner
first; hooks change repo behaviour):

```bash
printf '%s\n' "feat(parser): add lexer for string literals" | python3 <this-skill-dir>/scripts/ccl.py lint-msg -
# hook: .git/hooks/commit-msg →  exec python3 <this-skill-dir>/scripts/ccl.py lint-msg "$1"
```

`lint-msg` rejects:
- A header that isn't `type(scope)!: description`, or an unknown type.
- A capitalised or past-tense description ("Added", "fixes"), or a trailing period.
- A header over 72 characters, or a non-blank second line.
- A malformed `BREAKING CHANGE:` footer, or a body line over 100 characters (URLs excepted).

It lets `Merge`, `Revert "…"`, `fixup!` and `squash!` through. Tested on seven messages,
it gave the right verdict on each.

**Completion criterion:** every message passes `lint-msg` and carries the repo's required trailers.

---

### 5. Commit, after approval

Run the plan's commands group by group: `git restore --staged -- .`, then `git add` for each
group and commit with its message. After each commit, run the project's fast checks (build,
unit tests); if one fails, fix that commit before moving on (`git commit --amend` while it's
unpushed). Don't push unless the owner asks; follow the repo's branch and PR rules.

**Completion criterion:** `git log --oneline` shows the planned commits in order, and each
builds and passes tests.

---

### 6. Update CHANGELOG.md (Keep a Changelog)

```bash
python3 <this-skill-dir>/scripts/ccl.py changelog                     # dry run → [Unreleased]
python3 <this-skill-dir>/scripts/ccl.py changelog --write             # add new entries to [Unreleased]
python3 <this-skill-dir>/scripts/ccl.py changelog --version 0.2.0 --write   # cut a release
```

How commits map to sections:

| Commit | Section |
|---|---|
| `feat` | **Added** |
| any breaking change (`!` / `BREAKING CHANGE:`) | **Changed**, prefixed **BREAKING:** with the migration note |
| `perf`, `revert` | **Changed** |
| description starts with "deprecate" | **Deprecated** |
| description starts with "remove", "drop" or "delete" (feat/refactor/chore) | **Removed** |
| `fix` | **Fixed** |
| scope `security` or description starts with "security" | **Security** |
| `refactor`, `docs`, `test`, `build`, `ci`, `style`, `chore` | left out (internal); `--include-internal` puts them under Changed |

What the script does:
- Reads commits since the last tag (or `--since`), skips merges, and **suggests the next
  version**: breaking → major (minor while 0.x), any `feat` → minor, otherwise patch.
- **Never duplicates:** an entry already in the file (same short hash or description) is
  skipped, so re-running adds nothing and exits 1.
- **Keeps hand-written entries** in `[Unreleased]` and merges new ones under the right
  headings.
- **Releasing** (`--version`) moves all of `[Unreleased]` into
  `## [X.Y.Z] - YYYY-MM-DD`, leaves an empty `[Unreleased]`, and adds compare links for
  GitHub, GitLab or Codeberg remotes. It refuses to cut an empty release.
- Creates the file with the standard Keep a Changelog header if it's missing.

Then **edit for humans**: rewrite commit-speak into what users notice ("Rename `--out` to
`--output`; update scripts" rather than "refactor arg parser"), merge entries that are one
user-visible change, and drop noise. The changelog is for people, not a git log dump.

Real result after a release:

```markdown
## [Unreleased]

## [0.2.0] - 2026-11-27

### Added

- Hand-written note about the new config format
- **parser:** Add lexer for string literals (88576a9)

### Changed

- **BREAKING:** **cli:** Rename --out to --output — scripts using --out must switch to --output (04f6170)

### Deprecated

- **cli:** Deprecate the --legacy flag (2c84979)

### Fixed

- **cli:** Handle empty input without panicking (abebd4d)

### Security

- Reject path traversal in include directives (49fc7a5)

[Unreleased]: https://github.com/example/demo/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/example/demo/compare/v0.1.0...v0.2.0
```

**Completion criterion:** `[Unreleased]` (or the new version) lists every user-facing
change once, in plain language, and the version follows SemVer.

---

### 7. Release flow (when asked)

1. `changelog --version X.Y.Z --write`, then edit the wording.
2. Bump the version in manifests (`Cargo.toml`, `package.json`, …) and refresh the lockfile.
3. Commit both: `chore(release): vX.Y.Z`.
4. Tag `vX.Y.Z` only if the owner asks; many owners push tags themselves.
5. Release notes: copy the version's section from CHANGELOG.md.

**Completion criterion:** the changelog, manifest version and tag (if created) agree.

---

## Reference

### Script commands

| Command | Does | Changes anything? |
|---|---|---|
| `plan [--all]` | Groups staged (or all) changes into proposed commits; prints commands | No |
| `lint-msg <file\|->` | Validates one message; exit 1 on problems | No |
| `changelog [--since T] [--version X \| --unreleased] [--include-internal] [--file F]` | Builds entries, suggests a version | Only with `--write` |

### Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| `git add -A && git commit -m "updates"` | No history, no changelog, unrevertable | Plan atomic commits |
| A feature in one commit, its tests in another | Bisect lands on a commit without tests | Tests travel with the code |
| `feat:` for a refactor | Wrong version bump, misleading changelog | Choose the type from user impact |
| Breaking change with no `!` or footer | Users upgrade into breakage | `!` plus `BREAKING CHANGE:` with migration |
| Changelog = raw commit subjects | Unreadable for users | Edit for humans; leave internal changes out |
| Re-staging whole files with partial hunks staged | Unrelated work in the commit | `git add -p` |
| Rewriting pushed history to "clean up" | Breaks everyone's clones | Only amend or rebase unpushed commits |
