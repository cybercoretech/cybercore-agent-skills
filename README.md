# 🔒 CyberCore Agent Skills

Reusable guardrails, rules, and skills for 13 AI coding agents. Every skills-capable agent gets the same 38 default skills, an opt-in 4-skill Omarchy pack, and four shared rule files, adapted to the configuration layout that agent actually reads.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![13 agents](https://img.shields.io/badge/agents-13-purple)](#-supported-agents)
[![42 skills](https://img.shields.io/badge/skills-42-green)](#-included-skills)

## 🤖 Supported agents

Each template lives at `<agent>/agent-project-setup/` and installs into the project you run it from.

| Agent | Installer | Skills install to | Status |
|---|---|---|---|
| 🤖 Claude | `claude/agent-project-setup/setup-claude.sh` | `.claude/skills/` | ✅ Verified |
| 📓 Codex | `codex/agent-project-setup/setup-codex.sh` | `.agents/skills/` | ✅ Verified |
| 🤖 GitHub Copilot | `copilot/agent-project-setup/setup-copilot.sh` | `.github/skills/` | ✅ Verified |
| 💥 Crush | `crush/agent-project-setup/setup-crush.sh` | `.crush/skills/` | ✅ Verified |
| 💎 Gemini CLI | `gemini/agent-project-setup/setup-gemini.sh` | `.gemini/skills/` | ✅ Verified ¹ |
| 📬 Hermes | `hermes/agent-project-setup/setup-hermes.sh` | `.hermes/skills/` | ⚙️ One-time setup ² |
| 🤖 Kimi Code | `kimi-code/agent-project-setup/setup-kimi-code.sh` | `.kimi-code/skills/` | ✅ Verified |
| 🦙 Ollama | `ollama/agent-project-setup/setup-ollama.sh` | — | 📄 Rules only ³ |
| 🦷 OpenClaw | `openclaw/agent-project-setup/setup-openclaw.sh` | `.openclaw/skills/` | ⚙️ One-time setup ⁴ |
| 🦾 OpenCode | `opencode/agent-project-setup/setup-agent.sh` | `.opencode/skills/` | ✅ Verified |
| 🦉 Ori | `ori/agent-project-setup/setup-ori.sh` | `.ori/skills/` | 🧪 Unverified ⁵ |
| 🥧 Pi | `pi/agent-project-setup/setup-pi.sh` | `.pi/skills/` | ✅ Verified |
| 🤖 Qwen Code | `qwen/agent-project-setup/setup-qwen.sh` | `.qwen/skills/` | ✅ Verified |

1. Agent Skills are experimental in some Gemini CLI versions. If `/skills list` is empty, enable them in your Gemini settings.
2. Hermes loads project skills only from trusted projects. Run `hermes skills trust /path/to/project` once.
3. Ollama has no skills system, so this template installs `AGENTS.md` and the rules only.
4. OpenClaw does not scan project folders by default. Add `/path/to/project/.openclaw/skills` to `skills.load.extraDirs` in `~/.openclaw/openclaw.json`.
5. Ori's project skill discovery could not be confirmed from its documentation. Check that Ori lists the skills before you rely on them.

Rules install to `.<agent>/rules/`, and the root instruction file (`CLAUDE.md` for Claude, `AGENTS.md` for everyone else) tells the agent to read them. Codex also gets `.codex/rules/default.rules`, a command policy that Codex loads once you trust the project. Claude gets `.claude/settings.json` with matching allow and deny rules; it is installed only when the project has none.

## 🚀 Quick start

```bash
git clone https://github.com/cybercoretech/cybercore-agent-skills.git
cd /path/to/your/project
bash /path/to/cybercore-agent-skills/codex/agent-project-setup/setup-codex.sh
```

Replace `codex` with your agent's directory and script name from the table above. The installer finds its source files relative to itself, so the repository can live anywhere.

```bash
setup-codex.sh --with omarchy   # also install the opt-in Omarchy pack
setup-codex.sh --list-packs     # list optional packs
setup-codex.sh --help
```

Installers merge rules and skills, keep unrelated files, and back up every file they are about to replace to `${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/<project>-<id>/<agent>/<timestamp>/`. Review the generated files and the backup before you commit them.

> ⚠️ Codex, Copilot, Gemini, and most other agents share one root `AGENTS.md`. If you install two of these agents into the same project, the second installer replaces the first agent's `AGENTS.md` and prints a warning. The previous file is kept in the backup.

## 🧩 Included skills

### Core

| Skill | Purpose |
|---|---|
| 📱 `android-development` | Android SDK, Gradle, APK signing, and device tooling |
| 🔌 `api-backend` | API design, backend services, validation, and error handling |
| ☁️ `container-devops` | Containers, CI/CD, and deployment workflows |
| 🔀 `git-workflow` | Branches, commits, pull requests, and safe Git operations |
| 🖥️ `qt-cpp-desktop` | Qt 6, C++, QML, and desktop application development |
| 🦀 `rust-development` | Cargo workspaces, crates.io publishing, MSRV, and library error handling |
| 🔒 `security-guidelines` | Secrets, credentials, permissions, and secure defaults |
| 🐚 `shell-scripting` | Bash and Zsh scripting, shell safety, and automation |
| 🐧 `system-administration` | Linux administration, systemd, packages, and services |
| 🧪 `testing-qa` | Unit, integration, UI, and CI testing practices |
| 🎨 `web-design-and-frontend-craft` | UI/UX, CSS systems, accessibility, and frontend performance |

### General engineering

| Skill | Purpose |
|---|---|
| ♿ `accessibility-a11y` | Semantic HTML, keyboard support, ARIA, contrast, and a11y testing |
| 🔁 `ci-cd-pipelines` | GitHub Actions, reusable workflows, caching, matrices, and secrets |
| 🔍 `code-review-and-refactoring` | Review standards, constructive feedback, and safe refactoring |
| 🗄️ `database-and-sql` | Schema design, query safety, migrations, and data access |
| 📦 `dependency-and-supply-chain` | Lockfiles, vulnerability awareness, SBOMs, and supply-chain hygiene |
| 📝 `documentation-and-adrs` | READMEs, Architecture Decision Records, and knowledge capture |
| 🌐 `i18n-and-localization` | String extraction, locales, formatting, and RTL awareness |
| 🚨 `incident-response-basics` | Detection, triage, communication, rollback, and blameless follow-up |
| 🤖 `llm-application-patterns` | Prompt structure, tool use, evaluation, and safety for LLM features |
| 🌙 `lua-development` | Lua modules, error handling, performance, and testing |
| 📲 `mobile-cross-platform` | Flutter, React Native, and Kotlin Multiplatform |
| 🔭 `observability-and-debugging` | Structured logging, metrics, tracing, and systematic debugging |
| ⚡ `performance-optimization` | Measurement, complexity, caching, and hot-path optimization |
| 🧠 `prompt-engineering-for-agents` | Writing effective skills, rules, and system prompts |
| 🐍 `python-development` | Packaging, typing, async, testing, and tooling |
| 🛡️ `security-hardening` | Threat modeling, least privilege, authn/z, and input handling |
| 🟦 `typescript-nodejs` | Strict TypeScript, module systems, tooling, and testing |
| ⚙️ `zig-development` | `build.zig`, allocators, C interop, and testing |

### Rust applications

| Skill | Purpose |
|---|---|
| 🧭 `rust-applications` | Index that routes to the focused Rust application skills below |
| 🏗️ `rust-app-architecture` | Library-plus-binary layout, crate and module boundaries |
| ⏱️ `rust-async-tokio` | Tokio runtimes, cancellation, graceful shutdown, and timeouts |
| 🎛️ `rust-config-and-cli` | `clap`, config files, environment variables, XDG paths, dry runs |
| 📈 `rust-observability` | `tracing`, spans, `EnvFilter`, and redaction |
| 💾 `rust-persistence` | Atomic writes, SQLite, and ordered migrations |
| 🚀 `rust-release-and-cross-compile` | Release profiles, features, and cross-compilation |
| ✅ `rust-testing` | Integration, async, temp-dir, and property tests |
| 🪟 `rust-ui` | Choosing CLI, TUI (`ratatui`), or GUI, and building TUIs |

### Omarchy pack (opt-in: `--with omarchy`)

For [Omarchy](https://omarchy.org) (Arch Linux + Hyprland) desktops. Not installed by default.

| Skill | Purpose |
|---|---|
| 🛠️ `omarchy-agent-operations` | Safe agent changes to Omarchy settings, packages, and themes |
| 🎚️ `omarchy-lua-config` | Omarchy Lua configuration for Hyprland, bindings, and look-and-feel |
| 🧩 `omarchy-plugin-theme` | Omarchy plugins, themes, and menu integrations |
| 🔧 `rust-omarchy-tooling` | Rust CLIs and utilities built for Omarchy |

## 📁 Repository layout

```text
cybercore-agent-skills/
├── manifest.yaml              # agents, install paths, skill groups, packs
├── skills/<name>/SKILL.md     # canonical skills (edit here)
├── rules/<rule>.md            # canonical rules (edit here)
├── templates/
│   ├── setup.sh.in            # installer template for every agent
│   └── skill-skeleton/        # starting point for new skills
├── scripts/
│   ├── sync_templates.py      # copies skills/rules into templates, renders installers
│   ├── validate_templates.py
│   └── check_public_sanitization.py
├── tests/smoke_installers.sh
└── <agent>/agent-project-setup/   # generated per-agent templates (13)
    ├── AGENTS.md | CLAUDE.md
    ├── setup-<agent>.sh
    ├── .<agent>/rules/
    ├── <skills dir>/          # default skills
    └── packs/omarchy/         # opt-in pack
```

Skills, rules, and installers inside `<agent>/agent-project-setup/` are generated. Edit the canonical files, then sync.

## ✍️ Contributing a skill

1. Copy `templates/skill-skeleton/` to `skills/<your-skill>/` and set `name:` to the folder name. Use only [Agent Skills spec](https://agentskills.io/specification) frontmatter fields; extras such as `version` go under `metadata:`.
2. Add the skill to `manifest.yaml` with a group, category, and icon.
3. Add it to the matching table in this README.
4. Run `python3 scripts/sync_templates.py`, then the validation commands below.

## 🧪 Validation

GitHub Actions validates the manifest and all 42 canonical skills, checks that every template copy matches its source, lints and syntax-checks every installer, and smoke-tests each installer in a temporary project.

```bash
python3 -m pip install PyYAML
python3 scripts/validate_templates.py
python3 scripts/check_public_sanitization.py
bash tests/smoke_installers.sh
```

## ⬆️ Upgrading from an earlier version

Earlier installers wrote a few files that no agent reads. The new installers never delete anything, so remove these yourself if they are present:

- Claude: `settings.json` at the project root (the installer prints a note if it finds the old one). Settings now live in `.claude/settings.json`.
- Codex: `.codex/skills/` (skills now live in `.agents/skills/`).
- Copilot: `.copilot/skills/` (skills now live in `.github/skills/`).
- Ollama: `.ollama/skills/` (Ollama is now rules-only).

## 🛡️ Safety

Installers do not delete target content. Existing managed files are backed up before replacement. Review agent rules and permissions before using them in a production repository; agent capabilities and behavior vary by provider and version.

## 📄 License

MIT. See [LICENSE](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ by the CyberCore agent ecosystem</sub>
</div>
