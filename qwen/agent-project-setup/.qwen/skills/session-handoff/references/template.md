# Handoff Template

```markdown
# AGENT_HANDOFF: <project> (local only, never commit)

**Updated:** 2026-11-19 by <agent or person>

## Objective
What this work is for, in one or two lines.

## State now (verified 2026-11-19)
- Branch `feat/parser` at `a1b2c3d`; working tree clean
- PR #42 (parser) open, CI green, awaiting review
- PR #41 (config loader) merged as `9f8e7d6`; main CI green
- Nothing running in the background

## Next steps
1. After #42 merges: sync main, delete `feat/parser`, branch `feat/cli-flags`
2. Write the failing test for `--dry-run`, then implement it
3. Update the README usage section

## Decisions
| Decision | By | Why | Date |
|---|---|---|---|
| Config files use TOML, not YAML | User | Matches the rest of the toolchain | 2026-11-18 |
| Parser errors carry line and column | Agent (my call) | Needed for useful messages; easy to change | 2026-11-19 |

## Gotchas
- Integration tests need `WORKBENCH_STORE` unset, or they use the real store
- `cargo test` on this machine needs `--locked`; the lockfile is checked in CI

## Open questions
1. Should `--dry-run` print a diff or a summary? Recommended: summary, with `--verbose` for the diff.

## How to resume
1. `git fetch && git status && git log -1 --oneline`
2. Check PR #42: `gh pr view 42 --json state,statusCheckRollup`
3. Run checks: `cargo fmt --check && cargo clippy -- -D warnings && cargo test --locked`

## Pointers
- `docs/decisions/0007-config-format.md`
- `src/parser/mod.rs` (entry point)
- Issue #38 (the original request)
```

## Sections for several workstreams

```markdown
## Workstream: parser
State, next steps, open questions for this stream only.

## Workstream: website
...
```

Keep shared gotchas and decisions in one place at the top.

## Keeping it local

```sh
echo "AGENT_HANDOFF.md" >> .git/info/exclude
git check-ignore -v AGENT_HANDOFF.md   # confirms it is excluded
```

`.git/info/exclude` keeps the file out of commits without changing the project's shared `.gitignore`.
