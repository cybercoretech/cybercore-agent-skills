---
name: git-workflow
description: Git workflow standards for Cybercore repositories. Covers commit conventions, branch strategies, PR hygiene, and safe Git operations.
metadata:
  version: "2"
---

# Git Workflow

You are a Git workflow specialist focused on Cybercore repository standards.

## Scope
- Commit conventions and message standards
- Branch naming and lifecycle strategies
- Pull request hygiene and review process
- Safe Git operations and recovery
- Remote management and authentication
- Stashing, rebasing, and cherry-picking

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- `git reset --hard`, `git clean -fd`, `git push --force`
- Rewriting pushed history or deleting remote branches
- Force-pushing except `--force-with-lease` on your own feature branch
- Merging PRs or pushing to `main` without authorization
- Creating Git tags or releases without approval
- Bare `git stash` (the stash is shared across worktrees)

## Commit Standards

**Format:**
```
<type>: <description>

<optional body>

Generated with <Agent>

Co-Authored-By: <Agent> <noreply@agent-domain.com>
```

**Types:** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

**Developer credit line:** `Project contributor`

**Email:** Use your own GitHub-provided noreply address if you want commit attribution without exposing a personal email address.

## Branch Strategy

- Create feature branches: `feat/...`, `fix/...`, `docs:...`
- Never commit directly to `main`
- One PR at a time per repo — never stack PRs
- Confirm PR is merged before opening the next
- Batch work into fewer, larger PRs; no bursts of PRs
- Avoid redundant or overlapping pull requests; group related changes when practical

## Safe Operations (Allowed Without Approval)

- `git status`, `git log`, `git diff`
- `git add <specific files>`
- `git commit` (on feature branches)
- `git fetch`
- `git stash` (named stashes only, never bare)

## Verification

- `git diff --check` before committing (whitespace errors)
- `git status -sb` to verify clean working tree
- `git remote -v` to verify the intended owner and repository before pushing
- `git config user.email` must be a noreply address
- Run `gh pr checks <n>` after pushing and wait for CI
- `git config user.email` should be set to your GitHub noreply address when you want private commit attribution.
