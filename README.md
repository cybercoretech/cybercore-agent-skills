# CyberCore Agent Skills

Reusable guardrails, rules, and skills for 13 AI coding agents. Each template includes four shared rule files and 11 reusable skills, adapted to the configuration layout of its agent.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![13 agents](https://img.shields.io/badge/agents-13-purple)](#supported-agents)
[![11 skills](https://img.shields.io/badge/skills-11-green)](#included-skills)

## Supported agents

Claude, Codex, GitHub Copilot, Crush, Gemini CLI, Hermes, Kimi Code, Ollama, OpenClaw, OpenCode, Ori, Pi, and Qwen.

Each template is stored at `<agent>/agent-project-setup/` and contains the agent's root instruction file, four rules, 11 skills, and an installer.

## Quick start

Clone this repository, then run the installer for your agent from the project you want to configure:

```bash
git clone https://github.com/cybercoretech/cybercore-agent-skills.git
cd /path/to/your/project
bash /path/to/cybercore-agent-skills/codex/agent-project-setup/setup-codex.sh
```

Replace `codex` with the agent directory you use. The installer locates its source files relative to itself, so the repository can live anywhere. OpenCode is project-level in this public distribution and uses `opencode/agent-project-setup/setup-agent.sh`.

Installers merge rules and skills, preserve unrelated files, and back up existing template-managed files outside the project under `${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/`. Backups are organized by project path, agent, and timestamp. Review the generated files and backup before committing them to your project.

## Included skills

| Skill | Purpose |
|---|---|
| `android-development` | Android SDK, Gradle, APK signing, and device tooling |
| `api-backend` | API design, backend services, validation, and error handling |
| `container-devops` | Containers, CI/CD, and deployment workflows |
| `git-workflow` | Branches, commits, pull requests, and safe Git operations |
| `qt-cpp-desktop` | Qt 6, C++, QML, and desktop application development |
| `rust-development` | Cargo workspaces, MSRV, Rust APIs, and error handling |
| `security-guidelines` | Secrets, credentials, permissions, and secure defaults |
| `shell-scripting` | Bash/Zsh scripting, shell safety, and automation |
| `system-administration` | Linux administration, systemd, packages, and services |
| `testing-qa` | Unit, integration, UI, and CI testing practices |
| `web-design-and-frontend-craft` | UI/UX, CSS systems, accessibility, and frontend performance |

## Repository layout

```text
cybercore-agent-skills/
├── claude/agent-project-setup/
├── codex/agent-project-setup/
├── copilot/agent-project-setup/
├── crush/agent-project-setup/
├── gemini/agent-project-setup/
├── hermes/agent-project-setup/
├── kimi-code/agent-project-setup/
├── ollama/agent-project-setup/
├── openclaw/agent-project-setup/
├── opencode/agent-project-setup/
├── ori/agent-project-setup/
├── pi/agent-project-setup/
└── qwen/agent-project-setup/
```

## Validation

The repository's GitHub Actions workflow validates all 13 templates, parses all 143 skill frontmatter blocks, checks cross-agent skill parity, verifies shell syntax, and runs installer smoke tests in temporary directories.

Run locally:

```bash
python3 -m pip install PyYAML
python3 scripts/validate_templates.py
python3 scripts/check_public_sanitization.py
bash tests/smoke_installers.sh
```

## Safety

Installers do not delete target content. Existing managed files are backed up before replacement. Review agent rules and permissions before using them in a production repository; agent capabilities and behavior vary by provider and version.

## License

MIT. See [LICENSE](LICENSE).
