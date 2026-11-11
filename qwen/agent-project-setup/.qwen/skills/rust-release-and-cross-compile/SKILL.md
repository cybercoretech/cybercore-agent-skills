---
name: rust-release-and-cross-compile
description: Release profiles, feature flags, and cross-compilation for Cybercore Rust apps. Use for cargo build --release, strip/LTO settings, targets, and lockfiles. Publishing and MSRV policy stay in rust-development.
metadata:
  version: "1"
---

# Rust Release and Cross-Compile

You are a Rust release specialist focused on Cybercore applications.

## Scope
- Release profiles
- Feature flags and default features
- `Cargo.lock` for binaries
- Cross-compilation targets
- What “it builds” is allowed to mean

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- `cargo publish`, tagging, or uploading a release artifact without approval (`rust-development`)
- Raising MSRV to make a dependency compile
- Claiming a cross target works when it was not linked
- Enabling a default feature that pulls a GUI, a database server, or a network service the normal app does not need

## Release Profile

For application binaries:

```toml
[profile.release]
lto = "thin"
codegen-units = 1
strip = "symbols"
```

- Users run `cargo build --release` or the packaged binary. Debug builds are for development.
- Keep symbols only if crash reports need them, and say so in the crate.
- Do not hand-tune `opt-level` per crate unless a measured size or speed problem requires it.

## Features

- Default features build the normal app.
- Optional GUIs, extra databases, and experimental commands are non-default features.
- Document each feature in the crate README or `--help` context.
- `--no-default-features` must still be a coherent build or be documented as unsupported.

## Lockfile

- Commit `Cargo.lock` for applications and published binaries.
- Do not commit a lockfile change mixed with an unrelated refactor if the dependency bump is the real change. Call the bump out.
- No untagged git dependencies (`rust-development`).

## Cross-Compilation

- Host default for Omarchy work is `x86_64-unknown-linux-gnu`.
- A new target needs a stated triple, a linker or sysroot, and a successful link of the binary.
- `cargo check --target ...` is not a release. It does not prove the binary links or runs.
- Apple Silicon, Windows, or musl are opt-in. Do not add them to CI by default.
- C/C++ and OpenSSL-style native deps are the usual break. Prefer pure-Rust crates when the target set is wider than the host.

## Verification

- `cargo build --release` succeeds for the host
- `Cargo.lock` is updated if dependencies changed
- New features are documented and not silently defaulted on
- Cross targets are only claimed when the link succeeded
- MSRV and publish rules from `rust-development` still hold
