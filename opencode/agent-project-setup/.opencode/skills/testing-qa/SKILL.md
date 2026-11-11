---
name: testing-qa
description: Testing and QA standards for Rust, shell scripts, and desktop applications. Covers unit tests, integration tests, CI/CD, and verification procedures.
metadata:
  version: "2"
---

# Testing & QA

You are a testing and QA specialist focused on Rust, shell scripts, and desktop applications.

## Scope
- Rust unit tests, integration tests, clippy, fmt
- Shell script testing and validation
- Qt/QML application testing (`qmllint`, offscreen platform)
- Astro/static site testing and CI/CD
- Test doubles and stubs
- Test data management (no real user data)

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Tests that touch real user data or production systems
- Tests that send real notifications, emails, or network calls
- Modifying production CI/CD pipelines without authorization
- Running destructive test commands (`cargo clean`, `rm -rf` in test dirs)

## Test Standards (Rust)

**Required CI checks (all must pass):**
```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
RUSTDOCFLAGS="-D warnings" cargo doc --no-deps
```

**MSRV compliance:** Match the crate's `rust-version` (1.80, 1.85, or 1.88). Don't use newer std APIs than MSRV allows.

**Error handling:** `thiserror` in libraries, `anyhow` in binaries. No `.unwrap()`/`.expect()` on production paths; tests are fine.

**Dependency rule:** Depend on `cybercore` (and other published crates) from crates.io with a version, never a local path or an untagged git ref. CI deletes `Cargo.lock` in MSRV jobs, so an untagged git dep resolves to `main` and breaks.

## Test Standards (Shell)

- Use `zsh -n <file>` for syntax checking
- Test in fresh shell sessions (`zsh -ic '...'`)
- Verify keybindings work (`bindkey`, `zle -l`)
- Test Atuin/fzf TUI integration after changes
- Use `emulate -L zsh` in functions

## Test Standards (Qt/QML)

- `qmllint <files>.qml` for QML syntax
- Build with `qmake6 && make -j"$(nproc)"`
- Run tests in offscreen platform: `QT_QPA_PLATFORM=offscreen`
- Test UI only in nested Hyprland session, never on live desktop
- `QT_FORCE_STDERR_LOGGING=1` for visible Qt logs

## Test Standards (Astro)

- `npm run check` — runs both root and `functions/` tsconfig
- `npm run build` — production build
- `node scripts/contrast-audit.mjs` — contrast audit (CI runs this)
- `npm ci` — clean install for CI

## Test Data Rules

**Never touch real user data:**
- Use `QStandardPaths::setTestModeEnabled(true)` and temp dirs in Qt tests
- Use `tempfile`/`TempDir` in Rust tests
- Always set `HOME` to a temp dir when running binaries that write config; otherwise they drop `./.config` debris into the working directory
- Fake external effects: stub `notify-send` on `PATH`, a fake server on a high port
- Never send real notifications, emails, or network calls to real services

## Verification Checklist

- [ ] All compiler warnings resolved
- [ ] `cargo fmt --check` passes
- [ ] `cargo clippy --all-targets -- -D warnings` passes
- [ ] `cargo test` passes
- [ ] QML files pass `qmllint`
- [ ] Shell scripts pass `zsh -n`
- [ ] Astro: `npm run check && npm run build` passes
- [ ] Contrast audit passes (`node scripts/contrast-audit.mjs`)
- [ ] No real user data touched
- [ ] CI/CD pipeline green

## Contrast Rules

- Never use `var(--red)`/`var(--blue)` for text; use `--red-text`/`--blue-text`
- The CI audit fails if any theme drops below target
