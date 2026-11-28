# 🔒 CyberCore Agent Skills

Reusable guardrails, rules, and skills for 13 AI coding agents. Every skills-capable agent gets the same 21 default skills, 11 optional domain packs (60 more skills, from Rust to web to AI), and five shared rule files, adapted to the configuration layout that agent actually reads.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![13 agents](https://img.shields.io/badge/agents-13-purple)](#-supported-agents)
[![81 skills](https://img.shields.io/badge/skills-81-green)](#-included-skills)
[![Release](https://img.shields.io/github/v/release/cybercoretech/cybercore-agent-skills)](CHANGELOG.md)
[![Skills Explorer](https://img.shields.io/badge/explorer-live-7df9ff)](https://cybercoretech.github.io/cybercore-agent-skills/)

🌐 **Browse the skills in the [Skills Explorer](https://cybercoretech.github.io/cybercore-agent-skills/)**: search the catalog, read each skill, compare agents, and copy a one-skill install command.

## 🤖 Supported agents

Each template lives at `<agent>/agent-project-setup/` and installs into your home agent folders (`~/.<agent>/skills/`) so they work in any project.

| Agent | Installer | Skills install to | Status |
|---|---|---|---|
| 🤖 Claude | `claude/agent-project-setup/setup-claude.sh` | `~/.claude/skills/` | ✅ Verified |
| 📓 Codex | `codex/agent-project-setup/setup-codex.sh` | `~/.agents/skills/` | ✅ Verified |
| 🤖 GitHub Copilot | `copilot/agent-project-setup/setup-copilot.sh` | `~/.github/skills/` | ✅ Verified |
| 💥 Crush | `crush/agent-project-setup/setup-crush.sh` | `~/.crush/skills/` | ✅ Verified |
| 💎 Gemini CLI | `gemini/agent-project-setup/setup-gemini.sh` | `~/.gemini/skills/` | ✅ Verified ¹ |
| 📬 Hermes | `hermes/agent-project-setup/setup-hermes.sh` | `~/.hermes/skills/` | ⚙️ One-time setup ² |
| 🤖 Kimi Code | `kimi-code/agent-project-setup/setup-kimi-code.sh` | `~/.kimi-code/skills/` | ✅ Verified |
| 🦙 Ollama | `ollama/agent-project-setup/setup-ollama.sh` | `~/.ollama/rules/` | 📄 Rules only ³ |
| 🦷 OpenClaw | `openclaw/agent-project-setup/setup-openclaw.sh` | `~/.openclaw/skills/` | ⚙️ One-time setup ⁴ |
| 🦾 OpenCode | `opencode/agent-project-setup/setup-agent.sh` | `~/.opencode/skills/` | ✅ Verified |
| 🦉 Ori | `ori/agent-project-setup/setup-ori.sh` | `~/.ori/skills/` | 🧪 Unverified ⁵ |
| 🥧 Pi | `pi/agent-project-setup/setup-pi.sh` | `~/.pi/skills/` | ✅ Verified |
| 🤖 Qwen Code | `qwen/agent-project-setup/setup-qwen.sh` | `~/.qwen/skills/` | ✅ Verified |

1. Agent Skills are experimental in some Gemini CLI versions. If `/skills list` is empty, enable them in your Gemini settings.
2. If Hermes does not list the skills, trust the directory once: `hermes skills trust ~`.
3. Ollama has no skills system, so this template installs `AGENTS.md` and the rules only.
4. If OpenClaw does not list the skills, add `~/.openclaw/skills` to `skills.load.extraDirs` in `~/.openclaw/openclaw.json`.
5. Ori's skill discovery could not be confirmed from its documentation. Check that Ori lists the skills before you rely on them.

Rules install to `~/.<agent>/rules/`, and the root instruction file (`CLAUDE.md` for Claude, `AGENTS.md` for everyone else) tells the agent to read them. Codex also gets `~/.codex/rules/default.rules`, a command policy; if Codex does not apply it, mark your home directory as trusted in Codex. Claude gets `~/.claude/settings.json` with matching allow and deny rules; it is installed only when you have none.

## 🚀 Quick start

Skills install to your home agent folders (`~/.claude/skills/`, `~/.opencode/skills/`, etc.) so they work in any project.

```bash
# 1. Clone the repository once
git clone https://github.com/cybercoretech/cybercore-agent-skills.git ~/cybercore-agent-skills

# 2. Run your agent's installer from anywhere (pick your agent below)
bash ~/cybercore-agent-skills/claude/agent-project-setup/setup-claude.sh
```

### One command per agent

| Agent | Command |
|-------|---------|
| 🤖 Claude | `bash ~/cybercore-agent-skills/claude/agent-project-setup/setup-claude.sh` |
| 📓 Codex | `bash ~/cybercore-agent-skills/codex/agent-project-setup/setup-codex.sh` |
| 🤖 GitHub Copilot | `bash ~/cybercore-agent-skills/copilot/agent-project-setup/setup-copilot.sh` |
| 💥 Crush | `bash ~/cybercore-agent-skills/crush/agent-project-setup/setup-crush.sh` |
| 💎 Gemini CLI | `bash ~/cybercore-agent-skills/gemini/agent-project-setup/setup-gemini.sh` |
| 📬 Hermes | `bash ~/cybercore-agent-skills/hermes/agent-project-setup/setup-hermes.sh` |
| 🤖 Kimi Code | `bash ~/cybercore-agent-skills/kimi-code/agent-project-setup/setup-kimi-code.sh` |
| 🦙 Ollama | `bash ~/cybercore-agent-skills/ollama/agent-project-setup/setup-ollama.sh` |
| 🦷 OpenClaw | `bash ~/cybercore-agent-skills/openclaw/agent-project-setup/setup-openclaw.sh` |
| 🦾 OpenCode | `bash ~/cybercore-agent-skills/opencode/agent-project-setup/setup-agent.sh` |
| 🦉 Ori | `bash ~/cybercore-agent-skills/ori/agent-project-setup/setup-ori.sh` |
| 🥧 Pi | `bash ~/cybercore-agent-skills/pi/agent-project-setup/setup-pi.sh` |
| 🤖 Qwen Code | `bash ~/cybercore-agent-skills/qwen/agent-project-setup/setup-qwen.sh` |

> **OpenCode:** The installer script is `setup-agent.sh`, not `setup-opencode.sh`.

Installers merge rules and skills, keep unrelated files, and back up every file they are about to replace to `${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/<home folder name>-<id>/<agent>/<timestamp>/`. Review the generated files and the backup.

> ⚠️ Codex, Copilot, Gemini, and most other agents share one root `AGENTS.md`. If you install two of these agents, the second installer replaces the first agent's `AGENTS.md` and prints a warning. The previous file is kept in the backup.

### Optional packs

The installers add the default skills. Add domain packs with `--with`: one pack, a comma list, or `all` for the whole catalog:

```bash
bash ~/cybercore-agent-skills/claude/agent-project-setup/setup-claude.sh --with rust,web
bash ~/cybercore-agent-skills/claude/agent-project-setup/setup-claude.sh --with all
bash ~/cybercore-agent-skills/claude/agent-project-setup/setup-claude.sh --list-packs
```

- `ai` (5): LLM features, agent prompts and skills, MCP servers, and agent and skill evaluation.
- `backend` (2): HTTP APIs, databases and SQL.
- `languages` (5): Python, TypeScript and Node.js, Zig, Lua, and Qt with C++.
- `mobile` (2): Native Android and cross-platform mobile apps.
- `office` (1): Word, Excel, PowerPoint and PDF documents.
- `omarchy` (5): Omarchy desktop operations, Lua config, plugins and themes, Hyprland and Wayland theming, and Rust tooling for Omarchy.
- `ops` (10): Containers, Linux administration, observability and incident response, plus Cloudflare DNS and Workers as code, forge mirroring, daemon packaging, firewall rules, CI build matrices and privacy audits.
- `rust` (15): Rust libraries and applications, from architecture and async to testing, UI and releases, plus supply-chain checks, error and async guardrails, TUI architecture, allocation profiling and parser testing.
- `terminal` (4): Command-line UX, terminal keybindings, glyph styling, and man pages and README references generated from CLI flags.
- `web` (9): Building and auditing web interfaces, accessibility, browser checks and localization, plus CSS layout and motion, neon palettes, design tokens and self-hosted fonts.
- `workflow` (2): Architectural decision records, atomic Conventional Commits and Keep a Changelog releases.

### Install a single skill

To install one skill without the rest of the template, give the agent and the skill name:

```bash
bash ~/cybercore-agent-skills/scripts/install-skill.sh claude rust-testing
```

### Keep installed skills up to date

After `git pull` in your clone, check what changed for your agents (this changes nothing):

```bash
bash ~/cybercore-agent-skills/scripts/update-skills.sh all      # or one agent, e.g. claude
bash ~/cybercore-agent-skills/scripts/update-skills.sh all --apply
```

It compares every installed skill and rule with the versions in the clone's git history. Out-of-date copies are updated and new skills installed with `--apply`; copies you customised are never touched (it shows a `diff` command instead); skills removed from the catalog are only moved to the backup folder with `--apply --prune`. Your own skills that were never part of this repo are left alone.

## 🧩 Included skills

Every skills-capable agent gets the **21 default skills**. Domain skills come in **optional packs**: add them with `--with <pack>`, `--with rust,web` or `--with all` (see [Optional packs](#optional-packs)).

### Default (21)

Useful in nearly every software project, whatever the language or platform.

| Skill | Purpose |
|---|---|
| 🔀 `git-workflow` | Branches, commits, pull requests, and safe Git operations |
| 🔒 `security-guidelines` | Secrets, credentials, permissions, threat modeling, auth, input handling, and secure defaults |
| 🐚 `shell-scripting` | Bash and Zsh scripting, shell safety, and automation |
| 🧪 `testing-qa` | Test strategy: which tests, where, and CI test gates |
| 🔁 `ci-cd-pipelines` | GitHub Actions, reusable workflows, caching, matrices, and secrets |
| ❓ `clarify-before-building` | Ask the questions that change what gets built, then confirm a short brief before coding |
| 🔍 `code-review-and-refactoring` | Review standards, constructive feedback, and safe refactoring |
| 🔎 `deep-investigation` | Persistent investigation, evidence-driven troubleshooting, and root-cause analysis |
| 🧭 `codebase-intelligence` | Repository structure, architecture, execution paths, dependencies, and integration points |
| 🗺️ `diagrams-as-code` | Mermaid, DOT, D2 and SVG diagrams derived from real code, one question each, rendered, accessible, kept beside the source |
| 📐 `engineering-planning` | Technical design, task decomposition, dependencies, delegation, and verification-ready plans |
| 📦 `dependency-and-supply-chain` | Lockfiles, vulnerability awareness, SBOMs, and supply-chain hygiene |
| 📝 `documentation-and-adrs` | READMEs, Architecture Decision Records, and knowledge capture |
| ⚡ `performance-optimization` | Measurement, complexity, caching, and hot-path optimization |
| ✍️ `plain-writing` | Clear, specific, human prose for docs, PRs, release notes and UI copy; removes machine-writing patterns, keeps every fact |
| 🕵️ `security-audit` | Scoped, defensive audits: attack surface, scanners, review by vulnerability class, validated findings report |
| 🤝 `session-handoff` | Verified, current-state handoff files so work survives session ends, context resets and agent switches |
| 🚦 `test-first-development` | Red, green, refactor: failing test first, regression tests for bugs, characterization tests for legacy code |
| ✂️ `strict-scope-reviewer` | Exactly the requested change: scope contract, no unrequested abstractions, dependencies or flags; diff checker |
| 🐞 `root-cause-debugging` | Failing test first, one variable at a time, minimal fix, proof that the test fails on old code and passes on new |
| 🪧 `skill-router` | Priority rules when several skills match a prompt; ranks installed skills and finds overlapping or shadowed ones |

### 🧠 AI pack (`--with ai`, 5)

LLM features, agent prompts and skills, MCP servers, and agent and skill evaluation.

| Skill | Purpose |
|---|---|
| 📊 `agent-evaluation-and-benchmarking` | Agent evaluation, benchmark integrity, failure attribution, and reliability analysis |
| 🤖 `llm-application-patterns` | Prompt structure, tool use, evaluation, and safety for LLM features |
| 🧩 `mcp-server-development` | MCP servers agents can use safely: task-shaped tools, strict schemas, transports, auth, and protocol testing |
| 🧠 `prompt-engineering-for-agents` | Writing effective skills, rules, and system prompts |
| 🎯 `skill-evaluation` | Prove a skill helps: trigger tests, with/without comparisons on target and control tasks, scoped verdicts |

### 🔌 Backend pack (`--with backend`, 2)

HTTP APIs, databases and SQL.

| Skill | Purpose |
|---|---|
| 🔌 `api-backend` | API design, backend services, validation, and error handling |
| 🗄️ `database-and-sql` | Schema design, query safety, migrations, and data access |

### 🔤 Languages pack (`--with languages`, 5)

Python, TypeScript and Node.js, Zig, Lua, and Qt with C++.

| Skill | Purpose |
|---|---|
| 🖥️ `qt-cpp-desktop` | Qt 6, C++, QML, and desktop application development |
| 🌙 `lua-development` | Lua modules, error handling, performance, and testing |
| 🐍 `python-development` | Packaging, typing, async, testing, and tooling |
| 🟦 `typescript-nodejs` | Strict TypeScript, module systems, tooling, and testing |
| ⚙️ `zig-development` | `build.zig`, allocators, C interop, and testing |

### 📱 Mobile pack (`--with mobile`, 2)

Native Android and cross-platform mobile apps.

| Skill | Purpose |
|---|---|
| 📱 `android-development` | Android SDK, Gradle, APK signing, and device tooling |
| 📲 `mobile-cross-platform` | Flutter, React Native, and Kotlin Multiplatform |

### 📄 Office pack (`--with office`, 1)

Word, Excel, PowerPoint and PDF documents.

| Skill | Purpose |
|---|---|
| 📄 `office-documents` | Word, Excel, PowerPoint and PDF: templates and styles, intact formulas, local conversion, render-and-inspect checks |

### 🖥️ Omarchy pack (`--with omarchy`, 5)

Omarchy desktop operations, Lua config, plugins and themes, Hyprland and Wayland theming, and Rust tooling for Omarchy. For [Omarchy](https://omarchy.org) (Arch Linux + Hyprland) desktops.

| Skill | Purpose |
|---|---|
| 🛠️ `omarchy-agent-operations` | Safe agent changes to Omarchy settings, packages, and themes |
| 🎚️ `omarchy-lua-config` | Omarchy Lua configuration for Hyprland, bindings, and look-and-feel |
| 🧩 `omarchy-plugin-theme` | Omarchy plugins, themes, and menu integrations |
| 🔧 `rust-omarchy-tooling` | Omarchy integration for Rust tools |
| 🌊 `hyprland-wayland-theme-integrator` | Sync app palettes, window rules and IPC hooks with Hyprland and other Wayland compositors and desktop themes |

### ⚙️ Ops pack (`--with ops`, 10)

Containers, Linux administration, observability and incident response, plus Cloudflare DNS and Workers as code, forge mirroring, daemon packaging, firewall rules, CI build matrices and privacy audits.

| Skill | Purpose |
|---|---|
| ☁️ `container-devops` | Docker, Compose, images, and containerized services |
| 🐧 `system-administration` | Linux administration, systemd, packages, and services |
| 🚨 `incident-response-basics` | Detection, triage, communication, rollback, and blameless follow-up |
| 🔭 `observability-and-debugging` | Structured logging, metrics, tracing, and profiling |
| 🌤️ `cloudflare-dns-iac` | Cloudflare DNS, Zero Trust and Workers as code, with a plan checker before every apply |
| 🪞 `forge-mirror-sync` | Append-only GitHub to GitLab mirroring, protection audits, release and asset sync |
| 🧰 `linux-systemd-daemon-packager` | systemd units, sandboxing, install and uninstall scripts for daemons |
| 🧱 `network-firewall-rule-validator` | nftables, iptables, WireGuard and Tailscale changes without locking yourself out |
| 🧮 `cross-platform-ci-matrix-builder` | Multi-OS and multi-arch CI matrices, caching, and release artifacts |
| 🛡️ `offline-first-privacy-auditor` | Find outbound network calls, analytics and hidden telemetry in code and dependencies |

### 🦀 Rust pack (`--with rust`, 15)

Rust libraries and applications, from architecture and async to testing, UI and releases, plus supply-chain checks, error and async guardrails, TUI architecture, allocation profiling and parser testing.

| Skill | Purpose |
|---|---|
| 🦀 `rust-development` | Cargo workspaces, crates.io publishing, MSRV, and library error handling |
| 🧭 `rust-applications` | Index that routes to the focused Rust application skills below |
| 🏗️ `rust-app-architecture` | Library-plus-binary layout, crate and module boundaries |
| ⏱️ `rust-async-tokio` | Tokio runtimes, cancellation, graceful shutdown, and timeouts |
| 🎛️ `rust-config-and-cli` | `clap`, config files, environment variables, XDG paths, dry runs |
| 📈 `rust-observability` | `tracing`, spans, `EnvFilter`, and redaction |
| 💾 `rust-persistence` | Atomic writes, SQLite, and ordered migrations |
| 🚀 `rust-release-and-cross-compile` | Release profiles, features, and cross-compilation |
| ✅ `rust-testing` | Integration, async, temp-dir, and property tests |
| 🪟 `rust-ui` | Choosing CLI, TUI (`ratatui`), or GUI, and building TUIs |
| 📋 `cargo-supply-chain-msrv-auditor` | clippy, cargo-deny and cargo-audit at the MSRV before work is marked done |
| 🚧 `rust-idiomatic-error-async-guardrails` | `thiserror`/`anyhow` patterns, no `unwrap` in production, cancellation-safe async |
| 📺 `ratatui-layout-state-architect` | Elm-style state, messages and layout for Ratatui apps |
| 🏎️ `zero-allocation-perf-profiler` | Benchmarks, allocation counts, flamegraphs and assembly for hot paths |
| 🧬 `compiler-lexer-test-harness` | Fuzz, differential and snapshot tests for lexers and parsers |

### ⌨️ Terminal pack (`--with terminal`, 4)

Command-line UX, terminal keybindings, glyph styling, and man pages and README references generated from CLI flags.

| Skill | Purpose |
|---|---|
| ⌨️ `posix-cli-ux-designer` | `--help`, exit codes, stdin/stdout piping and `--json` output that follow POSIX conventions |
| 🎹 `terminal-keybinding-vim-nav` | Modal `hjkl` navigation and discoverable footer keybinding hints for terminal UIs |
| 🔣 `ansi-nerd-font-glyph-stylist` | ANSI escape codes, box drawing and Nerd Font glyph alignment across terminal emulators |
| 📖 `doc-manpage-builder` | Man pages, README usage tables and config references from `--help`, with a drift check |

### 🌐 Web pack (`--with web`, 9)

Building and auditing web interfaces, accessibility, browser checks and localization, plus CSS layout and motion, neon palettes, design tokens and self-hosted fonts.

| Skill | Purpose |
|---|---|
| 🎨 `web-design-and-frontend-craft` | Building new sites and UI: visual direction, CSS systems, and assets |
| ♿ `accessibility-a11y` | Semantic HTML, keyboard support, ARIA, contrast, and a11y testing |
| 🖱️ `browser-verification` | Walk changed flows in a real browser: screenshots by width and theme, console, network, and keyboard checks |
| 🌐 `i18n-and-localization` | String extraction, locales, formatting, and RTL awareness |
| 🧐 `ux-design-audit` | Audit existing UIs by area, prioritize findings with screenshots, fix within the design system with before/after proof |
| 🎞️ `css-grid-motion-system` | Grid and Flexbox shells and compositor-only micro-interactions, with a motion linter |
| 🌈 `cyberpunk-neon-palette` | Dark neon palettes that pass WCAG contrast, with disciplined glow rules and a generator |
| 🎭 `design-token-theme-switcher` | Extract hard-coded values into tokens, TOML themes, and a flash-free theme switcher |
| 🔤 `foss-font-bundler` | Self-hosted WOFF2 subsets and `@font-face` rules with zero CDN calls |

### 🔁 Workflow pack (`--with workflow`, 2)

Architectural decision records, atomic Conventional Commits and Keep a Changelog releases.

| Skill | Purpose |
|---|---|
| 🗳️ `adr-writer` | Concise ADRs in `docs/adr/`: options, consequences, revisit triggers; create, index and lint |
| 🏷️ `conventional-commit-changelog` | Split staged changes into atomic commits, lint messages, update CHANGELOG.md |

## 📁 Repository layout

```text
cybercore-agent-skills/
├── manifest.yaml              # agents, install paths, skill groups, packs
├── CHANGELOG.md               # release notes; the newest dated entry is the catalog version
├── skills/<name>/SKILL.md     # canonical skills (edit here)
├── rules/<rule>.md            # canonical rules (edit here)
├── templates/
│   ├── setup.sh.in            # installer template for every agent
│   └── skill-skeleton/        # starting point for new skills
├── scripts/
│   ├── install-skill.sh       # install one skill for one agent
│   ├── update-skills.sh       # check and update installed skills and rules
│   ├── sync_templates.py      # copies skills/rules into templates, renders installers
│   ├── build_site_data.py     # generates website/data.js and website/docs.js
│   ├── validate_templates.py  # manifest, skills, templates and README tables
│   ├── check_skill_descriptions.py  # "Use when" clauses, skill pointers, neighbour pairs
│   ├── skill-neighbours.yaml  # skill pairs that must stay linked in their descriptions
│   ├── check_release.py       # release tag vs CHANGELOG.md, release notes
│   └── check_public_sanitization.py
├── tests/
│   ├── smoke_installers.sh    # every installer, packs, single-skill and update scripts
│   ├── test_*.py              # unit tests for the Python checks
│   └── site/                  # Skills Explorer logic and headless-browser tests
├── .github/workflows/         # validate (every PR), pages (site deploy), release (on tags)
├── website/                   # Skills Explorer (GitHub Pages); data.js and docs.js are generated
└── <agent>/agent-project-setup/   # generated per-agent templates (13)
    ├── AGENTS.md | CLAUDE.md
    ├── setup-<agent>.sh
    ├── .<agent>/rules/
    ├── <skills dir>/          # default skills
    └── packs/<pack>/          # optional packs (ai, backend, languages, …, web)
```

Skills, rules, and installers inside `<agent>/agent-project-setup/` are generated. Edit the canonical files, then sync.

## ✍️ Contributing a skill

1. Copy `templates/skill-skeleton/` to `skills/<your-skill>/` and set `name:` to the folder name. Use only [Agent Skills spec](https://agentskills.io/specification) frontmatter fields; extras such as `version` go under `metadata:`.
2. Add the skill to `manifest.yaml` with a group, category, and icon. Choose the group by this rule: **default** (`core`) only if the skill is useful in nearly every software project, whatever the language or platform (ways of working, quality, testing, security, git, CI, docs, writing); otherwise the **pack** for its language, platform, stack or domain. Prefer an existing pack; a new pack needs at least two skills unless the domain clearly stands alone. If the skill shares ground with an existing one, add the pair to `scripts/skill-neighbours.yaml`.
3. Add it to the matching table in this README.
4. Run `python3 scripts/sync_templates.py` and `python3 scripts/build_site_data.py`, then every command in [Validation](#-validation). `check_skill_descriptions.py` is the one most likely to fail for a new skill: the description needs a "Use when …" clause, and "(use other-skill)" pointers must name real skills.

## 🧪 Validation

GitHub Actions runs these on every pull request. It validates the manifest and all 56 canonical skills, checks that every template copy and the website data match their sources, checks that every skill description says when to use it and keeps its neighbour skills linked, runs the unit tests, checks for private machine and account references, lints and syntax-checks every shell script, smoke-tests every installer in a temporary home directory, and runs the Skills Explorer's logic and browser tests. Run the same checks locally before opening a pull request:

```bash
python3 -m pip install PyYAML
python3 scripts/validate_templates.py
python3 scripts/sync_templates.py --check
python3 scripts/build_site_data.py --check
python3 scripts/check_skill_descriptions.py
python3 -m unittest discover -s tests -p "test_*.py"
python3 scripts/check_public_sanitization.py
bash tests/smoke_installers.sh
node --test tests/site/*.test.mjs   # Node 22+; browser tests use Chromium/Chrome if found (or CHROME_BIN) and skip otherwise
```

The installer smoke tests and `update-skills.sh` need the clone's full git history (not a shallow clone).

## ⬆️ Upgrading from an earlier version

To bring installed skills up to date after pulling, use `scripts/update-skills.sh` (see [Keep installed skills up to date](#keep-installed-skills-up-to-date)). Re-running an installer also works, but it replaces customised skills too (keeping a backup).

Earlier installers wrote a few files that no agent reads. The installers never delete anything, so remove these yourself if they are present:

- Claude: `settings.json` at the project root (the installer prints a note if it finds the old one). Settings now live in `.claude/settings.json`.
- Codex: `.codex/skills/` (skills now live in `.agents/skills/`).
- Copilot: `.copilot/skills/` (skills now live in `.github/skills/`).
- Ollama: `.ollama/skills/` (Ollama is now rules-only).

## 🔖 Releases and versions

The catalog has one version, `vMAJOR.MINOR.PATCH`, listed in [CHANGELOG.md](CHANGELOG.md) and on the [releases page](https://github.com/cybercoretech/cybercore-agent-skills/releases). Each skill also keeps its own `metadata.version`.

| Bump | When |
|---|---|
| **Major** | An existing install or habit breaks: a skill removed or renamed, a skill moved from the default into a pack, an installer option removed |
| **Minor** | Something is added: a skill, a pack, an agent, a script feature |
| **Patch** | Fixes and wording only |

To stay on a release instead of `main`, check out its tag and update your installed skills from there (`update-skills.sh` works from any checkout and prints which version you are on):

```bash
git -C ~/cybercore-agent-skills fetch --tags
git -C ~/cybercore-agent-skills checkout v1.0.0
bash ~/cybercore-agent-skills/scripts/update-skills.sh all
```

Maintainers: a release is a pull request that moves the `Unreleased` notes under a dated version heading, then a pushed tag (`git tag v1.1.0 && git push origin v1.1.0`). The release workflow checks the tag against CHANGELOG.md, re-runs every check, and publishes the GitHub Release.

## 🛡️ Safety

Installers do not delete target content. Existing managed files are backed up before replacement. Review agent rules and permissions before using them in a production repository; agent capabilities and behavior vary by provider and version.

## 📄 License

MIT. See [LICENSE](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ by the CyberCore agent ecosystem</sub>
</div>
