# 🔒 blackbox-agent-skills

> Internal agent guardrails, rules, and skills for Cybercore AI coding agents — OpenCode, Claude, Codex, Copilot, Crush, Gemini, Hermes, Kimi-Code, OpenClaw, Ollama, Pi, Ori, and Qwen.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![13 Agents](https://img.shields.io/badge/Agents-13-purple)](https://github.com/cybercoretech/blackbox-agent-skills)
[![10 Skills](https://img.shields.io/badge/Skills-10-green)](https://github.com/cybercoretech/blackbox-agent-skills/tree/main)
[![Private](https://img.shields.io/badge/Visibility-Private-red)](https://github.com/cybercoretech/blackbox-agent-skills)

---

> **Internal build.** Contains personal/local paths (`~/android`, `~/.config/opencode/`, `<PHONE_SERIAL>`) and device-specific references. For the public version, see [cybercoretech/cybercore-agent-skills](https://github.com/cybercoretech/cybercore-agent-skills).

---

## 📦 What's Inside

Each agent has its own project template under `Projects/ai/<agent>/agent-project-setup/` containing guardrails, rules, and skills that can be deployed into any target repository.

| Agent | Home Dir | Template Dir | Setup Script |
|-------|----------|-------------|--------------|
| 🦾 **OpenCode** | `~/.config/opencode/` | `opencode/agent-project-setup/` | `setup-agent.sh` |
| 🤖 **Claude** | `~/.claude/` | `claude/agent-project-setup/` | `setup-claude.sh` |
| 📓 **Codex** | `~/.codex/` | `codex/agent-project-setup/` | `setup-codex.sh` |
| 🤖 **Copilot** | `~/.copilot/` | `copilot/agent-project-setup/` | `setup-copilot.sh` |
| 💥 **Crush** | `~/.crush/` | `crush/agent-project-setup/` | `setup-crush.sh` |
| 💎 **Gemini** | `~/.gemini/` | `gemini/agent-project-setup/` | `setup-gemini.sh` |
| 📬 **Hermes** | `~/.hermes/` | `hermes/agent-project-setup/` | `setup-hermes.sh` |
| 🌙 **Kimi-Code** | `~/.kimi-code/` | `kimi-code/agent-project-setup/` | `setup-kimi-code.sh` |
| 🦷 **OpenClaw** | `~/.openclaw/` | `openclaw/agent-project-setup/` | `setup-openclaw.sh` |
| 🦙 **Ollama** | `~/.ollama/` | `ollama/agent-project-setup/` | `setup-ollama.sh` |
| 🥧 **Pi** | `~/.pi/` | `pi/agent-project-setup/` | `setup-pi.sh` |
| 🦉 **Ori** | `~/.ori/` | `ori/agent-project-setup/` | `setup-ori.sh` |
| 👂 **Qwen** | `~/.qwen/` | `qwen/agent-project-setup/` | `setup-qwen.sh` |

---

## 🧩 Skills (10 Total)

Each agent template includes the same 10 skills in its `.<agent>/skills/` directory:

| Skill | ID | Description |
|-------|-----|-------------|
| 🎨 **Web Design & Frontend Craft** | `web-design-and-frontend-craft` | UI/UX direction, CSS custom properties, neon/cyber aesthetics, component systems, accessibility, performance |
| 🐧 **System Administration** | `system-administration` | Arch Linux, Omarchy, systemd, package management, user services, dotfiles |
| 🐚 **Shell Scripting** | `shell-scripting` | Zsh, preexec/precmd hooks, ZLE widgets, keybindings, safe command execution |
| 🔀 **Git Workflow** | `git-workflow` | Commit conventions, branch strategies, PR hygiene, safe Git operations |
| 🔒 **Security Guidelines** | `security-guidelines` | Secret handling, credential management, SSH/GPG keys, secure IPC |
| 🧪 **Testing & QA** | `testing-qa` | Rust, shell, Qt/QML, Astro testing standards, CI/CD verification |
| 🦀 **Rust Development** | `rust-development` | Cargo workspaces, crates.io publishing, MSRV compliance, error handling |
| 🖥️ **Qt/C++ Desktop** | `qt-cpp-desktop` | Qt6/C++, QML, Quickshell/Omarchy plugins, qmake6 |
| 📱 **Android Development** | `android-development` | Gradle, APK signing, Android CLI tooling |
| ☁️ **Container & DevOps** | `container-devops` | Docker, GitHub Actions, CI/CD, Cloudflare Pages |

---

## 🚀 Quick Start

Deploy an agent's guardrails into any target repository:

```bash
cd /path/to/your/project
bash ~/Projects/ai/<agent>/agent-project-setup/setup-<agent>.sh
```

**Example — deploying Claude guardrails:**

```bash
cd ~/my-project
bash ~/Projects/ai/claude/agent-project-setup/setup-claude.sh
```

Each setup script copies:
- `AGENTS.md` (or `CLAUDE.md` for Claude) — agent instructions & guardrails
- `.<agent>/rules/*.md` — permission & safety rules
- `.<agent>/skills/` — reusable agent skills

Then restart your agent session in the target directory to load the new rules.

---

## 📁 Repository Structure

```
Projects/ai/
├── claude/
│   └── agent-project-setup/
│       ├── CLAUDE.md
│       ├── settings.json
│       ├── setup-claude.sh
│       └── .claude/
│           ├── rules/
│           │   ├── safety.md
│           ├── workflow.md
│           ├── rust.md
│           └── gleam.md
│           └── skills/
│               ├── web-design-and-frontend-craft/
│               │   └── SKILL.md
│               ├── system-administration/
│               │   └── SKILL.md
│               ├── shell-scripting/
│               │   └── SKILL.md
│               ├── git-workflow/
│               │   └── SKILL.md
│               ├── security-guidelines/
│               │   └── SKILL.md
│               ├── testing-qa/
│               │   └── SKILL.md
│               ├── rust-development/
│               │   └── SKILL.md
│               ├── qt-cpp-desktop/
│               │   └── SKILL.md
│               ├── android-development/
│               │   └── SKILL.md
│               └── container-devops/
│                   └── SKILL.md
├── codex/
│   └── agent-project-setup/
│       ├── AGENTS.md
│       ├── setup-codex.sh
│       └── .codex/
│           ├── rules/
│           └── skills/
├── copilot/
│   └── agent-project-setup/
│       ├── AGENTS.md
│       ├── setup-copilot.sh
│       └── .copilot/
│           ├── rules/
│           └── skills/
├── crush/
│   └── agent-project-setup/
│       ├── AGENTS.md
│       ├── setup-crush.sh
│       └── .crush/
│           ├── rules/
│           └── skills/
├── gemini/
│   └── agent-project-setup/
│       ├── AGENTS.md
│       ├── setup-gemini.sh
│       └── .gemini/
│           ├── rules/
│           └── skills/
├── hermes/
│   └── agent-project-setup/
│       ├── AGENTS.md
│       ├── setup-hermes.sh
│       └── .hermes/
│           ├── rules/
│           └── skills/
├── kimi-code/
│   └── agent-project-setup/
│       ├── AGENTS.md
│       ├── setup-kimi-code.sh
│       └── .kimi-code/
│           ├── rules/
│           └── skills/
├── openclaw/
│   └── agent-project-setup/
│       ├── AGENTS.md
│       ├── setup-openclaw.sh
│       └── .openclaw/
│           ├── rules/
│           └── skills/
├── ollama/
│   └── agent-project-setup/
│       ├── AGENTS.md
│       ├── setup-ollama.sh
│       └── .ollama/
│           ├── rules/
│           └── skills/
├── pi/
│   └── agent-project-setup/
│       ├── AGENTS.md
│       ├── setup-pi.sh
│       └── .pi/
│           ├── rules/
│           └── skills/
├── ori/
│   └── agent-project-setup/
│       ├── AGENTS.md
│       ├── setup-ori.sh
│       └── .ori/
│           ├── rules/
│           └── skills/
├── qwen/
│   └── agent-project-setup/
│       ├── AGENTS.md
│       └── .qwen/
│           ├── rules/
│           └── skills/
└── opencode/
    └── agent-project-setup/
        ├── AGENTS.md
        ├── setup-agent.sh
        └── .opencode/
            ├── rules/
            └── skills/
```

---

## 🛡️ Golden Rules (All Agents)

1. **Zero Unapproved Destructive Actions** — Never edit code, overwrite files, or run state-modifying terminal commands without presenting a concise execution plan and obtaining explicit user confirmation.
2. **No Rogue Bug-Fixing Loops** — If a build fails or a test errors out, STOP immediately. Explain the error directly to the user. Do NOT attempt recursive auto-fix attempts without permission.
3. **Preserve Existing Architecture** — Do not rewrite whole functions, refactor files, or change library dependencies unless explicitly instructed to do so.

---

## 📜 Commit Attribution

All commits made under these guardrails should end with:

```
👻 Code & Design by Darkstardevx 🤖 Generated with <Agent Name>

Co-Authored-By: <Agent> <noreply@agent-domain.com>
```

**Developer credit line:** `darkstardevx [dsdx.code@cybercoretech.net]`

**Email:** For cybercoretech repos, `git config user.email` must be `19244308+darkstardevx@users.noreply.github.com`.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🔗 Related

- [Cybercore Tech](https://cybercoretech.github.io/) — Main org site
- [Cybercore Framework](https://github.com/cybercoretech/cybercore) — Shared schemas, themes, design tokens
- [vdb-rs](https://github.com/cybercoretech/vdb-rs) — Embedded Rust vector database

---

<div align="center">
  <sub>Built with ❤️ by the Cybercore agent ecosystem</sub>
</div>
