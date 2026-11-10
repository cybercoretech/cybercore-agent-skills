# Setup Guide

This distribution contains 13 agent templates and 11 shared skills. Each template is in `<agent>/agent-project-setup/`.

## Install

1. Clone or download this repository.
2. Change to the project you want to configure.
3. Run the matching setup script, for example:

```bash
cd /path/to/your/project
bash /path/to/cybercore-agent-skills/claude/agent-project-setup/setup-claude.sh
```

Choose the corresponding agent directory and script for your tool. All public installers, including OpenCode, deploy project-level configuration. They locate template files relative to the script, so the repository can be stored anywhere.

Before replacing existing managed files, the installer backs them up outside the project under `${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/`, organized by project path, agent, and timestamp. It merges rules and skills and does not delete unrelated files. Review the resulting files before committing them.

## Contents

Each template contains a root instruction file (`AGENTS.md`, or `CLAUDE.md` for Claude), four rules (`safety`, `workflow`, `rust`, and `gleam`), and these 11 skills:

- `android-development`
- `api-backend`
- `container-devops`
- `git-workflow`
- `qt-cpp-desktop`
- `rust-development`
- `security-guidelines`
- `shell-scripting`
- `system-administration`
- `testing-qa`
- `web-design-and-frontend-craft`

## Validate

```bash
python3 -m pip install PyYAML
python3 scripts/validate_templates.py
python3 scripts/check_public_sanitization.py
bash tests/smoke_installers.sh
```
