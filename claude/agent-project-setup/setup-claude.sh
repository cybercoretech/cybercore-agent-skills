#!/usr/bin/env bash
# Deploy the claude project guardrails from this template directory.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
TEMPLATE_DIR="$SCRIPT_DIR"
TARGET_DIR="$(pwd -P)"

if [[ "$TARGET_DIR" == "$TEMPLATE_DIR" ]]; then
  printf "ERROR: Run this script from the project you want to configure.\n" >&2
  exit 1
fi

if [[ ! -f "$TEMPLATE_DIR/CLAUDE.md" || ! -d "$TEMPLATE_DIR/.claude/rules" || ! -d "$TEMPLATE_DIR/.claude/skills" ]]; then
  printf "ERROR: Template is incomplete: %s\n" "$TEMPLATE_DIR" >&2
  exit 1
fi

# Preserve existing files before merging or replacing template content.
STAMP="$(date +%Y%m%d-%H%M%S)-$$"
BACKUP_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/${TARGET_DIR##*/}-$(printf '%s' "$TARGET_DIR" | cksum | awk '{print $1}')/claude/$STAMP"
BACKUP_NEEDED=0
for item in "CLAUDE.md" ".claude" "settings.json"; do
  if [[ -e "$TARGET_DIR/$item" ]]; then BACKUP_NEEDED=1; break; fi
done

if [[ "$BACKUP_NEEDED" -eq 1 ]]; then
  mkdir -p "$BACKUP_DIR"
  for item in "CLAUDE.md" ".claude" "settings.json"; do
    if [[ -e "$TARGET_DIR/$item" ]]; then cp -a "$TARGET_DIR/$item" "$BACKUP_DIR/"; fi
  done
  printf "BACKUP: Existing target files saved to %s\n" "$BACKUP_DIR"
fi

cp -a "$TEMPLATE_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md"
cp -a "$TEMPLATE_DIR/settings.json" "$TARGET_DIR/settings.json"
mkdir -p "$TARGET_DIR/.claude/rules" "$TARGET_DIR/.claude/skills"
cp -a "$TEMPLATE_DIR/.claude/rules/." "$TARGET_DIR/.claude/rules/"
cp -a "$TEMPLATE_DIR/.claude/skills/." "$TARGET_DIR/.claude/skills/"

printf "\nSUCCESS: claude guardrails installed in %s\n" "$TARGET_DIR"
printf "Restart your agent session to load the new rules and skills.\n"
