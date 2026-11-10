#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
agents=(claude codex copilot crush gemini hermes kimi-code ollama openclaw opencode ori pi qwen)
for agent in "${agents[@]}"; do
  template="$ROOT/$agent/agent-project-setup"
  script=("$template"/setup-*.sh)
  hidden=".$agent"
  target="$TMP/project-$agent"
  mkdir -p "$target/$hidden/skills/existing-skill"
  printf 'user-owned content\n' > "$target/$hidden/skills/existing-skill/KEEP.txt"
  if [[ "$agent" == claude ]]; then rootfile=CLAUDE.md; else rootfile=AGENTS.md; fi
  printf 'user-owned root config\n' > "$target/$rootfile"
  (cd "$target" && bash "${script[0]}") >/dev/null
  [[ -f "$target/$hidden/skills/android-development/SKILL.md" ]]
  [[ -f "$target/$hidden/skills/api-backend/SKILL.md" ]]
  [[ -f "$target/$hidden/rules/safety.md" ]]
  [[ -f "$target/$hidden/skills/existing-skill/KEEP.txt" ]]
  [[ ! -d "$target/$hidden/skills/skills" ]]
  backup_root="${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/${target##*/}-$(printf '%s' "$target" | cksum | awk '{print $1}')/$agent"
  [[ -d "$backup_root" ]]
  grep -Rqs 'user-owned root config' "$backup_root"
  (cd "$target" && bash "${script[0]}") >/dev/null
  [[ -f "$target/$hidden/skills/existing-skill/KEEP.txt" ]]
  echo "PASS: $agent project installer"
done
echo 'All installer smoke tests passed.'
