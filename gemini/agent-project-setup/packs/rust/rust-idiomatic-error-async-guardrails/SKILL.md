---
name: rust-idiomatic-error-async-guardrails
description: Enforces thiserror/anyhow patterns, prohibits .unwrap() in production paths, and checks tokio cancellation safety for Rust async code. Ensures robust error handling and safe cancellation in production Rust projects. Use when writing or reviewing Rust error handling or async code headed for production. Not for async architecture and Tokio runtime design (use rust-async-tokio).
license: Apache-2.0
metadata:
  domain: software-development
  subdomain: rust-development
  tags: rust, error-handling, thiserror, anyhow, tokio, async, guardrails, idiomatic
  version: '1'
  nist_csf: PR.IP-01, PR.IP-02, PR.DS-02
  mitre_attack: T1059.007, T1059.005
---
# Rust Idiomatic Error & Async Guardrails

## When to Use
- As a code review gate for Rust projects using async/await
- Before merging Rust pull requests that introduce error handling changes
- When onboarding new Rust developers to an existing codebase
- To enforce organizational error handling and async patterns
- For audit and compliance reporting on Rust async code quality

## Prerequisites
- Rust toolchain installed (rustup 1.75+ recommended)
- A Rust project using async/await
- thiserror and anyhow crates as project dependencies
- Network access for cargo operations

## Required Tools
| Tool | Purpose |
|------|---------|
| `cargo` | Rust package manager |
| `cargo-deny` | (Optional) supplementary security checking |
| Custom lint scripts | thiserror/anyhow pattern enforcement |
| tokio-scrutiny | Cancellation safety checks (custom) |

## Workflow

### Step 1: thiserror/anyhow Pattern Compliance
Ensure all errors use idiomatic Rust error types rather than bare strings or custom enum variants.

**Check thiserror usage:**
```bash
# Verify all public error types derive thiserror::Error
grep -r "enum.*Error" --include="*.rs" | grep -v "thiserror"

# Check that custom errors use thiserror
grep -rn "pub.*struct.*Error" --include="*.rs" | head -20

# Verify error impl blocks
grep -rn "impl.*Error" --include="*.rs" | head -20
```

**Check anyhow usage:**
```bash
# Verify errors use anyhow::Error where appropriate
grep -rn "anyhow::" --include="*.rs" | head -20

# Check bail! and Context usage
grep -rn "bail!" --include="*.rs" | head -20
grep -rn "Context::new" --include="*.rs" | head -20
```

**Required: no bare String errors in public APIs**
```bash
# Flag String-based errors in public functions
grep -rn "-> String" --include="*.rs" | grep -v "test" | head -20
```

### Step 2: Prohibit .unwrap() in Production Paths
Enforce that .unwrap(), .expect(), and .unwrap_or() are not used in production code paths that could be reached in deployment.

**Detection:**
```bash
# Find .unwrap() calls in non-test code
grep -rn "\.unwrap()\b" --include="*.rs" | grep -v "#\[test\]" | grep -v "#\[should_panic\]" | grep -v "\.unwrap_or\(" | grep -v "\.unwrap_or_else\(" > unwrap-candidates.txt

# Find .unwrap_or() with non-default
grep -rn "\.unwrap_or(" --include="*.rs" | grep -v "#\[test\]" > unwrap_or_candidates.txt

# Find .expect() calls
grep -rn "\.expect(" --include="*.rs" | grep -v "#\[test\]" > expect-candidates.txt
```

**Allowed patterns (with documentation):**
```rust
// These are allowed with // UNSAFE: comment explaining why
result.unwrap();  // UNSAFE: invariant maintained by caller
result.expect("descriptive message");  // UNSAFE: documented invariant

// With documentation comment
/// # Panics
/// This panics if ... (explain why it's safe)
result.unwrap();
```

**Fix strategies:**
- Use `ok_or_else()` or `ok_or()` to return proper error types
- Use `unwrap_or_else()` with a fallback computation
- Use `match` expressions for exhaustive handling
- Use `if let` / `if let Some()` for optional values

### Step 3: tokio Cancellation Safety
Ensure async tasks handle cancellation gracefully without data leaks or deadlocks.

**Check cancellation safety patterns:**

```bash
# Find tasks that don't handle cancellation
grep -rn "tokio::spawn" --include="*.rs" | head -20

# Check for unclosed streams/channels
grep -rn "tokio::sync::mpsc" --include="*.rs" | head -20

# Find tasks without proper cleanup
grep -rn "cancel" --include="*.rs" | head -20

# Verify AbortHandle usage where needed
grep -rn "AbortHandle" --include="*.rs" | head -20
```

**Required cancellation safety checks:**

| Pattern | Required | Anti-Pattern |
|---------|----------|--------------|
| Tasks must be joinable | ✅ | Fire-and-forget without `.await` or `.join()` |
| Shared state must be protected | ✅ | Mutex/RwLock without drop guards |
| Streams/channels must be drained/cloned on drop | ✅ | Unclosed receivers senders |
| Timeout guards for long operations | ⚠️ | Infinite waits without cancellation |
| AbortHandle for task groups | ⚠️ | No way to cancel related tasks |

**Cancellation check script:**
```rust
// Example: Proper cancellation handling
async fn example() {
    let (tx, mut rx) = tokio::sync::mpsc::channel::<i32>(32);

    // Properly handle cancellation
    let mut cx = CancellationToken::new();

    tokio::spawn(async move {
        while let Some(item) = rx.recv().await {
            // Process item
            process(item).await;
        }
    });

    // Handle cancellation
    cx.cancelled().await;
    rx.close().await;
}
```

### Step 4: Generate Guardrails Report
Compile findings into a compliance report.

```bash
# Run all checks and capture output
cargo check --all-targets > check-output.txt 2>&1 || true

# Generate guardrails report
mkdir -p guardrails-report

cat > guardrails-report/rust-idiomatic-error-async-report.md << 'REPORT'
# Rust Idiomatic Error & Async Guardrails Report

**Project:** `$(basename $PWD)`
**Date:** `date -Iseconds`

## thiserror/anyhow Pattern Compliance

### thiserror Usage
<details>
<summary>thiserror patterns found</summary>
```
<list thiserror usage findings>
```
</details>

### anyhow Usage
<details>
<summary>anyhow patterns found</summary>
```
<list anyhow usage findings>
```
</details>

## .unwrap() Prohibition Status

### Unsafe .unwrap() Calls (requires review)
| File | Line | Context | Risk Level |
|------|------|---------|------------|
<populate from unwrap-candidates.txt>

### Allowed .unwrap() with Documentation
| File | Line | justification |
|------|------|---------------|
| <populate allowed findings> |

## tokio Cancellation Safety

### Safe Cancellation Patterns Found
<details><summary>Safe patterns</summary>
```
<list safe cancellation patterns>
```
</details>

### Unsafe Cancellation Patterns (requires fix)
<details><summary>Unsafe patterns</summary>
```
<list unsafe cancellation patterns>
```
</details>

## Pass/Fail Criteria

| Check | Status | Threshold |
|-------|--------|-----------|
| thiserror/anyhow patterns | PASS / FAIL | All public errors use idiomatic types |
| .unwrap() in production | PASS / FAIL | Zero unprotected .unwrap() calls |
| tokio cancellation safety | PASS / FAIL | All tasks handle cancellation gracefully |

## Action Required
<fill-in based on results>

## Typical Fixes

### Converting .unwrap() to idiomatic handling
```rust
// Before (unsafe)
let value = result.unwrap();

// After (safe)
let value = result.unwrap_or_else(|e| {
    // fallback or retry logic
    handle_error(e)
});

// Or with proper error propagation
let value = result?;  // in function returning Result<_, MyError>
```

### Adding thiserror to custom error types
```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum MyError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Config error: {0}")]
    Config(String),
    #[error("Not found: {0}")]
    NotFound(String),
}
```

### Ensuring tokio task cancellation safety
```rust
// Before (unsafe - task may leak on cancel)
tokio::spawn(async {
    loop {
        do_work().await?;
    }
});

// After (safe - task handles cancel)
tokio::spawn(async {
    loop {
        match tokio::timeout(Duration::from_secs(30), do_work()).await {
            Ok(result) => result,
            Err(_) => {
                // timeout or cancellation, clean up and exit
                break;
            }
        }
    }
});
```
REPORT
```

## Integration with CI/CD

### GitHub Actions example
```yaml
name: Rust Error & Async Guardrails

on:
  pull_request:
    branches: [ main ]

jobs:
  guardrails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: actions-rust-lang/setup-rust-toolchain@v1
        with:
          toolchain: 1.98.1

      - name: Run error pattern checks
        run: |
          # Check thiserror/anyhow compliance
          cargo check --all-targets

          # Check for unsafe .unwrap() calls
          grep -rn "\.unwrap()\b" --include="*.rs" | grep -v "#\[test\]" > unwrap-report.txt || true

          # Check tokio cancellation patterns
          grep -rn "tokio::spawn" --include="*.rs" > spawn-report.txt || true

      - name: Enforce guardrails
        fail-fast: false
        # Additional guardrails enforcement can go here
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `Unsupported .unwrap() in production code` | .unwrap() found in non-test code | Replace with `unwrap_or_else()`, `ok_or()`, or proper error propagation |
| `thiserror not used for custom errors` | Custom error types without thiserror derive | Add `#[derive(thiserror::Error)]` to error enums |
| `tokio task may leak on cancellation` | Spawned task without cancel handling | Add cancellation tokens, timeouts, or AbortHandle |
| `anyhow::Context missing` | Context wrapping not used | Add `.context()` calls around fallback operations |
| `mpsc channel not drained on drop` | Channel created without cleanup | Use `rx.close().await` or `drop(rx)` in task cleanup |