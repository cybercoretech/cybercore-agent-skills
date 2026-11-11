---
name: rust-observability
description: Tracing and operational logging for Cybercore Rust applications. Use when adding logs, spans, EnvFilter, redaction, or command-level diagnostics. Do not use println for operational output.
version: 1
---

# Rust Observability

You are a Rust observability specialist focused on Cybercore applications.

## Scope
- `tracing` and `tracing-subscriber`
- Levels, spans, and `RUST_LOG`
- Redaction
- What the user sees vs what the log sees

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Logging secrets, tokens, session cookies, or full personal data
- Leaving `println!` / `eprintln!` as the operational log of a long-running app
- A default log level of `trace` or `debug` in release
- Shipping a log sink that uploads data off-box without explicit approval

## Setup

- Initialize one subscriber in `main`, before work starts.
- Default filter is `info`. `RUST_LOG` overrides it.
- Use `EnvFilter` so crates can be tuned independently (`app=debug,hyper=warn`).
- Libraries emit `tracing` events. They do not install a subscriber.

## What to Log

- Startup: version, config path, data path. Redact values that came from secrets.
- Each command or request: start, outcome, and duration at `info`.
- Failures: `error` with context (`with_context` / span fields), not a bare string.
- Expected user mistakes (bad flag, missing file): user-facing text, log at `warn` or `info`, exit non-zero.
- Panics and invariant bugs: `error`. Do not catch them to hide the bug.

## Spans

- A span wraps one command, request, or job. Fields are ids and names, not payloads.
- Do not put full file contents or SQL parameter values that may contain secrets into span fields.

## User Output

- Success text is short and stable.
- Verbose detail is `-v` or the log, not the default stdout.
- Stdout stays machine-readable when the command is meant to be piped. Logs go to stderr.

## Verification

- Subscriber is installed once
- `RUST_LOG` changes verbosity without a code change
- No secrets in log statements or span fields
- Operational `println!` is gone from the paths you touched
- A failing command still prints an actionable message
