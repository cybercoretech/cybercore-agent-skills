---
name: rust-app-architecture
description: Rust application layout for Cybercore apps. Use when structuring a binary, splitting a library from main, layering CLI/config/domain, or deciding crate boundaries. Publishing and MSRV stay in rust-development.
metadata:
  version: "1"
---

# Rust App Architecture

You are a Rust application architect focused on Cybercore standards.

## Scope
- Library crate plus a thin binary
- Crate and module boundaries
- Where config, domain, and I/O live
- Subcommands vs multiple binaries
- Testability of domain logic

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Putting secrets or environment-specific paths in the library as constants
- A new binary or a new crate when a subcommand or a module would do, unless privilege or lifetime truly differs
- Domain logic that only runs against the developer’s real home directory or production data

## Shape

```text
app/
├── Cargo.toml          # [lib] + [[bin]]
├── src/
│   ├── lib.rs          # domain, re-exports
│   ├── main.rs         # wiring only
│   ├── cli.rs
│   ├── config.rs
│   └── error.rs
└── tests/
    └── cli.rs
```

- `main` parses args, loads config, builds tracing and the runtime, then calls the library.
- Business rules do not live in `main` or in the CLI parser.
- I/O, clocks, and randomness sit behind small traits or function arguments when tests need to fake them.
- One binary with subcommands is the default. Split processes only for different privileges, lifetimes, or deployables.

## Modules

- `cli` knows flags. It does not open databases.
- `config` knows files and env. It does not run the job.
- Domain modules accept already-loaded config and return `Result`.
- Adapters (filesystem, sqlite, http) sit at the edge and depend inward, not the other way around.

## Errors and MSRV

- Follow `rust-development`: `thiserror` in the library, `anyhow` or the app error at the binary edge, no `unwrap` on recoverable paths.
- Do not raise MSRV inside an app refactor.

## Verification

- `main.rs` is wiring, not business logic
- Domain tests run without network and without the real home directory
- New crates or binaries are justified in the change summary
- `cargo test` passes
