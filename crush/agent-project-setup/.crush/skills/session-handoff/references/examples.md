# Examples

## A diary (avoid)

```markdown
- 2026-11-10: started the parser
- 2026-11-11: parser half done, tests failing
- 2026-11-12: fixed tests, opened PR #40
- 2026-11-13: PR #40 merged. Started config loader
- 2026-11-14: config loader PR #41 open, CI red
- 2026-11-15: CI fixed
...
```

The next session has to read everything to learn the current state, and stale lines ("CI red") contradict later ones. History belongs in git.

## The same, as current state

```markdown
## State now (verified 2026-11-19)
- PR #40 (parser) and #41 (config loader) merged; main CI green
- No open PRs; working tree clean on main at `9f8e7d6`

## Next steps
1. Branch `feat/cli-flags` from main
2. Failing test for `--dry-run`, then implement
```

## Vague versus actionable next steps

- Vague: "Continue working on the CLI."
- Actionable: "Branch `feat/cli-flags` from main. First write the failing test `dry_run_prints_summary` in `tests/cli.rs`, then implement `--dry-run` in `src/cli.rs`."

## Recording decisions

- Weak: "Using TOML."
- Strong: "Config format is TOML (user's decision, 2026-11-18, to match the rest of the toolchain). Don't switch to YAML without asking."

## Handing a task to another agent

```markdown
**Objective:** add a `--dry-run` flag to `tool sync`.
**Change only:** `src/cli.rs`, `src/sync.rs`, `tests/cli.rs`. Do not touch `src/config/`.
**State:** main at `9f8e7d6`, CI green.
**Respect:** config stays TOML; no new dependencies.
**Done when:** `cargo test --locked` passes, including a new test proving no files change in dry-run mode.
**Report:** the diff summary, test output, and anything you could not do.
```

## A handoff that conflicts with the user

The handoff says "next: migrate to Postgres", but the user now asks to fix a login bug. Follow the user, note the open migration in the handoff as still pending, and do not start the migration.
