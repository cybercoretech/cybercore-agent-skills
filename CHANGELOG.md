# Changelog

All notable changes to the CyberCore Agent Skills catalog. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow the rule in the README's [Releases and versions](README.md#-releases-and-versions) section: **major** when an existing install or habit breaks, **minor** when something is added, **patch** for fixes and wording.

## [Unreleased]

## [1.1.0] - 2026-11-27

### Added

- 25 skills (81 in total). Default: `strict-scope-reviewer`, `root-cause-debugging` and `skill-router` (21 default skills).
- Web pack: `css-grid-motion-system`, `cyberpunk-neon-palette`, `design-token-theme-switcher`, `foss-font-bundler`.
- Ops pack: `cloudflare-dns-iac`, `forge-mirror-sync`, `linux-systemd-daemon-packager`, `network-firewall-rule-validator`, `cross-platform-ci-matrix-builder`, `offline-first-privacy-auditor`.
- Rust pack: `cargo-supply-chain-msrv-auditor`, `rust-idiomatic-error-async-guardrails`, `ratatui-layout-state-architect`, `zero-allocation-perf-profiler`, `compiler-lexer-test-harness`.
- Omarchy pack: `hyprland-wayland-theme-integrator`.
- New `terminal` pack: `posix-cli-ux-designer`, `terminal-keybinding-vim-nav`, `ansi-nerd-font-glyph-stylist`, `doc-manpage-builder`.
- New `workflow` pack: `adr-writer`, `conventional-commit-changelog`.
- 24 neighbour pairs in `scripts/skill-neighbours.yaml`, each linked by a "Not for … (use x)" line.
- Contributor Covenant code of conduct (`CODE_OF_CONDUCT.md`).

### Changed

- `web-design-and-frontend-craft` (version 4): a new "Commit to a direction" subsection steers away from the generic default look (habitual sans-serif, purple gradient on white, timid palettes, flat backgrounds). Adds typography pairing and weight-contrast guidance, font starting points by product character, a single orchestrated page-load reveal in motion, two matching anti-patterns, and a credit to Anthropic's "Prompting for frontend aesthetics" cookbook. The token example no longer uses Inter, and the Cybercore font stack now names JetBrains Mono.
- README: layout, validation and contributing sections brought up to date.

### Fixed

- `network-firewall-rule-validator`: the cron rollback no longer runs `crontab -r` (which deleted the whole crontab); it removes only its own `/etc/cron.d` drop-in.
- `linux-systemd-daemon-packager`: uninstall purge paths use `${APP:?}`, so an empty `APP` aborts instead of deleting `/var/lib/` or whole XDG folders.
- Site tests retry a failed browser start once and allow 60 seconds in CI.

## [1.0.0] - 2026-11-20

The first tagged release: the catalog as it stands after the 2026-11 overlap audit and packaging work.

### Added

- **13 agent templates** (Claude, Codex, GitHub Copilot, Crush, Gemini CLI, Hermes, Kimi Code, Ollama, OpenClaw, OpenCode, Ori, Pi, Qwen Code), each installing into the agent's own folders in your home directory, with backups of anything replaced.
- **56 skills**: 18 installed by default for every skills-capable agent, and 38 in nine optional packs (`ai`, `backend`, `languages`, `mobile`, `office`, `omarchy`, `ops`, `rust`, `web`). Install packs with `--with rust,web` or `--with all`; list them with `--list-packs`.
- **5 shared rule files** (`safety`, `workflow`, `concise-output`, `rust`, `gleam`).
- `scripts/install-skill.sh <agent> <skill>` installs a single skill.
- `scripts/update-skills.sh <agent|all> [--apply [--prune]]` keeps installed skills and rules current: it updates out-of-date copies, installs new skills, never touches customised copies, and only moves removed skills to the backup folder.
- **Skills Explorer** website (https://cybercoretech.github.io/cybercore-agent-skills/): search, skill and agent sheets, install commands, theme support.
- CI checks: manifest and template sync, skill description routing rules (`scripts/check_skill_descriptions.py`), installer smoke tests, shell linting, site logic and browser tests, public sanitization.

### Changed (compared with installs made before this release)

- **Breaking for re-installs:** the default install is now 18 skills; the other domain skills moved into packs. Run the installer with `--with all` to get the full catalog, or keep an existing install current with `update-skills.sh`, which keeps every pack you already have.
- 38 skill descriptions now say what each skill does, when to use it, and which neighbouring skill to use instead, so agents load the right one.

### Removed

- `security-hardening`, merged into `security-guidelines`. `update-skills.sh --apply --prune` moves an old copy to the backup folder.
