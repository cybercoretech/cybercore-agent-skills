---
name: rust-applications
description: Rust application architecture for Cybercore and Omarchy apps. Use when building binaries, CLIs, TUIs, or desktop apps — config, tracing, Tokio, persistence, tests, UI choice, and release builds. Publishing, MSRV, and library error policy stay in rust-development.
version: 1
---

# Rust Applications

You are a Rust application specialist focused on Cybercore repository standards.

Library crates, crates.io publishing, MSRV policy, and the library error rules live in `rust-development`. Follow that skill for those. This skill is how to build the application around them.

## Scope
- Binary layout: library crate plus thin binary
- Configuration (`clap`, files, environment)
- Observability with `tracing`
- Async with Tokio: runtime, shutdown, cancellation, blocking work
- Persistence: files and SQLite, with explicit migrations
- Integration and property tests
- Choosing CLI, TUI, or GUI
- Release profiles and cross-compilation

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- `unwrap` / `expect` on recoverable failures in production paths (tests may use them)
- `unsafe` without explicit approval and a safety comment stating the invariant
- Destructive data migrations or deleting user data without a backup or dry-run
- Embedding secrets, tokens, or machine-specific credentials in source or default config
- Raising MSRV, publishing, or tagging a release without approval (`rust-development`)
- Shipping a GUI or TUI stack the project does not already use, without saying so first

## Application Shape

- Put domain logic in a library crate. The binary parses args, loads config, builds the runtime, and calls the library.
- One binary with subcommands beats many binaries, unless the processes have different privileges or lifetimes.
- Keep I/O, clocks, and randomness behind small traits or function arguments so logic stays testable.
- Do not put business rules in `main`.

```text
app/
├── Cargo.toml          # [lib] + [[bin]]
├── src/
│   ├── lib.rs
│   ├── main.rs         # wiring only
│   ├── cli.rs
│   ├── config.rs
│   └── error.rs
└── tests/
    └── cli.rs          # integration tests against the binary or public API
```

## Configuration

- Parse the CLI with `clap` (derive). Subcommands and `--help` must stay accurate.
- Layer config in this order, later wins: compiled defaults, config file, environment variables, CLI flags.
- Use XDG paths on Linux (`~/.config/<app>/`, `~/.local/share/<app>/`). On Omarchy, stay in user config; do not write `/usr`.
- Fail at startup on invalid config. Do not silently ignore a bad file.
- Support `--dry-run` on commands that mutate files, databases, or the machine.

## Observability

- Use `tracing`, not `println!`, for operational output.
- Initialize a subscriber once in `main` (for example `tracing-subscriber` with `EnvFilter`).
- Default level is `info`. `RUST_LOG` overrides it.
- Log at the edges: startup config (redacted), request or command start/finish, and errors with context.
- Never log secrets, tokens, or full personal data.
- User-facing success text stays short. Detail goes to the log or `-v`.

## Async (Tokio)

- One multi-thread runtime in the binary, created explicitly. Do not nest runtimes.
- `async` is for I/O. CPU-heavy or blocking filesystem/C calls go on `spawn_blocking` or a dedicated thread.
- Bound concurrency (`Semaphore`, limited `JoinSet`). Do not spawn unbounded tasks per item.
- Cancellation: hold `CancellationToken` or a shutdown channel. Dropping a future must not leave half-written files or open transactions.
- Graceful shutdown: on Ctrl-C / SIGTERM, stop accepting work, finish or abort in-flight work with a timeout, flush logs, then exit non-zero only on real failure.
- Do not `block_on` inside an async worker.
- Timeouts belong on network and lock waits, not as a substitute for fixing a hang.

## Errors

Follow `rust-development`:

- Libraries: `thiserror`, `Result`, `?`. No `unwrap` in production library code.
- Binaries: `anyhow` (or the app error type) at the edge, with context (`with_context`).
- Exit code `0` on success, non-zero on user or system failure. Panic is a bug, not a control-flow tool.

## Persistence

- Pick the simplest store that fits: one file (JSON/TOML) for small config-like state, SQLite for queryable or multi-record data.
- Migrations are explicit and ordered. Never edit a migration that has already shipped; add a new one.
- Open the database with a known journal mode and a busy timeout. Do not hold a transaction across `.await` points unless the API is documented async-safe.
- Write files atomically: write a temp file in the same directory, fsync when durability matters, then rename.
- User data lives under the data dir, not beside the binary and not in the git repo.

## Testing

- Unit-test pure logic in the library. No network, no real home directory.
- Integration tests live in `tests/` and exercise the public API or the binary.
- Give tests their own temp directory. Never touch the developer’s real config or database.
- Property tests (`proptest`) for parsers, encodings, and anything with a clear invariant. Keep them fast.
- Async tests use `tokio::test` and a timeout so a stuck task fails the run.
- `cargo test` must pass without extra services unless the crate documents them.

## Interface Choice

Stay with the stack the repo already uses. If none exists, prefer the simplest that meets the need:

| Need | Default |
|---|---|
| Agent- and script-friendly tool | CLI (`clap`) |
| Interactive terminal app | `ratatui` + `crossterm` |
| Native desktop on Omarchy / Linux | Only if required; say which toolkit and why before adding it |
| Library consumed by other Rust | No UI |

- A CLI remains usable non-interactively even if a TUI exists.
- Do not add GPUI, iced, or egui “for later.”
- TUI and GUI code stay out of the domain library.

## Release and Cross-Compilation

- Release profile: `lto = "thin"`, `codegen-units = 1`, `strip = "symbols"` unless the project needs symbols for crash reports.
- `cargo build --release` is the artifact users run. Debug builds are for development.
- Cross-compiling needs an explicit target and a linker/sysroot story. Do not claim a target works until it links.
- Omarchy/Arch x86_64 is the default host. Apple Silicon or other targets are opt-in and called out.
- Feature flags must be documented. Default features should build the normal app without optional databases or GUIs you did not intend to require.
- Lock the binary’s `Cargo.lock` and commit it.

## Verification

Before finishing application work:

- `cargo fmt --check`
- `cargo clippy --all-targets -- -D warnings` (or the project’s clippy flags)
- `cargo test`
- `--help` matches the real flags and subcommands
- Mutating commands have a dry-run or refuse to run without a target path
- Config and data paths are user-level, not system-owned
- Logs do not contain secrets
- Shutdown path was considered if the process is long-running
- MSRV / publish rules from `rust-development` still hold
