# Review Checklist by Vulnerability Class

For each class: what to look for, and the dangerous sinks to search for. A sink is only a finding when attacker-controlled data reaches it without adequate validation.

## Authentication and sessions

- Login, password reset, signup and token endpoints: rate limiting, enumeration (different messages for unknown users), reset tokens single-use and expiring
- Password storage uses a slow, salted hash (Argon2, bcrypt, scrypt), never plain SHA or MD5
- Session tokens random, long, rotated on login, invalidated on logout; cookies `HttpOnly`, `Secure`, `SameSite`
- JWT: signature verified, algorithm pinned (no `none`, no algorithm confusion), expiry checked, secret not hard-coded
- Multi-factor and "remember me" flows cannot be skipped by calling a later step directly

## Authorization

- Every handler checks the caller may act on **this specific object** (not only that they are logged in): IDOR
- Tenant or organisation ID comes from the session, never from the request body or URL alone
- Admin-only routes enforced on the server, not only hidden in the UI
- Bulk and export endpoints apply the same checks as single-object ones
- Default deny: new routes are protected unless explicitly public

## Injection

| Kind | Sinks to search |
|---|---|
| SQL | string-built queries, `format!`/f-strings/template literals into `query`, `execute`, `raw` ORM calls |
| Shell | `system`, `exec`, `popen`, `subprocess(..., shell=True)`, `child_process.exec`, `Command::new("sh").arg("-c")` with user data |
| Path traversal | user input joined into file paths (`../`), archive extraction without path checks (zip slip) |
| Template | user input rendered as a template (server-side template injection) |
| Header and log | user input with newlines into headers or log lines |

Safe patterns: parameterised queries, argument arrays without a shell, canonicalising paths and checking they stay under a root.

## Server-side request forgery (SSRF)

- User-supplied URLs fetched by the server (webhooks, previews, imports, image fetchers)
- Check for: access to `localhost`, private ranges, link-local and cloud metadata addresses, redirects to them, DNS rebinding
- Fix: allowlists of hosts, resolve then validate the address and connect to that address, no redirects to private ranges

## Deserialization and parsers

- Native object deserialization of untrusted data (`pickle`, Java serialization, `yaml.load` without a safe loader, `Marshal`)
- XML parsers with external entities enabled (XXE)
- Archives: size and file-count limits, path checks, symlinks
- Image, PDF and document parsers on untrusted input: limits and sandboxing

## Browser-side

- XSS: user data inserted as HTML (`innerHTML`, `dangerouslySetInnerHTML`, `v-html`, unescaped template output, markdown rendered without sanitising)
- CSRF: state-changing requests protected by tokens or `SameSite` cookies
- CORS: no wildcard origin with credentials; no reflecting the request origin blindly
- Security headers: Content-Security-Policy, `X-Content-Type-Options`, frame protections
- Secrets or internal URLs in client bundles

## Cryptography and randomness

- Security tokens from a cryptographic random source, not `Math.random` or time-seeded generators
- No home-made crypto; standard libraries with authenticated encryption (AES-GCM, ChaCha20-Poly1305)
- No ECB mode, static IVs or nonces, or disabled certificate verification
- Constant-time comparison for secrets and signatures

## Secrets

- Keys, tokens and passwords in code, config, tests, fixtures, Dockerfiles, CI files, or Git history
- Secrets written to logs, error messages, crash reports or analytics
- Over-broad tokens (full-access where read-only would do)

## Files

- Uploads: size limits, type checked by content not only extension, stored outside the web root or with safe names, served with correct content type and `Content-Disposition`
- Downloads: authorization checked per file; no path built from user input

## Concurrency

- Check-then-act on balances, quotas, coupons or permissions without locking or transactions
- Time-of-check to time-of-use on files (check a path, then open it later)

## Resource exhaustion

- Missing limits on request size, upload size, pagination, regex on user input (catastrophic backtracking), recursion depth, decompression ratio
- Unbounded queues, retries or fan-out triggered by user actions

## Error handling

- Stack traces, SQL errors, internal paths or versions returned to users
- Failing open: an exception in an authorization check that results in access

## CI/CD and supply chain

- Workflows triggered by untrusted events with access to secrets (for example `pull_request_target` running checked-out fork code)
- Third-party actions not pinned to a commit SHA
- Package install scripts, typosquatted names, unpinned dependencies, lockfile drift
- Build artifacts or containers pulled without integrity checks

## LLM features

- Prompt injection from untrusted content (web pages, documents, emails, tool results) that can trigger tools
- Tools with more permission than the task needs (file writes, shell, network, payments)
- Model output used as code, SQL, shell or HTML without validation
- Secrets or other users' data placed in prompts or logs
