#!/usr/bin/env bash
# Deploy OpenCode project configuration, rules, and skills into the current project.
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
TEMPLATE_DIR="$SCRIPT_DIR"
TARGET_DIR="$(pwd -P)"
if [[ "$TARGET_DIR" == "$TEMPLATE_DIR" ]]; then
  printf "ERROR: Run this script from the project you want to configure.\n" >&2
  exit 1
fi
if [[ ! -f "$TEMPLATE_DIR/AGENTS.md" || ! -f "$TEMPLATE_DIR/opencode.json" || ! -d "$TEMPLATE_DIR/.opencode/rules" || ! -d "$TEMPLATE_DIR/.opencode/skills" ]]; then
  printf "ERROR: OpenCode project template is incomplete: %s\n" "$TEMPLATE_DIR" >&2
  exit 1
fi
STAMP="$(date +%Y%m%d-%H%M%S)-$$"
BACKUP_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/${TARGET_DIR##*/}-$(printf '%s' "$TARGET_DIR" | cksum | awk '{print $1}')/opencode/$STAMP"
if [[ -e "$TARGET_DIR/AGENTS.md" || -e "$TARGET_DIR/opencode.json" || -e "$TARGET_DIR/.opencode" ]]; then
  mkdir -p "$BACKUP_DIR"
  for item in AGENTS.md opencode.json .opencode; do
    if [[ -e "$TARGET_DIR/$item" ]]; then cp -a "$TARGET_DIR/$item" "$BACKUP_DIR/"; fi
  done
  printf "BACKUP: Existing OpenCode project files saved to %s\n" "$BACKUP_DIR"
fi
cp -a "$TEMPLATE_DIR/AGENTS.md" "$TARGET_DIR/AGENTS.md"
cp -a "$TEMPLATE_DIR/opencode.json" "$TARGET_DIR/opencode.json"
mkdir -p "$TARGET_DIR/.opencode/rules" "$TARGET_DIR/.opencode/skills"
cp -a "$TEMPLATE_DIR/.opencode/rules/." "$TARGET_DIR/.opencode/rules/"
cp -a "$TEMPLATE_DIR/.opencode/skills/." "$TARGET_DIR/.opencode/skills/"
printf "\nSUCCESS: OpenCode project configuration installed in %s\n" "$TARGET_DIR"
printf "Restart OpenCode in this project to load the rules and skills.\n"
