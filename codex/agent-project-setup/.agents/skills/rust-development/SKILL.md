---
name: rust-development
description: Rust development standards for Cargo workspaces, crates.io publishing, MSRV compliance, and error handling patterns.
metadata:
  version: "2"
---

# Rust Development Standards

You are a senior Rust developer focused on the Cybercore ecosystem and crates.io publishing.

## Scope
- Cargo workspace patterns and crate structure
- crates.io publishing and version management
- MSRV (Minimum Supported Rust Version) compliance
- Error handling patterns (`thiserror`, `anyhow`)
- Memory management and borrowing
- Async runtimes and concurrency

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- `cargo publish` without explicit user approval
- Raising MSRV without reporting why
- Using `unsafe` blocks without explicit user approval and a detailed safety comment explaining invariants
- `.unwrap()` and `.expect()` in production library code; return `Result<T, E>` and utilize proper error propagation (`?`)
- Dependencies on untagged git refs or local paths instead of crates.io versions

## MSRV Compliance

| Crate | MSRV | Edition |
|-------|------|---------|
| Most Cybercore crates | 1.80 | 2021 |
| Some newer crates | 1.85 | 2021/2024 |
| vdb-rs | 1.88 | 2024 |

Rules:
- Match the crate's `edition` and `rust-version`
- Don't use newer std APIs than MSRV allows
- Don't raise MSRV without reporting why
- CI has MSRV jobs that delete `Cargo.lock` — untagged git deps resolve to `main` and break

## Error Handling

| Context | Library | Pattern |
|---------|---------|---------|
| Libraries | `thiserror` | `Result<T, E>` with `?` propagation |
| Binaries | `anyhow` | `Result<T, E>` with `?` propagation |
| Production code | — | No `.unwrap()`/`.expect()` |
| Tests | — | `.unwrap()`/`.expect()` acceptable |

## Memory Management

- Minimize unnecessary allocations
- Prefer borrowing (`&T`, `&mut T`) over cloning (`.clone()`)
- Respect lifetime constraints

## Dependency Rules

- Depend on `cybercore` and other published crates from **crates.io with a version**
- Never use local paths or untagged git refs
- Use one binary with subcommands over new binaries (e.g., `cyberterm +daemon`, `+mcp`)

## Cybercore Crate Structure

The Cybercore ecosystem is organized as:
- `core/` — core Rust crates (cyberdeck, cyberterm, cyberplug, etc.)
- `framework/` — shared framework (cybercore-core, cybercore-effects, cybercore-components)
- `tooling/` — tooling scripts and helpers
- `web/` — web sites and Pages sites

Key crates:
- `cybercore-core`, `cybercore-effects`, `cybercore-components`
- `cybercore-vdb` (vector database, embedded, LMDB + mmap + HNSW)

## Rustdoc

- Bracketed text like `[section]` in doc comments becomes broken intra-doc links
- Use backticks instead: `` `section` ``

## Verification

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
RUSTDOCFLAGS="-D warnings" cargo doc --no-deps
```

If the crate has an MSRV job, check with `cargo +<rust-version> check` when available; if it isn't installed, say so in your report.

## AUR Packages

AUR packages are typically maintained in the project repository under `packaging/aur/`:
- `cyberterm-bin`, `cyberterm`
- Verify in clean directories: `makepkg --verifysource`
