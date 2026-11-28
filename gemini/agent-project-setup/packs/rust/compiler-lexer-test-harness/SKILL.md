---
name: compiler-lexer-test-harness
description: Automates differential testing, fuzzing (cargo-fuzz), and snapshot testing (insta) for parsers and custom languages. Ensures language implementation correctness across parser revisions, fuzz targets, and version compatibility. Use when building or changing a lexer, parser or language implementation that needs fuzz, differential or snapshot tests. Not for general Rust test strategy (use rust-testing).
license: Apache-2.0
metadata:
  domain: software-development
  subdomain: testing
  tags: rust, testing, fuzzing, differential-testing, snapshot-testing, insta, cargo-fuzz, parser, lexer, language-implementation
  version: '1'
  nist_csf: PR.4.1, PR.4.2, ME.1.1
  mitre_attack: T1059.007
---
# Compiler & Lexer Test Harness

## When to Use
- Developing or maintaining a custom language parser or compiler
- Ensuring lexer/parser correctness across grammar changes
- Detecting edge cases and corner cases in language implementation
- Setting up continuous fuzzing for language infrastructure
- Verifying snapshot stability across parser version upgrades
- Running differential testing between multiple parser implementations

## Prerequisites
- Rust toolchain installed (rustup 1.75+ recommended)
- A parser or compiler project with `lib` or `bin` target
- Grammar definition (PEG, LR, LALR, etc.) or custom language syntax
- Test fixtures (valid and invalid language programs)
- Network access for cargo operations

## Required Tools
| Tool | Purpose |
|------|---------|
| `cargo` | Rust package manager |
| `cargo-fuzz` | Fuzzing framework (cargo install cargo-fuzz) |
| `insta` | Snapshot testing tool (cargo install insta) |
| `criterion` | (Optional) Benchmarking for test performance |
| `clippy` | (Optional) Linting during test development |

## Workflow

### Step 1: Differential Testing Across Parser Versions
Run the same test inputs against multiple parser implementations or versions to detect divergences in behavior.

**Setup differential test matrix:**

```bash
# Define test inputs (valid and invalid programs)
mkdir -p tests/fixtures
# Example: create test files in various languages/grammars

# Run parser A
cargo run -- parser-a --input tests/fixtures/test1.l > /tmp/parser_a_output.txt

# Run parser B  
cargo run -- parser-b --input tests/fixtures/test1.l > /tmp/parser_b_output.txt

# Compare outputs (allowing for whitespace differences)
diff -w /tmp/parser_a_output.txt /tmp/parser_b_output.txt || echo "DIFFERENCE DETECTED"

# Or use insta snapshot comparison
insta review --accept
```

**Differential test framework:**

```rust
// tests/differential_tests.rs
use insta::assert_snapshot;

fn run_parser(input: &str, parser_version: &str) -> String {
    // Invoke the parser with the given version
    // This is a placeholder - actual implementation depends on parser
    format!("parsed_{}_{}", input, parser_version)
}

/// Test that all parser versions produce consistent output
#[test]
fn differential_test_across_versions() {
    let test_cases = [
        "1 + 2",
        "foo * bar",
        "(a + b) * c",
        "invalid_syntax!",
    ];
    
    for input in &test_cases {
        let expected = run_parser(input, "latest");
        // Run against other versions and assert consistency
        for version in &["v1.0", "v1.1", "v2.0"] {
            let actual = run_parser(input, version);
            insta::with_settings! { 
                let mut snapshot = insta::Snapshot::new();
                insta::assert_eq!(actual, expected);
            };
        }
    }
}
```

### Step 2: Fuzzing with cargo-fuzz
Discover edge cases, crashes, and unexpected behavior in parsers through coverage-guided fuzzing.

**Setup fuzz target:**

```bash
# Install cargo-fuzz
cargo install cargo-fuzz

# Add fuzz target to your project
cargo fuzz init

# Create fuzz target
# fuzz/targets/parser_fuzz.rs
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    // Feed raw bytes to the parser
    let input = String::from_utf8_lossy(data);
    // Parse - if panic occurs, fuzzer found crash
    parse_language(&input);
});
```

**Run the fuzzer:**

```bash
# Run fuzzer with timeout
cargo fuzz run parser_fuzz -timeout=30

# Run with specific seed for reproducibility
cargo fuzz run parser_fuzz -seed=12345

# Record coverage for future runs
cargo fuzz run parser_fuzz -artifact_prefix=fuzz_cov/
```

**Fuzz test best practices:**

| Practice | Recommendation |
|----------|---------------|
| Input size | Start small (1-10 bytes), let fuzzer grow |
| Coverage | Enable: `RUSTFLAGS="-Z coverage"` |
| Time budget | 24-48 hours for thorough coverage |
| Crash analysis | Examine `fuzz/crashes/` directory |
| Seed preservation | Save working seeds for regression testing |

**Common parser fuzz findings:**
- Stack overflow on deeply nested structures
- Integer overflow in line/column tracking
- Out-of-bounds array access on token indices
- Regular expression denial of service (ReDoS)
- Unicode handling edge cases (surrogate pairs, BOM)

### Step 3: Snapshot Testing with insta
Capture expected parser output and detect regressions when parser behavior changes.

**Initialize insta snapshots:**

```bash
# Install insta
cargo install insta

# Add to Cargo.toml
# [dev-dependencies]
# insta = { version = "1.0", features = ["derive"] }

# Run tests to generate snapshots
cargo test --snapshot update

# Or explicitly:
INSTA_UPDATE=always cargo test
```

**Snapshot test example:**

```rust
// src/parser.rs or tests/parser_tests.rs
use insta::assert_snapshot;

#[derive(Debug, PartialEq)]
pub enum Token {
    Number(f64),
    Plus,
    Minus,
    Star,
    Slash,
    LParen,
    RParen,
    Ident(String),
    EOF,
}

// Generate snapshot with: cargo test -- --test-name snapshot_test
#[test]
fn tokenize_simple_expression() {
    let input = "1 + 2";
    let tokens = tokenize(input);
    assert_snapshot!(tokens);
}
```

**Snapshot file structure:**
```
tests/
  parser_tests.rs
  snapshots/
    parser_tests.rs.snap  ← generated by insta
```

**Snapshot content example:**
```rust
// Auto-generated by insta - do not edit manually
inst_assertions! {
    #[repr(C)]
    #[derive(Debug, PartialEq)]
    pub enum Token {
        Number(1.0),
        Plus,
        Number(2.0),
        EOF,
    }
}
```

**Update snapshots after intentional changes:**
```bash
# Review changes before accepting
INSTA_UPDATE=no cargo test

# Or interactively accept specific snapshots
insta review
# Then: insta review --accept
```

### Step 4: Generate Test Harness Report
Compile all test results into a comprehensive harness report.

```bash
mkdir -p test-reports

cat > test-reports/compiler-lexer-test-harness-report.md << 'REPORT'
# Compiler & Lexer Test Harness Report

**Project:** `$(basename $PWD)`
**Date:** `date -Iseconds`
**Rust Version:** `rustc --version`

## Differential Testing Results

### Test Matrix
| Parser Version | Test Inputs | Pass/Fail | Notes |
|---------------|------------|-----------|-------|
| latest | 15 test cases | PASS | All inputs consistent |
| v1.0 | 15 test cases | PASS | Baseline compatibility |
| v1.1 | 15 test cases | 2 FAIL | Line ending differences |
| v2.0 | 15 test cases | 5 FAIL | AST structure change |

### Fuzzing Results

#### Fuzz Run Summary
| Run | Duration | Crashes Found | New Coverage |
|-----|----------|---------------|--------------|
| Initial | 1h | 3 crashes | 45% |
| Extended | 24h | 1 crash | 89% |
| Final | 48h | 0 crashes | 94% |

#### Crash Analysis
| Crash ID | Input | Location | Cause |
|----------|-------|----------|-------|
| crash_001 | `\xff\xfe\xfd` | token_at_pos() | Integer overflow |
| crash_002 | `(`.repeat(10000)` | parse_expr() | Stack overflow |
| crash_003 | `\x00\x01\x02` | lex() | Null byte handling |

### Snapshot Testing Results

#### Snapshot Count
| Test File | Total Snapshots | Updated | Reviewed | Outdated |
|-----------|----------------|---------|----------|----------|
| parser_tests.rs | 12 | 2 | 10 | 0 |

#### Regression Detection
| Snapshot | Change Type | Impact | Action |
|----------|-------------|--------|--------|
| tokens_simple | Minor | Low | Accept |
| expressions_nested | Medium | Medium | Review |

## Pass/Fail Criteria

| Check | Status | Threshold |
|-------|--------|-----------|
| Differential testing | PASS / FAIL | No output divergences across versions |
| Fuzzing | PASS / FAIL | Zero new crashes after 48h |
| Snapshot testing | PASS / FAIL | All snapshots current/expectable |

## Action Required
<fill-in based on results>

## Typical Fixes

### Fixing differential test divergences
```rust
// Before (parser A output differs from parser B)
let output_a = parser_a.run(input);
let output_b = parser_b.run(input);

// After (normalize before comparison)
let normalized_a = normalize_output(&parser_a.run(input));
let normalized_b = normalize_output(&parser_b.run(input));
assert_eq!(normalized_a, normalized_b);
```

### Fixing fuzzer crashes
```rust
// Before (panics on fuzz input)
pub fn parse_language(input: &str) {
    // ... panics on bad input
}

// After (graceful error handling)
pub fn parse_language(input: &str) -> Result<AST, ParseError> {
    // ... returns proper error on bad input
    parse_with_recovery(input)
}
```

### Updating snapshots after intentional changes
```bash
# Review changes
INSTA_UPDATE=no cargo test

# Accept if changes are expected
insta review --accept
# Or update specific:
INSTA_UPDATE=tokens_simple cargo test
```
REPORT
```

## Integration with CI/CD

### GitHub Actions example
```yaml
name: Parser Test Harness

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - parser: "lexer"
            test-type: "differential"
          - parser: "fuzz"
            test-type: "fuzzing"
          - parser: "snapshot"
            test-type: "snapshot"

    steps:
      - uses: actions/checkout@v4
      
      - name: Install Rust
        uses: actions-rust-lang/setup-rust-toolchain@v1
        with:
          toolchain: 1.98.1
      
      - name: Install test tools
        run: |
          cargo install cargo-fuzz
          cargo install insta
      
      - name: Run ${{ matrix.test-type }} tests
        run: |
          case ${{ matrix.test-type }} in
            differential)
              cargo test --test differential_tests
              ;;
            fuzzing)
              cargo fuzz run parser_fuzz -timeout=60
              ;;
            snapshot)
              INSTA_UPDATE=always cargo test
              ;;
          esac
      
      - name: Upload test artifacts
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ matrix.parser }}
          path: |
            target/debug/fuzz/
            tests/snapshots/
            test-reports/
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `insta: no snapshots found` | No snapshot tests run yet | Run `INSTA_UPDATE=always cargo test` first to generate |
| `fuzz: no coverage data` | Coverage instrumentation disabled | Use `RUSTFLAGS="-Z coverage"` or `cargo fuzz run ---coverage` |
| `differential: timeout exceeded` | Fuzzer running too long | Set timeout: `cargo fuzz run parser_fuzz -timeout=30` |
| `snapshot: too many differences` | Legitimate parser changes | Update: `INSTA_UPDATE=always cargo test` or review individually |
| `cargo-fuzz: command not found` | cargo-fuzz not installed | `cargo install cargo-fuzz` (requires Rust nightly) |
| `fuzz: seed loss after restart` | Fuzzer state not persisted | Save seeds: `cargo fuzz store seeds/` and `cargo fuzz restore` |