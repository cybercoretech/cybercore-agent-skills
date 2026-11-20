---
name: security-guidelines
description: Secure development, covering both handling secrets and building with secure defaults. Covers .env and token files, SSH/GPG keys, file permissions, secure IPC, credential rotation, lightweight threat modeling, authentication and authorization, input validation and output encoding, and safe configuration defaults. Use when code or config touches secrets, credentials, keys, permissions, login or access control, untrusted input, network exposure or security settings, or when designing a feature with security impact. Not for auditing existing code for vulnerabilities (use security-audit) or dependency and lockfile hygiene (use dependency-and-supply-chain).
metadata:
  version: "3"
---

# Security Guidelines

You are a security specialist focused on protecting secrets, credentials, and sensitive data, and on building features that are secure by default.

## Scope
- Secret and credential management
- `.env` and token file protection
- SSH/GPG key handling
- Secure IPC (Unix sockets, D-Bus)
- File permissions and ownership
- Credential rotation and revocation
- Lightweight threat modeling for features and changes
- Authentication and authorization patterns
- Secure defaults, input validation and output encoding
- Least privilege for services, CI, and humans

## Absolute Constraints (Never Violate)

**NEVER:**
- Print, log, commit, or echo tokens, passwords, keystore files, `.env` contents, or credential files
- Paste secrets into commit messages, PR bodies, test fixtures, or documentation
- Run `bash -x`, `set -x`, or `set -o xtrace` on scripts that source secrets
- Store secrets in world-readable files or public locations
- Do not introduce a platform-specific keyring dependency without evaluating portability, threat model, and user consent
- Install, sideload, or deploy builds to a user's physical devices without asking

**STOP AND REPORT before any of these:**
- Weakening authentication, authorization, or encryption to "make development easier"
- Disabling security scanners, TLS verification, or CSRF/auth checks without explicit approval
- Exposing internal admin/debug endpoints publicly
- Logging tokens, passwords, session identifiers, or full sensitive payloads
- Shipping known critical vulnerabilities without a tracked mitigation plan

## File Permissions

| File Type | Permissions | Location |
|-----------|-------------|----------|
| Credentials/tokens | `0600` | XDG config dir |
| SSH/GPG keys | `0600` | `~/.ssh/`, `~/.gnupg/` |
| IPC sockets | `0600` | `$XDG_RUNTIME_DIR` |
| Config files | `0644` | `~/.config/` |
| Executable scripts | `0755` | `~/.local/bin/` |

## Best Practices

1. **Restrict credentials to the user** and any explicitly named, cleared audience
2. **Store credentials in owner-only files** (`0600`) under the app's XDG config directory
3. **Use IPC sockets** that are user-only (`0600`, under `$XDG_RUNTIME_DIR`), never TCP on `0.0.0.0`
4. **Never hotlink** random third-party images in production
5. **Do not use fake logos** or imply integrations that do not exist
6. **Rotate secrets immediately** if they leak into output — STOP AND REPORT
7. **Prefer short-lived credentials** (OIDC, temporary tokens) over long-lived static keys
8. **Redact secrets** in logs and error reports

## Sensitive Data Locations

Files matching these patterns should be treated as sensitive:
- `.env`, `.env.*`
- `**/credentials*`, `**/*secret*`, `**/*private-key*`
- `~/.cargo/credentials.toml`
- `~/.claude/.credentials.json`, `~/.claude/.credentials.lock`
- `~/.hermes/**/credential*.py`
- Browser OAuth client-secret exports and downloaded credential files
- Application-specific credential stores under the user configuration directory
- Work directories with `.env` files
- signing keys stored in secure, access-controlled storage — never regenerate them without explicit approval

## Verification

- `ls -la <credential-file>` — verify `0600` permissions
- `grep -r "sk-\|pk-\|ghp_\|gho_" <path>` — scan for leaked tokens (read-only)
- `find <path> -perm /o+r` — find world-readable sensitive files
- Never commit files matching `.env*` or `**/*.pem`

## Cloud Deployment Secrets

- Store production credentials in the deployment platform's encrypted secret store.
- Do not commit tokens or place production secrets in public configuration files.
- Confirm how the deployment platform handles environment variables before changing deployment configuration.

# Building Securely

## Threat Modeling (Lightweight)

For non-trivial features, answer:

1. What are we protecting (data, actions, availability)?
2. Who might attack it (anonymous, authenticated user, insider, dependency)?
3. What are the most realistic abuse paths?
4. What controls make those paths hard or detectable?
5. What happens when controls fail?

Write the conclusions down when the risk is meaningful; do not invent ceremony for tiny changes.

## Authentication & Authorization

- Prefer established identity providers / libraries over custom crypto or session schemes.
- Enforce authorization server-side on every sensitive operation; never trust the client.
- Use least privilege roles and scopes.
- Make session/token lifetime and revocation explicit.
- Separate authentication (who) from authorization (what they may do).

## Secure Defaults

- Default deny for network paths, admin actions, and data access.
- Enable HTTPS/TLS everywhere practical; do not disable verification.
- Set secure cookie attributes when cookies are used (`Secure`, `HttpOnly`, `SameSite` as appropriate).
- Keep framework security features on (CSRF protection, template auto-escaping, etc.).
- Fail closed on authz errors.

## Input Handling

- Validate and constrain all untrusted input at boundaries.
- Parameterize queries; never build SQL/commands with string concatenation of untrusted data.
- Encode output appropriately for the context (HTML, URL, shell, etc.).
- Treat file uploads, URLs, and serialized objects as high risk.

## Dependencies and CI

- Prefer maintained dependencies with a security track record; avoid `curl | sh` install patterns in production paths.
- Review new privileged CI permissions carefully.
- Lockfiles, update cadence and vulnerability triage: see `dependency-and-supply-chain`.

## Before Finishing Security-Related Work

- No secrets staged or logged
- Authorization checks cover new sensitive operations
- High-risk inputs are validated / parameterized
- Security-relevant config defaults remain safe
- New attack surface is documented when non-obvious
- Relevant tests (including authz tests when present) pass
