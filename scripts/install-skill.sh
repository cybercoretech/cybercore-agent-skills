#!/usr/bin/env bash
# Install one skill for one agent into your home directory, from this clone.
# The per-agent installers (<agent>/agent-project-setup/setup-*.sh) install
# everything; this installs a single skill and nothing else.
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"

usage() {
  cat <<EOF
Usage: install-skill.sh <agent> <skill>

Install one skill into the agent's skills folder in your home directory ($HOME).
Example: install-skill.sh claude rust-testing

An existing copy of the skill is backed up under
\${XDG_STATE_HOME:-\$HOME/.local/state}/cybercore-agent-skills/backups/ before it is replaced.
EOF
}

list_agents() {
  local dir
  for dir in "$ROOT"/*/agent-project-setup; do
    [[ -d "$dir" ]] && printf '  %s\n' "$(basename -- "$(dirname -- "$dir")")"
  done
}

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
esac
if [[ $# -ne 2 ]]; then
  usage >&2
  exit 2
fi

AGENT="$1"
SKILL="$2"
for value in "$AGENT" "$SKILL"; do
  if [[ ! "$value" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
    printf "ERROR: Invalid name: %s\n" "$value" >&2
    exit 2
  fi
done

TEMPLATE_DIR="$ROOT/$AGENT/agent-project-setup"
INSTALLER=""
for candidate in "$TEMPLATE_DIR"/setup-*.sh; do
  if [[ -f "$candidate" ]]; then INSTALLER="$candidate"; break; fi
done
if [[ -z "$INSTALLER" ]]; then
  printf "ERROR: Unknown agent '%s'. Available agents:\n" "$AGENT" >&2
  list_agents >&2
  exit 2
fi

# The agent's skills folder is defined once, in its generated installer.
SKILLS_DIR="$(sed -n 's/^SKILLS_DIR="\([^"]*\)".*/\1/p' "$INSTALLER" | head -n 1)"
if [[ -z "$SKILLS_DIR" ]]; then
  printf "ERROR: %s is a rules-only template and has no skills.\n" "$AGENT" >&2
  exit 2
fi

# Default skills live in the skills folder, opt-in skills in packs/<pack>/.
SOURCE=""
for candidate in "$TEMPLATE_DIR/$SKILLS_DIR/$SKILL" "$TEMPLATE_DIR"/packs/*/"$SKILL"; do
  if [[ -f "$candidate/SKILL.md" ]]; then SOURCE="$candidate"; break; fi
done
if [[ -z "$SOURCE" ]]; then
  printf "ERROR: Unknown skill '%s' for %s. See %s/skills for the list.\n" "$SKILL" "$AGENT" "$ROOT" >&2
  exit 2
fi

TARGET_DIR="$HOME"
SKILL_DIR="$TARGET_DIR/$SKILLS_DIR/$SKILL"

# Same backup location as the agent installers.
if [[ -e "$SKILL_DIR" ]]; then
  BACKUP_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/${TARGET_DIR##*/}-$(printf '%s' "$TARGET_DIR" | cksum | awk '{print $1}')/$AGENT/$(date +%Y%m%d-%H%M%S)-$$/$SKILLS_DIR/$SKILL"
  mkdir -p "$BACKUP_DIR"
  cp -a "$SKILL_DIR/." "$BACKUP_DIR/"
  printf "BACKUP: Existing skill saved to %s\n" "$BACKUP_DIR"
fi

mkdir -p "$SKILL_DIR"
cp -a "$SOURCE/." "$SKILL_DIR/"
printf "Installed %s for %s in %s\n" "$SKILL" "$AGENT" "$SKILL_DIR"
printf "Restart your agent session to load it.\n"
