# Report Template and Severity Rubric

## Severity rubric

Rate realistic impact and likelihood in this system, not the theoretical worst case of the class.

| Severity | Meaning | Examples |
|---|---|---|
| **Critical** | Remote, unauthenticated compromise of the system, all users' data, or money; easy to exploit | SQL injection on a public endpoint; authentication bypass; leaked production admin key |
| **High** | Serious compromise needing some access or effort | IDOR exposing other users' records; stored XSS in an admin view; SSRF to cloud metadata |
| **Medium** | Real weakness with limited impact or significant preconditions | CSRF on a non-critical action; reflected XSS needing user interaction; missing rate limit on login |
| **Low** | Minor impact or very unlikely exploitation | Verbose error messages; missing security header with other mitigations present |
| **Informational** | No direct vulnerability; worth knowing | Outdated but unaffected dependency; a hardening opportunity |

Cite a CWE where it fits (for example CWE-89 SQL injection, CWE-639 IDOR, CWE-79 XSS, CWE-918 SSRF, CWE-798 hard-coded credentials, CWE-22 path traversal). CVSS scores are optional; if used, show the vector.

## Report

```markdown
# Security audit: <project or component>

**Date:** YYYY-MM-DD  **Commit:** <sha>  **Depth:** quick review / focused audit / full audit
**Auditor:** <agent and model>, for <user>

## Summary
Two to four sentences a non-specialist can act on: the most important risks and what to fix first.

| ID | Title | Severity | Confidence | Status |
|---|---|---|---|---|
| SA-1 | Order lookup lets any user read other users' orders | High | Confirmed | Open |

## Scope and method
- In scope / out of scope
- Entry points and boundaries examined
- Scanners run (with versions) and manual review classes covered
- Environment used for reproduction (local only)

## Findings

### SA-1: <title>
- **Severity:** High  **Confidence:** Confirmed  **CWE:** CWE-639
- **Location:** `src/orders/handlers.rs:88` (also `:142`)
- **Description:** what is wrong, in plain words
- **Evidence:** the data flow from source to sink, with code excerpts (secrets redacted)
- **Impact:** what an attacker can do, and who can be that attacker
- **Reproduction:** safe local steps or the failing test that demonstrates it
- **Fix:** the concrete change, and the regression test to add
- **References:** relevant docs or advisories

## Hardening suggestions
Defence-in-depth improvements that are not exploitable findings.

## Positive observations
Controls that are done well (helps the team keep them).

## Not covered
What this audit did not examine, and why.
```

## Writing findings well

- Title states the impact, not the class: "Any user can read other users' orders", not "IDOR".
- One root cause per finding; list every location.
- Evidence a developer can follow without you: file, line, the path through the code.
- The fix is specific enough to implement, and names the test that proves it.
- Never include secret values, real personal data or working exploit payloads against third parties.
