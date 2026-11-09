# AI Agent Project Setup

This directory contains project-level guardrail templates for 13 AI coding agents. Each agent has its own subfolder with an `agent-project-setup/` template that can be deployed into any target repository.

## Agent Templates

| Agent | Home Dir | Project Template | Setup Script |
|-------|----------|-----------------|--------------|
| **OpenCode** | `~/.config/opencode/` | `opencode/agent-project-setup/` | `setup-agent.sh` |
| **Claude** | `~/.claude/` | `claude/agent-project-setup/` | `setup-claude.sh` |
| **Codex** | `~/.codex/` | `codex/agent-project-setup/` | `setup-codex.sh` |
| **Copilot** | `~/.copilot/` | `copilot/agent-project-setup/` | `setup-copilot.sh` |
| **Crush** | `~/.crush/` | `crush/agent-project-setup/` | `setup-crush.sh` |
| **Gemini** | `~/.gemini/` | `gemini/agent-project-setup/` | `setup-gemini.sh` |
| **Hermes** | `~/.hermes/` | `hermes/agent-project-setup/` | `setup-hermes.sh` |
| **Kimi-Code** | `~/.kimi-code/` | `kimi-code/agent-project-setup/` | `setup-kimi-code.sh` |
| **OpenClaw** | `~/.openclaw/` | `openclaw/agent-project-setup/` | `setup-openclaw.sh` |
| **Ollama** | `~/.ollama/` | `ollama/agent-project-setup/` | `setup-ollama.sh` |
| **Pi** | `~/.pi/` | `pi/agent-project-setup/` | `setup-pi.sh` |
| **Ori** | `~/.ori/` | `ori/agent-project-setup/` | `setup-ori.sh` |
| **Qwen** | `~/.qwen/` | `qwen/agent-project-setup/` | `setup-qwen.sh` |

## What Each Template Contains

Every `agent-project-setup/` folder includes:

| File | Purpose |
|------|---------|
| `AGENTS.md` (or `CLAUDE.md` for Claude) | Agent guardrails & execution policy |
| `.<agent>/rules/safety.md` | Absolute negative constraints (destructive commands, secrets, etc.) |
| `.<agent>/rules/workflow.md` | Development workflow & execution standards |
| `.<agent>/rules/rust.md` | Rust development standards |
| `.<agent>/rules/gleam.md` | Gleam development standards |
| `.<agent>/skills/web-design-and-frontend-craft/SKILL.md` | Frontend/web design skill |
| `setup-<agent>.sh` | Deploy script to copy guardrails into a target repo |

## How to Deploy to a Project

1. **Navigate to your target repository:**

   ```bash
   cd /path/to/your/project
   ```

2. **Run the setup script for your agent:**

   ```bash
   # OpenCode
   bash ~/Projects/ai/opencode/agent-project-setup/setup-agent.sh

   # Claude
   bash ~/Projects/ai/claude/agent-project-setup/setup-claude.sh

   # Codex
   bash ~/Projects/ai/codex/agent-project-setup/setup-codex.sh

   # Copilot
   bash ~/Projects/ai/copilot/agent-project-setup/setup-copilot.sh

   # Crush
   bash ~/Projects/ai/crush/agent-project-setup/setup-crush.sh

   # Gemini
   bash ~/Projects/ai/gemini/agent-project-setup/setup-gemini.sh

   # Hermes
   bash ~/Projects/ai/hermes/agent-project-setup/setup-hermes.sh

   # Kimi-Code
   bash ~/Projects/ai/kimi-code/agent-project-setup/setup-kimi-code.sh

   # OpenClaw
   bash ~/Projects/ai/openclaw/agent-project-setup/setup-openclaw.sh

   # Ollama
   bash ~/Projects/ai/ollama/agent-project-setup/setup-ollama.sh

   # Pi
   bash ~/Projects/ai/pi/agent-project-setup/setup-pi.sh

   # Ori
   bash ~/Projects/ai/ori/agent-project-setup/setup-ori.sh

   # Qwen
   bash ~/Projects/ai/qwen/agent-project-setup/setup-qwen.sh
   ```

3. **Restart your agent session** in the target directory to load the new rules.

## What Gets Copied

Each setup script copies:

- `AGENTS.md` / `CLAUDE.md` → Root of target repo (agent instructions & guardrails)
- `.<agent>/rules/*.md` → `.<agent>/rules/` in target repo (permission & safety rules)
- `.<agent>/skills/web-design-and-frontend-craft/` → `.<agent>/skills/` in target repo (frontend skill)

## Rule Format by Agent

| Agent | Rule Format | File Extension |
|-------|-------------|----------------|
| OpenCode | Markdown guardrails | `.md` |
| Claude | Markdown guardrails | `.md` |
| Codex | `prefix_rule(pattern=[...], decision="allow\|deny")` | `.md` |
| Copilot | Markdown guardrails | `.md` |
| Crush | Markdown guardrails | `.md` |
| Gemini | Markdown guardrails | `.md` |
| Hermes | Markdown guardrails | `.md` |
| Kimi-Code | Markdown guardrails | `.md` |
| OpenClaw | Markdown guardrails | `.md` |
| Ollama | Markdown guardrails | `.md` |
| Pi | Markdown guardrails | `.md` |
| Ori | Markdown guardrails | `.md` |
| Qwen | Markdown guardrails | `.md` |

All rule files use `.md` for consistency across agents. Codex's `prefix_rule()` syntax is preserved inside the markdown files.

## Sign-off

All commits made under these guardrails should end with:

```
👻 Code & Design by Darkstardevx 🤖 Generated with [Agent Name]

Co-Authored-By: <Agent> <noreply@agent-domain.com>
```

## Directory Structure

```
Projects/ai/
├── claude/
│   └── agent-project-setup/
├── codex/
│   └── agent-project-setup/
├── copilot/
│   └── agent-project-setup/
├── crush/
│   └── agent-project-setup/
├── gemini/
│   └── agent-project-setup/
├── hermes/
│   └── agent-project-setup/
├── kimi-code/
│   └── agent-project-setup/
├── openclaw/
│   └── agent-project-setup/
├── ollama/
│   └── agent-project-setup/
├── opencode/
│   └── agent-project-setup/
├── ori/
│   └── agent-project-setup/
├── pi/
│   └── agent-project-setup/
└── qwen/
    └── agent-project-setup/
```
