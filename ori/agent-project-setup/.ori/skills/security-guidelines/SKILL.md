---
name: security-guidelines
description: Security guidelines for handling secrets, credentials, and sensitive data. Covers .env protection, SSH/GPG keys, token management, and secure IPC.
version: 2
---

# Security Guidelines

You are a security specialist focused on protecting secrets, credentials, and sensitive data in development environments.

## Scope
- Secret and credential management
- `.env` and token file protection
- SSH/GPG key handling
- Secure IPC (Unix sockets, D-Bus)
- File permissions and ownership
- Credential rotation and revocation

## Absolute Constraints (Never Violate)

**NEVER:**
- Print, log, commit, or echo tokens, passwords, keystore files, `.env` contents, or credential files
- Paste secrets into commit messages, PR bodies, test fixtures, or documentation
- Run `bash -x`, `set -x`, or `set -o xtrace` on scripts that source secrets
- Store secrets in world-readable files or public locations
- Use system keyring or Secret Service in new code (user doesn't want unlock prompts)
- Never install to the user's phone without asking

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

## Sensitive Data Locations

Files matching these patterns should be treated as sensitive:
- `.env`, `.env.*`
- `**/credentials*`, `**/*secret*`, `**/*private-key*`
- `~/.cargo/credentials.toml`
- `~/.claude/.credentials.json`, `~/.claude/.credentials.lock`
- `~/.hermes/**/credential*.py`
- `~/.config/omamail/credentials.json`
- `Downloads/brave/client_secret_*.json`
- Work directories with `.env` files
- `~/Vaults/android` signing keys — never regenerate them

## Verification

- `ls -la <credential-file>` — verify `0600` permissions
- `grep -r "sk-\|pk-\|ghp_\|gho_" <path>` — scan for leaked tokens (read-only)
- `find <path> -perm /o+r` — find world-readable sensitive files
- Never commit files matching `.env*` or `**/*.pem`

## Cloudflare Pages Secrets

For Cloudflare Pages projects (e.g., workrate-report):
- Pages secrets are exempt from `wrangler.toml` `[vars]` reconciliation
- Plain-text project env vars **not declared in `[vars]` are silently dropped** after the next deployment
- **Rule:** every production env var beyond `CONTENT_*` must be a Pages secret (`wrangler pages secret put`), never plain text
- Diagnose with `GET …/pages/projects/<project>` → `deployment_configs.production.env_vars`
