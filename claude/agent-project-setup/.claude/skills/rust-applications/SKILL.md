---
name: rust-applications
description: Index for building Rust applications (binaries, CLIs, TUIs, desktop apps). Use when starting or reshaping a Rust app and you need to pick the right focused skill for architecture, async, config/CLI, observability, persistence, testing, UI, or release builds. Library publishing, MSRV, and library error policy stay in rust-development.
version: 2
---

# Rust Applications (Index)

This skill is a router. It does not repeat guidance; it points to the focused skill for each concern so that only one skill owns each rule.

## Pick the Skill

| Concern | Use |
|---|---|
| Library vs binary split, crate and module boundaries, subcommands vs binaries | `rust-app-architecture` |
| Tokio runtime, `spawn` / `spawn_blocking`, cancellation, graceful shutdown, timeouts | `rust-async-tokio` |
| `clap`, subcommands, config files, environment variables, XDG paths, `--dry-run` | `rust-config-and-cli` |
| `tracing`, spans, `EnvFilter`, redaction, command-level diagnostics | `rust-observability` |
| Atomic file writes, data directories, SQLite, ordered migrations | `rust-persistence` |
| Unit, integration, async, temp-dir, and property tests | `rust-testing` |
| CLI vs `ratatui` TUI vs native GUI, terminal restore on panic | `rust-ui` |
| Release profiles, feature flags, cross-compilation, lockfiles | `rust-release-and-cross-compile` |
| Crates.io publishing, MSRV, library error types, `unsafe` policy | `rust-development` |

Load the skills that match the task. Most new applications need `rust-app-architecture`, `rust-config-and-cli`, and `rust-observability` first.

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- `unwrap` / `expect` on recoverable failures in production paths (tests may use them)
- `unsafe` without explicit approval and a safety comment stating the invariant
- Destructive data migrations or deleting user data without a backup or dry-run
- Embedding secrets, tokens, or machine-specific credentials in source or default config
- Raising MSRV, publishing, or tagging a release without approval
- Adding a GUI or TUI stack the project does not already use, without saying so first
