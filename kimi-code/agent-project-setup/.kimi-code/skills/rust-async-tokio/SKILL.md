---
name: rust-async-tokio
description: Tokio async patterns for Cybercore Rust applications. Use for runtimes, spawn, spawn_blocking, cancellation, graceful shutdown, timeouts, and bounded concurrency. Library error and MSRV rules stay in rust-development.
version: 1
---

# Rust Async (Tokio)

You are a Tokio specialist focused on Cybercore application standards.

## Scope
- One runtime per process
- Tasks, `JoinSet`, and bounded concurrency
- `spawn_blocking` for blocking work
- Cancellation and graceful shutdown
- Timeouts on I/O and locks
- What must not be async

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Nesting a second Tokio runtime inside a worker
- `block_on` on a thread that is already inside the runtime
- Unbounded `spawn` per item on an untrusted or large input
- Holding a std mutex or a database transaction across `.await` without an async-aware lock or API
- Detaching tasks (`let _ = spawn(...)` with no shutdown path) for work that must finish or be cancelled

## Runtime

- Create the runtime once in `main` (`#[tokio::main]` or `Runtime::new`). The library crate does not start a runtime.
- Multi-thread runtime is the default for servers and agents. A current-thread runtime is only for tests or a proven single-thread embedding.
- Do not call `Runtime::new` from inside async code.

## Tasks

- `spawn` is for concurrent I/O, not for “making it faster” by default.
- Cap parallelism with a `Semaphore` or a limited `JoinSet`.
- Propagate task errors. A panicked task is a bug; surface `JoinError`.
- Name tasks when the runtime supports it so logs are readable.

## Blocking

- Filesystem via std, compression, crypto on large buffers, and C FFI that blocks go on `spawn_blocking` or a dedicated thread.
- Do not run `std::thread::sleep` or blocking DNS inside an async worker.
- Keep the blocking pool for short work. Long jobs get their own pool so they cannot stall the runtime.

## Cancellation and Shutdown

- Own a `CancellationToken` (or a watch/broadcast shutdown channel) created in `main`.
- Child tasks select on cancellation alongside their I/O.
- Dropping a future must not leave a half-written file or an open transaction. Finish the write atomically or roll it back.
- On Ctrl-C and SIGTERM: stop accepting work, signal cancellation, wait up to a bounded timeout, flush logs, exit.
- Distinguish clean shutdown (exit 0) from shutdown-after-failure (non-zero).

## Timeouts

- Put timeouts on network calls, lock waits, and external processes.
- A timeout is an error with context, not a silent retry loop.
- Retries need a limit and a backoff. Do not retry non-idempotent writes unless the operation is known safe.

## Verification

- No nested runtime and no `block_on` inside async workers
- Blocking calls are off the async worker
- Concurrency is bounded
- Shutdown is reachable and tested (at least one test or a documented manual check)
- Cancelled work does not corrupt files or the database
- `cargo test` still passes, including `tokio::test` cases
