# Read-Only Scanners

Use tools already installed or already declared by the project. Ask before installing anything globally. Run scanners locally against the repository; none of these should touch live systems. Treat every result as a lead to triage.

## Secrets (including Git history)

| Tool | Command |
|---|---|
| gitleaks | `gitleaks git . --redact` (history) or `gitleaks dir . --redact` (working tree); older versions use `gitleaks detect --source . --redact` |
| trufflehog | `trufflehog git file://. --no-verification --no-update`. By default it verifies secrets against live services and prints raw values, so always pass `--no-verification` and keep its output out of reports; prefer gitleaks with `--redact` |

Always use the redaction option so secret values never reach the terminal or the report. Verifying a found secret against its live service counts as touching a third-party system: do not, unless the user asks.

## Dependencies

| Ecosystem | Command |
|---|---|
| Rust | `cargo audit` (and `cargo deny check advisories` if configured) |
| Node | `npm audit --omit=dev` (or the project's package manager equivalent) |
| Python | `pip-audit` |
| Go | `govulncheck ./...` |
| Any (lockfiles) | `osv-scanner scan source -r .` |

Check whether a vulnerable function is actually reachable before rating it high.

## Static analysis

| Tool | Command |
|---|---|
| Semgrep | `semgrep scan --config auto --error` (or a pinned ruleset such as `p/owasp-top-ten`) |
| Bandit (Python) | `bandit -r src/` |
| gosec (Go) | `gosec ./...` |
| Clippy (Rust) | `cargo clippy --all-targets -- -D warnings` (correctness and suspicious lints help) |
| ESLint security plugins | the project's lint command, if configured |

## Infrastructure and containers

| Tool | Command |
|---|---|
| Trivy | `trivy fs --scanners vuln,secret,misconfig .` |
| Checkov | `checkov -d .` |
| hadolint | `hadolint Dockerfile` |
| actionlint | `actionlint` (GitHub Actions workflows) |

## Triage

For each result, record one of:

- **True positive:** reachable and exploitable; becomes a finding after validation
- **True but not exploitable here:** note as hardening if worthwhile
- **False positive:** note why, briefly, so the next audit does not repeat the work

Deduplicate: one root cause reported once, with all locations listed.
