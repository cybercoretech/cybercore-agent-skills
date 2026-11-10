#!/usr/bin/env bash
# Deploy the codex project guardrails from this template directory.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
TEMPLATE_DIR="$SCRIPT_DIR"
TARGET_DIR="$(pwd -P)"

if [[ "$TARGET_DIR" == "$TEMPLATE_DIR" ]]; then
  printf "ERROR: Run this script from the project you want to configure.\n" >&2
  exit 1
fi

if [[ ! -f "$TEMPLATE_DIR/AGENTS.md" || ! -d "$TEMPLATE_DIR/.codex/rules" || ! -d "$TEMPLATE_DIR/.codex/skills" ]]; then
  printf "ERROR: Template is incomplete: %s\n" "$TEMPLATE_DIR" >&2
  exit 1
fi

# Preserve existing files before merging or replacing template content.
STAMP="$(date +%Y%m%d-%H%M%S)-$$"
BACKUP_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/${TARGET_DIR##*/}-$(printf '%s' "$TARGET_DIR" | cksum | awk '{print $1}')/codex/$STAMP"
BACKUP_NEEDED=0
for item in "AGENTS.md" ".codex"; do
  if [[ -e "$TARGET_DIR/$item" ]]; then BACKUP_NEEDED=1; break; fi
done

if [[ "$BACKUP_NEEDED" -eq 1 ]]; then
  mkdir -p "$BACKUP_DIR"
  for item in "AGENTS.md" ".codex"; do
    if [[ -e "$TARGET_DIR/$item" ]]; then cp -a "$TARGET_DIR/$item" "$BACKUP_DIR/"; fi
  done
  printf "BACKUP: Existing target files saved to %s\n" "$BACKUP_DIR"
fi

cp -a "$TEMPLATE_DIR/AGENTS.md" "$TARGET_DIR/AGENTS.md"
mkdir -p "$TARGET_DIR/.codex/rules" "$TARGET_DIR/.codex/skills"
cp -a "$TEMPLATE_DIR/.codex/rules/." "$TARGET_DIR/.codex/rules/"
cp -a "$TEMPLATE_DIR/.codex/skills/." "$TARGET_DIR/.codex/skills/"

printf "\nSUCCESS: codex guardrails installed in %s\n" "$TARGET_DIR"
printf "Restart your agent session to load the new rules and skills.\n"
