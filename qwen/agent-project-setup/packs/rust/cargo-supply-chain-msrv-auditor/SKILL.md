---
name: cargo-supply-chain-msrv-auditor
description: Runs cargo clippy, cargo deny, and cargo audit against a target Minimum Supported Rust Version (MSRV) before marking tasks complete. Validates supply-chain security and MSRV compliance for Rust projects. Use when finishing Rust work that must pass clippy, cargo-deny and cargo-audit at the project's MSRV, or when adding or upgrading dependencies. Not for general Rust conventions (use rust-development) or release builds (use rust-release-and-cross-compile).
license: Apache-2.0
metadata:
  domain: software-development
  subdomain: rust-development
  tags: rust, cargo, supply-chain, msrv, compliance, clippy, deny, audit
  version: '1'
  nist_csf: PR.IP-01, PR.DS-05, DE.CM-02
  mitre_attack: T1059.007
---
# Cargo Supply-Chain & MSRV Auditor

## When to Use
- Before merging Rust pull requests to ensure supply-chain security and MSRV compliance
- As a gate check in CI/CD pipelines for Rust projects
- When onboarding new Rust dependencies or updating existing ones
- To enforce organizational MSRV policies across a codebase
- For audit and compliance reporting on Rust project dependencies

## Prerequisites
- Rust toolchain installed (rustup 1.75+ recommended)
- cargo, cargo-clippy, cargo-deny, and cargo-audit available in PATH
- A Rust project with Cargo.toml
- Target MSRV version (e.g., 1.75.0, 1.64.0, etc.)
- Network access to crates.io and GitHub for vulnerability lookups

## Required Tools
| Tool | Purpose |
|------|---------|
| `cargo` | Rust package manager |
| `cargo-clippy` | Linting tool for Rust |
| `cargo-deny` | Supply-chain security analyzer |
| `cargo-audit` | Vulnerability database checker |
| `rustup` | Rust version manager |

## Workflow

### Step 1: Set Target MSRV
Define the minimum supported Rust version for the project. This should match the oldest rustc version the project officially supports.

```bash
# Set MSRV in Cargo.toml (if using rust-version field)
# Or export as environment variable
export TARGET_MSRV=1.75.0

# Or create a .msrv file in the project root
echo "1.75.0" > .msrv
```

### Step 2: Run cargo clippy
Execute clippy to catch common mistakes, performance issues, and style problems.

```bash
cargo clippy --all-targets --all-features -- -D warnings
```

**Exit codes:**
- `0` = No warnings (or only allowed warnings)
- `1` = Warnings found (fails if `-D warnings` is set)

### Step 3: Run cargo deny (supply-chain security)
Check for vulnerable, yanked, or otherwise problematic dependencies.

```bash
# Install if not present: cargo install cargo-deny

# Basic check: review all dependencies for known issues
cargo deny check

# Focus on security advisories
cargo deny check --security

# Check licensing compliance
cargo deny license check

# Check for yanked versions
cargo deny versions check
```

**Key deny configurations** (via `deny.toml`):
```toml
# deny.toml
[advisories]
enable = true

[metadata]
sources = ["github-advisory-db", "rustsec"]

[security]
minimum_supported_rust = "1.75.0"

[licensing]
check = true
```

### Step 4: Run cargo audit (vulnerability check)
Check installed dependencies against the RustSec advisory database.

```bash
cargo audit
```

**Output format:**
```
Package    Version   Advisory   Title
--------   -------   --------   -----------------------------------------------------------
serde      1.0.195   RUSTSEC-2024-0185   Integer overflow in serde_json::Value::as_bool
```

**Exit codes:**
- `0` = No vulnerabilities found
- `1` = Vulnerabilities found

### Step 5: MSRV Compatibility Check
Verify that all dependencies are compatible with the target MSRV.

```bash
# Check that the project compiles with the MSRV rustc
rustup default $TARGET_MSRV
rustc --version

# Build with the target MSRV
cargo check --msrv

# Or use rustup to build with older toolchain
rustup toolchain install $TARGET_MSRV
rustup default $TARGET_MSRV
cargo check
```

### Step 6: Generate Compliance Report
Compile results into a compliance report.

```bash
# Create report directory
mkdir -p compliance-report

# Run all checks and capture output
cargo clippy --all-targets --all-features -- -D warnings > clippy-output.txt 2>&1 || true
cargo deny check > deny-output.txt 2>&1 || true
cargo audit > audit-output.txt 2>&1 || true

# Generate summary
cat > compliance-report/msrv-audit-report.md << 'REPORT'
# Cargo Supply-Chain & MSRV Compliance Report

**Project:** `$(basename $PWD)`
**Target MSRV:** `$TARGET_MSRV`
**Date:** `date -Iseconds`

## clippy
```
<clippy-output.txt content>
```

## cargo-deny
```
<deny-output.txt content>
```

## cargo-audit
```
<audit-output.txt content>
```

## MSRV Compatibility
- rustc version: `rustc --version`
- Target MSRV: `$TARGET_MSRV`
- Project compiles with target MSRV: `true/false`

## Pass/Fail Criteria
- **clippy**: `FAIL` if warnings treated as errors and found
- **cargo-deny**: `FAIL` if security advisories or licensing issues detected
- **cargo-audit**: `FAIL` if known vulnerabilities exist
- **MSRV**: `FAIL` if project does not compile with target MSRV

## Action Required
<fill-in based on results>
REPORT
```

## Pass/Fail Summary

| Check | Status | Threshold |
|-------|--------|-----------|
| cargo clippy | PASS / FAIL | Zero warnings with `-D warnings` |
| cargo deny (security) | PASS / FAIL | No security advisories |
| cargo deny (licensing) | PASS / FAIL | All licenses approved |
| cargo audit | PASS / FAIL | Zero known vulnerabilities |
| MSRV compatibility | PASS / FAIL | Project compiles with `$TARGET_MSRV` |

## Typical Fixes

### clippy warnings
- Review and fix individual warnings: `cargo clippy -D <warning-type>`
- Suppress with `#[allow(...)]` attributes in code (document why)
- Update Rust version or dependency if warning is version-specific

### cargo-deny security advisories
- Update vulnerable dependencies: `cargo update -p <package>`
- Pin to safe version ranges in Cargo.toml
- For unavoidable issues, add exceptions with justification in `deny.toml`

### cargo-audit vulnerabilities
- Upgrade affected crates to patched versions
- Consider alternative dependencies with no advisories
- Note risk acceptance if vulnerability is low-impact and mitigated

### MSRV incompatibility
- Update dependencies to versions compatible with older Rust
- Use feature flags to conditionally compile newer API usage
- Consider dropping support for very old MSRV if dependencies no longer support it

## Integration with CI/CD

### GitHub Actions example
```yaml
name: Rust Compliance Check

on:
  pull_request:
    branches: [ main ]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: actions-rust-lang/setup-rust-toolchain@v1
        with:
          toolchain: 1.98.1

      - name: Install cargo-deny
        run: cargo install cargo-deny

      - name: Run clippy
        run: cargo clippy --all-targets --all-features -- -D warnings

      - name: Run cargo deny
        run: cargo deny check

      - name: Run cargo audit
        run: cargo audit
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `cargo-deny: command not found` | cargo-deny not installed | `cargo install cargo-deny` |
| ` advisory database not found` | rustSec database missing | Run `cargo audit update` first |
| ` MSRV too old for dependency` | Dependency requires newer Rust | Update dependency or raise MSRV |
| `clippy: too many warnings` | Project has existing lint issues | Fix iterally or suppress with justification |
| ` network timeout` | Cannot reach crates.io/GitHub | Check network or use offline cache |