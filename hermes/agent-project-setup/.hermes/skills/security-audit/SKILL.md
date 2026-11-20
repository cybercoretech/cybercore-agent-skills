---
name: security-audit
description: Run a structured, defensive security audit of code you are authorized to review and produce a findings report. Scopes the audit, maps the attack surface and trust boundaries, runs read-only scanners for secrets, dependencies and code patterns, reviews by vulnerability class, validates each finding by tracing data from source to sink, rates severity and confidence, and recommends fixes with regression tests. Use for security reviews of a pull request, component or whole repository; vulnerability assessments; pre-release audits; or when asked to "audit", "pen-test the code", "find vulnerabilities", or "check this for security issues". For secure-by-default practices while building, use security-hardening; for handling secrets, security-guidelines.
metadata:
  version: "1"
---

# Security Audit

You find real, exploitable weaknesses in code the user owns or is authorized to review, prove them with evidence, and report them so they can be fixed. A good audit is precise: a few confirmed, well-explained findings beat a long list of generic advice.

## Scope

- Agreeing scope, depth and rules of engagement
- Mapping entry points, trust boundaries and valuable assets
- Running read-only scanners and triaging their output
- Manual review by vulnerability class
- Validating findings, rating severity and confidence
- Writing the report and re-checking fixes

Building secure features from the start is `security-hardening`; secrets and credential handling is `security-guidelines`; dependency hygiene is `dependency-and-supply-chain`.

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**

- Testing, scanning or probing any system, network or service the user does not own or has not explicitly authorized in writing. Code review of the user's own repository is in scope; attacking live third-party systems is not.
- Running exploits, fuzzers, load or denial-of-service tests against live, shared or production environments. Prove issues locally, in tests or disposable environments only.
- Printing, copying or storing secret values you find. Report the file, line and kind of secret, never the value; recommend rotation.
- Publishing vulnerability details in public places (public issues, pull request descriptions, commit messages) before a fix. Use the project's private channel (security advisory, `SECURITY.md` contact) and ask the user how they want to disclose.
- Changing authentication, authorization, cryptography or security controls as a "fix" without the user's approval of the change

## Choose the depth

| Depth | Covers | Typical trigger |
|---|---|---|
| **Quick review** | A diff or pull request: new entry points, changed checks, new dependencies, secrets | "Review this PR for security" |
| **Focused audit** | One component or boundary end to end (auth, file upload, an API, a parser) | "Is our upload handling safe?" |
| **Full audit** | The whole repository: surface map, all classes, scanners, report | "Audit this codebase", pre-release review |

Say which depth you are doing and what that leaves out.

## Workflow

### 1. Scope and rules of engagement

Write down what is in scope (repository, paths, commit), what is out, the depth, what environment you may run things in (local only by default), and how findings should be reported. Do not start probing until this is agreed for anything beyond reading code.

### 2. Map the attack surface

Find where untrusted data enters and where it can do damage (use `codebase-intelligence` for large repositories):

- **Entry points:** HTTP routes, webhooks, CLI arguments, file and archive parsers, IPC and sockets, message queues, environment and config, browser input, LLM tool inputs
- **Trust boundaries:** user to server, service to service, tenant to tenant, sandbox to host, CI to production
- **Assets:** credentials and keys, personal data, money, admin capabilities, other users' data
- **Privileged operations:** command execution, file writes, database writes, outbound requests, permission changes

### 3. Model the threats briefly

For each boundary, ask who could abuse it and how: spoofing identity, tampering with data, repudiating actions, disclosing information, denying service, escalating privilege. Keep the threats that matter for this system; this directs the manual review.

### 4. Run read-only scanners

Use what is available and installed; do not install global tools without approval. Typical classes: secret scanning over history, dependency vulnerability audit, static analysis rules, infrastructure-as-code and container checks. `references/tools.md` lists commands per ecosystem. Treat scanner output as leads, not findings: triage each one.

### 5. Review by vulnerability class

Work through the classes relevant to the surface map. `references/review-checklist.md` has what to look for per class and the dangerous sinks per language:

- authentication and session handling
- authorization and object-level access (IDOR), multi-tenant isolation
- injection: SQL, shell commands, path traversal, template, LDAP, header
- server-side request forgery and unsafe outbound requests
- unsafe deserialization and parsers (XML entities, archives, YAML)
- cross-site scripting, CSRF, CORS, cookie and security header settings
- cryptography and randomness misuse
- secrets in code, logs, errors or client bundles
- file uploads and downloads
- race conditions and time-of-check to time-of-use
- resource exhaustion and missing limits
- error handling that leaks internals
- CI/CD and supply chain (untrusted workflow triggers, unpinned actions, install scripts)
- LLM features: prompt injection, over-broad tool permissions, model output used unsafely

### 6. Validate every finding

- **Trace the data flow** from an attacker-controlled source to the dangerous sink, through every check in between.
- **Confirm reachability:** is the code path exposed, and to whom (anonymous, any user, admin)?
- **Prove it safely** where practical: a failing local test or a minimal reproduction in a disposable environment, never against live systems.
- **Rate confidence:** `confirmed` (proven), `likely` (clear path, not run), `possible` (needs more context). Do not report pattern matches with no path as confirmed.

### 7. Rate severity

Rate by realistic impact and likelihood, not by how scary the class sounds. `references/report-template.md` has the rubric (critical, high, medium, low, informational) with examples, and how to cite a CWE.

### 8. Report

Use `references/report-template.md`. Lead with a short summary a non-specialist can act on, then the findings table, then each finding with location, evidence (secrets redacted), impact, safe reproduction steps and a concrete fix. Separate **findings** (exploitable weaknesses) from **hardening suggestions** (defence in depth), and include what you did not cover. Do not pad the report with generic advice.

### 9. Fix and re-check (when asked)

- Agree which findings to fix; changes to security controls need approval.
- Write a regression test that fails on the vulnerability first (`test-first-development`), then fix the cause.
- Re-run the scanners and the relevant review, and update each finding's status: `fixed`, `mitigated`, `accepted risk` (with the owner's name), or `open`.
- Recommend rotating any exposed secret even after removing it from the code; history keeps it.

## Common failure modes

| Failure | Better |
|---|---|
| Pasting raw scanner output as the report | Triage, deduplicate, validate, then report |
| Reporting a pattern without a reachable path | Trace source to sink, or mark it `possible` |
| Rating everything critical | Rate realistic impact and likelihood |
| Printing a found API key to "show" it | Name the file, line and kind; recommend rotation |
| Testing against production "just to confirm" | Reproduce locally or in a disposable environment |
| Filing the vulnerability in a public issue | Private advisory or the project's security contact |
| Fixing auth logic unasked | Propose the fix; change it after approval |
| Long lists of best practices with no findings | Short confirmed findings, then a separate hardening section |

## Verification

- [ ] Scope, depth and rules of engagement were stated before probing
- [ ] Entry points, trust boundaries and assets were mapped for the scope
- [ ] Scanner output was triaged; nothing reported unvalidated as confirmed
- [ ] Each finding has location, data-flow evidence, confidence, severity, impact and a concrete fix
- [ ] No secret values appear in the report, logs or commits
- [ ] Nothing was run against systems outside the authorized scope or against production
- [ ] Findings and hardening suggestions are separated, and the report lists what was not covered
- [ ] Fixed findings have regression tests and were re-checked
