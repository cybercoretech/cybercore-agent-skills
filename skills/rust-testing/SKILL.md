---
name: rust-testing
description: Testing beyond cargo test for Cybercore Rust apps. Use for unit tests, integration tests, tokio tests, temp dirs, and proptest. Do not weaken tests to make a change pass.
metadata:
  version: "1"
---

# Rust Testing

You are a Rust testing specialist focused on Cybercore applications.

## Scope
- Unit tests for pure logic
- Integration tests in `tests/`
- Async tests
- Temporary directories and databases
- Property tests for parsers and invariants

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Tests that read or write the developer’s real home, SSH keys, or Omarchy config
- Deleting a failing test instead of fixing the behavior, unless the test encoded the bug
- `#[ignore]` on a test to hide a failure without a tracked reason
- Network calls in unit tests

## Layout

- Unit tests sit next to the code (`#[cfg(test)]`) and call library functions directly.
- Integration tests live in `tests/*.rs` and use only the public API or the built binary.
- Fixtures live in `tests/fixtures/` and are small.
- Test helpers are not part of the published API.

## Rules

- Each test checks one behavior. The name says the condition and the expected result.
- No shared mutable state between tests. Temp dirs from `tempfile` or `std::env::temp_dir` with a unique name.
- Time and randomness are injected. Do not sleep to “wait for it” unless the test is explicitly about a timeout.
- `unwrap` is allowed in tests when the failure message is obvious. Prefer `expect("why")` if it is not.

## Async

- Use `#[tokio::test]` for async tests.
- The test must finish. A stuck task is a failure; use a timeout.
- Do not depend on scheduling order. Use channels or explicit barriers.

## Property Tests

- Use `proptest` for parsers, encodings, and round-trips that have an invariant.
- Shrinkers must be able to reduce the failing case. Keep generators narrow.
- Cap the number of cases so `cargo test` stays fast.

## What `cargo test` Must Do

- Pass with no extra services for the default feature set.
- If a test needs a feature or a tool, document the exact command (`cargo test --features ...`).

## Verification

- New behavior has a unit or integration test
- Tests do not touch real user data
- `cargo test` passes
- Ignored tests are called out in the change summary
- Property tests, if added, fail usefully and stay fast
