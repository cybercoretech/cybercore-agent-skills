# Design: lean default install with domain skill packs

Roadmap step 4 (owner-approved direction, 2026-11-20). Status: **draft for owner approval**.

## Intent

The catalog grows quickly (42 → 56 skills in about two weeks). Today every skill except the Omarchy pack lands in every agent. Startup cost is still small (names and descriptions of the 52 default skills ≈ 5,600 tokens; full text loads only when a skill is used), but it grows with every skill, and the chance of an agent loading the wrong skill grows faster than that: each new skill can collide with every existing one. Splitting now, while few people have installed the catalog, costs the least.

## The rule (goes into the contributor guide)

> **Default** = useful in nearly every software project, whatever the language or platform: how to work (clarify, plan, understand code, investigate, hand off), quality (review, testing, performance), security, git, CI, documentation and writing.
> **Pack** = tied to a language, platform, stack or domain. A new skill goes in an existing pack when one fits; a new pack needs at least two skills unless the domain clearly stands alone.

## The split (all 56 skills)

| Where | Skills | Count |
|---|---|---|
| **Default** | clarify-before-building, engineering-planning, codebase-intelligence, deep-investigation, session-handoff, code-review-and-refactoring, testing-qa, test-first-development, performance-optimization, security-guidelines, security-audit, dependency-and-supply-chain, git-workflow, ci-cd-pipelines, shell-scripting, documentation-and-adrs, plain-writing, diagrams-as-code | 18 |
| `rust` | rust-development, rust-applications, rust-app-architecture, rust-async-tokio, rust-config-and-cli, rust-observability, rust-persistence, rust-release-and-cross-compile, rust-testing, rust-ui | 10 |
| `web` | web-design-and-frontend-craft, accessibility-a11y, ux-design-audit, browser-verification, i18n-and-localization | 5 |
| `ai` | llm-application-patterns, prompt-engineering-for-agents, mcp-server-development, agent-evaluation-and-benchmarking, skill-evaluation | 5 |
| `ops` | container-devops, system-administration, observability-and-debugging, incident-response-basics | 4 |
| `backend` | api-backend, database-and-sql | 2 |
| `languages` | python-development, typescript-nodejs, zig-development, lua-development, qt-cpp-desktop | 5 |
| `mobile` | android-development, mobile-cross-platform | 2 |
| `office` | office-documents | 1 |
| `omarchy` (unchanged) | omarchy-agent-operations, omarchy-lua-config, omarchy-plugin-theme, rust-omarchy-tooling | 4 |

Judgement calls (owner can move any of these): `shell-scripting` and `ci-cd-pipelines` stay default because nearly every repository has scripts and CI; `observability-and-debugging` goes to `ops` because it is about running services; `office-documents` is a one-skill pack because office files are a domain of their own, not software engineering; `skill-evaluation` goes with the other agent-building skills in `ai`.

Default startup cost after the split: ≈ 2,400 tokens (from ≈ 5,600), measured as the characters of the 18 names and descriptions divided by four.

## Installing

- `setup-<agent>.sh` installs the 18 defaults.
- `--with rust,web` installs several packs in one flag (repeating `--with` still works); `--with all` installs every pack, which matches today's full install.
- `--list-packs` (exists) lists packs with their skill counts and one-line purpose.
- `install-skill.sh <agent> <skill>` still installs any single skill from any pack.

## Existing installs

Nothing is removed from anyone's machine. `update-skills.sh` treats a pack as installed when any of its skills is present, so people who installed the full catalog before the split keep every skill they have, and keep getting updates for it. New installs get the lean default.

## Changes

- `manifest.yaml`: groups become `core` (default) plus one group per pack (`default: false`, `pack: <id>`), each with a title and one-line description; every skill gets its new group.
- Generated template copies move from `<skills_dir>/<skill>` to `packs/<pack>/<skill>` (old copies removed with `git rm`; the sync script never deletes).
- Installer template: comma lists and `all` in `--with`; `--list-packs` shows counts and descriptions.
- README: skill tables grouped by default and pack, install examples with `--with`, counts; `PUBLIC_RELEASE_SCOPE.md` counts; the placement rule in "Contributing a skill".
- Website: explorer folders follow the new groups (default first, then packs marked opt-in); availability text already handles packs; the install panel shows the `--with` flag; tests updated for the new folder list.
- Validator and smoke tests: every pack installs; `--with a,b` and `--with all` work; unknown pack names fail.

## Not changing

Skill IDs, skill content, descriptions, deep links, `update-skills.sh` behaviour.

## Verification

All existing checks plus the new smoke cases; a report-only `update-skills.sh all` against a full pre-split install shows no `REMOVED` items.
