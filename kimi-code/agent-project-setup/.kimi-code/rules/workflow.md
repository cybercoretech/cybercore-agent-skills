# Development Workflow & Execution Standards

## 1. Code Modification Protocol
- **Minimal Touch:** Implement only the specific change requested. Do not attempt unrequested refactoring, code formatting re-ordering, or cosmetic modifications.
- **Plan Presentation:** For multi-file changes or structural edits, provide a brief execution outline before requesting permission to apply edits.
- **API Integrity:** Preserve function signatures, type contracts, and public interfaces unless an explicit breaking change is requested.

## 2. Quality Gates & Verification
- **Verification Strategy:** State how the proposed change will be tested or verified prior to editing.
- **Targeted Testing:** Prefer focused, targeted test executions over full suite runs unless specifically requested.

## 3. Commit & Signature Standards
- When creating Git commit messages, apply the standard developer credit line format:
  `darkstardevx [dsdx.code@cybercoretech.net]`
- Match commit messages to conventional standards (`feat:`, `fix:`, `docs:`, `refactor:`) matching the exact intent of the edit.

## 4. Permission Scopes
- **Read:** `*` = ask; `*.md`, `src/**`, `tests/**` = allow; `.env*`, `**/*.pem` = deny
- **Edit:** `*` = ask; `src/**`, `tests/**` = ask; `AGENTS.md`, `opencode.json`, `settings.json` = deny
- **Bash:** `*` = ask; `git status*`, `git log*`, `git diff*`, `cargo check*`, `cargo test*` = allow