# Setup Guide

This distribution contains 13 agent templates. Twelve install 38 default skills plus an opt-in 4-skill Omarchy pack; Ollama installs rules only. Each template is in `<agent>/agent-project-setup/`.

## Install

1. Clone or download this repository.
2. Run your agent's setup script from anywhere:
   ```bash
   bash ~/cybercore-agent-skills/claude/agent-project-setup/setup-claude.sh
   ```

Options (every installer):

| Option | Effect |
|---|---|
| `--with omarchy` | Also install the opt-in Omarchy skill pack |
| `--list-packs` | List optional packs for this agent |
| `-h`, `--help` | Show usage |

All installers deploy into your home directory and locate their template files relative to the script, so the repository can be stored anywhere. OpenCode's installer is `setup-agent.sh`; the others are `setup-<agent>.sh`.

Before replacing existing managed files, the installer backs them up under `${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/`, organized by home folder, agent, and timestamp. It merges rules and skills and does not delete unrelated files. Review the resulting files.

## What gets installed

| Agent | Root file | Rules | Skills | Extra |
|---|---|---|---|---|
| Claude | `CLAUDE.md` | `~/.claude/rules/` | `~/.claude/skills/` | `.claude/settings.json` (only if absent) |
| Codex | `AGENTS.md` | `~/.codex/rules/` | `~/.agents/skills/` | `.codex/rules/default.rules` |
| GitHub Copilot | `AGENTS.md` | `~/.copilot/rules/` | `~/.github/skills/` | |
| Crush | `AGENTS.md` | `~/.crush/rules/` | `~/.crush/skills/` | |
| Gemini CLI | `AGENTS.md` | `~/.gemini/rules/` | `~/.gemini/skills/` | |
| Hermes | `AGENTS.md` | `~/.hermes/rules/` | `~/.hermes/skills/` | |
| Kimi Code | `AGENTS.md` | `~/.kimi-code/rules/` | `~/.kimi-code/skills/` | |
| Ollama | `AGENTS.md` | `~/.ollama/rules/` | — | |
| OpenClaw | `AGENTS.md` | `~/.openclaw/rules/` | `~/.openclaw/skills/` | |
| OpenCode | `AGENTS.md` | `~/.opencode/rules/` | `~/.opencode/skills/` | `opencode.json` |
| Ori | `AGENTS.md` | `~/.ori/rules/` | `~/.ori/skills/` | |
| Pi | `AGENTS.md` | `~/.pi/rules/` | `~/.pi/skills/` | |
| Qwen Code | `AGENTS.md` | `~/.qwen/rules/` | `~/.qwen/skills/` | |

The rules are `safety`, `workflow`, `rust`, and `gleam`. See the README for the full skill list.

## After installing

Some agents may need a one-time step before they load the rules or skills. The installer prints it:

- **Codex:** if `~/.codex/rules/default.rules` is not applied, mark your home directory as trusted in Codex.
- **Gemini CLI:** if `/skills list` is empty, enable Agent Skills in your settings.
- **Hermes:** if the skills are not listed, run `hermes skills trust ~`.
- **OpenClaw:** if the skills are not listed, add `~/.openclaw/skills` to `skills.load.extraDirs` in `~/.openclaw/openclaw.json`.
- **Ori:** skill discovery is unverified; confirm Ori lists the skills.

Restart your agent session afterwards.

## Validate

```bash
python3 -m pip install PyYAML
python3 scripts/validate_templates.py
python3 scripts/check_public_sanitization.py
bash tests/smoke_installers.sh
```
