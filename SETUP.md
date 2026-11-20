# Setup Guide

This distribution contains 13 agent templates. Twelve install 18 default skills, with 38 more in 9 optional domain packs (`--with`); Ollama installs rules only. Each template is in `<agent>/agent-project-setup/`.

## Install

1. Clone or download this repository.
2. Run your agent's setup script from anywhere:
   ```bash
   bash ~/cybercore-agent-skills/claude/agent-project-setup/setup-claude.sh
   ```

Options (every installer):

| Option | Effect |
|---|---|
| `--with PACKS` | Also install optional skill packs: one (`--with rust`), a comma list (`--with rust,web`) or `all` |
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

## Updating

Pull the clone, then check your installed skills and rules against it:

```bash
git -C ~/cybercore-agent-skills pull
bash ~/cybercore-agent-skills/scripts/update-skills.sh all            # report only
bash ~/cybercore-agent-skills/scripts/update-skills.sh all --apply    # update and add new skills
bash ~/cybercore-agent-skills/scripts/update-skills.sh all --apply --prune   # also clear removed skills
```

| Status | Meaning | With `--apply` |
|---|---|---|
| `UPDATE` | The installed copy matches an older version from this repo | Replaced; the old copy goes to the backup folder |
| `NEW` | In the catalog (or an installed pack) but not installed | Installed |
| `CUSTOMISED` | Matches no version this repo ever published | Never changed; compare it with the `diff` command shown |
| `REMOVED` | Was in the catalog, has since been removed | Moved to the backup folder only with `--prune` |

Skills that were never part of this repo are listed as not managed and left alone. The script needs the clone's full git history and never uses the network. It exits 0 when nothing needs doing and 1 when updates are available, so it also works in scripts.

## Validate

```bash
python3 -m pip install PyYAML
python3 scripts/validate_templates.py
python3 scripts/check_public_sanitization.py
bash tests/smoke_installers.sh
```
