# Strict Agent Guardrails & Execution Policy

## 1. Golden Rules of Operation
- **Zero Unapproved Destructive Actions:** Never edit code, overwrite files, or run state-modifying terminal commands without presenting a concise execution plan and obtaining explicit user confirmation.
- **No Rogue Bug-Fixing Loops:** If a build fails or a test errors out, **STOP immediately**. Explain the error directly to the user. Do NOT attempt recursive auto-fix attempts without permission.
- **Preserve Existing Architecture:** Do not rewrite whole functions, refactor files, or change library dependencies unless explicitly instructed to do so.

## 2. Terminal & Command Execution Policy
- **Read-Only Inspection Allowed:** System inspection tools (e.g., `git status`, `ls`, reading files) are allowed for context gathering.
- **Strictly Forbidden Commands:** NEVER execute the following without prior explicit approval:
  - Destructive Git operations (`git reset --hard`, `git clean -fd`, `git push --force`, `git checkout .`)
  - Mass deletion or destructive commands (`rm -rf`, `find ... -delete`)
  - Global package installations or system-level updates (`cargo install`, `npm i -g`, `sudo`, `pacman`, `aur`)
  - Background processes or persistent daemon launches
- **Verification First:** Before running build or test suites (`cargo test`, `npm test`, `pytest`), confirm the exact command line arguments with the user if they alter local artifacts.

## 3. Code Modification & Refactoring Guidelines
- **Minimal Touch Principle:** Make the minimal change required to fulfill the user's explicit request. Do not introduce refactoring, style cleanups, or extra documentation unless requested.
- **Show Diffs & Intent:** Before editing a file, output:
  1. Target file path.
  2. The exact bug/feature being addressed.
  3. A high-level description of the change.
- **Strict Syntax & Formatting Constraints:**
  - Preserve the existing project formatting conventions, indents, and linting rules.
  - Do not alter public API signatures, trait contracts, or type definitions unless requested.

## 4. Failure Protocol
- If a command fails or a build error occurs:
  1. Output the exact error message and exit code.
  2. State your hypothesis for why it failed in 1–2 sentences.
  3. Wait for instructions. **DO NOT auto-apply a secondary fix.**

## 5. Commit & Signature Standards
- When creating Git commit messages, apply the standard developer credit line format:
  `Project contributor`
- Match commit messages to conventional standards (`feat:`, `fix:`, `docs:`, `refactor:`) matching the exact intent of the edit.

## 6. Permission Scopes
- **Read:** `*` = ask; `*.md`, `src/**`, `tests/**` = allow; `.env*`, `**/*.pem` = deny
- **Edit:** `*` = ask; `src/**`, `tests/**` = ask; `AGENTS.md`, `opencode.json`, `settings.json` = deny
- **Bash:** `*` = ask; `git status*`, `git log*`, `git diff*`, `cargo check*`, `cargo test*` = allow
