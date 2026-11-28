#!/usr/bin/env bash
# Deploy the Gemini CLI project guardrails from this template directory.
#
# GENERATED FILE: edit templates/setup.sh.in and manifest.yaml, then run
# `python3 scripts/sync_templates.py`. Do not edit this copy by hand.
set -euo pipefail

AGENT="gemini"
AGENT_NAME="Gemini CLI"
INSTRUCTIONS="AGENTS.md"
RULES_DIR=".gemini/rules"
SKILLS_DIR=".gemini/skills" # empty: rules-only template
ROOT_FILES=()
KEEP_FILES=()
PACK_INFO=('ai|LLM features, agent prompts and skills, MCP servers, and agent and skill evaluation.' 'backend|HTTP APIs, databases and SQL.' 'languages|Python, TypeScript and Node.js, Zig, Lua, and Qt with C++.' 'mobile|Native Android and cross-platform mobile apps.' 'office|Word, Excel, PowerPoint and PDF documents.' 'omarchy|Omarchy desktop operations, Lua config, plugins and themes, Hyprland and Wayland theming, and Rust tooling for Omarchy.' 'ops|Containers, Linux administration, observability and incident response, plus Cloudflare DNS and Workers as code, forge mirroring, daemon packaging, firewall rules, CI build matrices and privacy audits.' 'rust|Rust libraries and applications, from architecture and async to testing, UI and releases, plus supply-chain checks, error and async guardrails, TUI architecture, allocation profiling and parser testing.' 'terminal|Command-line UX, terminal keybindings, glyph styling, and man pages and README references generated from CLI flags.' 'web|Building and auditing web interfaces, accessibility, browser checks and localization, plus CSS layout and motion, neon palettes, design tokens and self-hosted fonts.' 'workflow|Architectural decision records, atomic Conventional Commits and Keep a Changelog releases.') # "pack|description" for --list-packs
MARKER_PREFIX="<!-- cybercore-agent-skills:"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
TEMPLATE_DIR="$SCRIPT_DIR"
TARGET_DIR="$HOME"

usage() {
  cat <<EOF
Usage: $(basename -- "$0") [--with PACK[,PACK...]]... [--list-packs] [--help]

Install the $AGENT_NAME rules and the default skills into your home directory ($HOME).

  --with PACKS   Also install optional skill packs: one name, a comma list
                 (--with rust,web) or 'all'. Repeatable.
  --list-packs   List the optional skill packs available for $AGENT_NAME
  -h, --help     Show this help

Existing managed files are backed up under
\${XDG_STATE_HOME:-\$HOME/.local/state}/cybercore-agent-skills/backups/ before they are replaced.
EOF
}

list_packs() {
  local found=0 pack name count info desc
  if [[ -n "$SKILLS_DIR" && -d "$TEMPLATE_DIR/packs" ]]; then
    for pack in "$TEMPLATE_DIR"/packs/*/; do
      [[ -d "$pack" ]] || continue
      name="$(basename -- "$pack")"
      count="$(find "$pack" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
      desc=""
      for info in ${PACK_INFO[@]+"${PACK_INFO[@]}"}; do
        [[ "${info%%|*}" == "$name" ]] && desc="${info#*|}"
      done
      printf '%-10s %2s skill%s  %s\n' "$name" "$count" "$([[ "$count" -eq 1 ]] || printf s)" "$desc"
      found=1
    done
    [[ "$found" -eq 1 ]] && printf '\nInstall with --with <pack>, --with pack1,pack2 or --with all.\n'
  fi
  if [[ "$found" -eq 0 ]]; then printf 'No optional packs for %s.\n' "$AGENT_NAME"; fi
}

# Adds packs from a --with value: one name, a comma list, or "all".
add_packs() {
  local value="$1" pack
  local -a parts=()
  if [[ "$value" == "all" ]]; then
    for pack in "$TEMPLATE_DIR"/packs/*/; do
      [[ -d "$pack" ]] && PACKS+=("$(basename -- "$pack")")
    done
    return
  fi
  IFS=',' read -r -a parts <<<"$value"
  for pack in "${parts[@]}"; do
    [[ -n "$pack" ]] && PACKS+=("$pack")
  done
}

PACKS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --with)
      if [[ $# -lt 2 || -z "$2" ]]; then
        printf 'ERROR: --with needs a pack name.\n' >&2
        exit 2
      fi
      add_packs "$2"
      shift 2
      ;;
    --with=*)
      add_packs "${1#--with=}"
      shift
      ;;
    --list-packs) list_packs; exit 0 ;;
    -h|--help) usage; exit 0 ;;
    *)
      printf 'ERROR: Unknown argument: %s\n\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$TARGET_DIR" == "$TEMPLATE_DIR" ]]; then
  printf "ERROR: Clone directory cannot be your home directory.\n" >&2
  exit 1
fi

if [[ ! -f "$TEMPLATE_DIR/$INSTRUCTIONS" || ! -d "$TEMPLATE_DIR/$RULES_DIR" ]]; then
  printf "ERROR: Template is incomplete: %s\n" "$TEMPLATE_DIR" >&2
  exit 1
fi
if [[ -n "$SKILLS_DIR" && ! -d "$TEMPLATE_DIR/$SKILLS_DIR" ]]; then
  printf "ERROR: Template is incomplete (missing %s): %s\n" "$SKILLS_DIR" "$TEMPLATE_DIR" >&2
  exit 1
fi
for file in ${ROOT_FILES[@]+"${ROOT_FILES[@]}"} ${KEEP_FILES[@]+"${KEEP_FILES[@]}"}; do
  if [[ ! -f "$TEMPLATE_DIR/$file" ]]; then
    printf "ERROR: Template is incomplete (missing %s): %s\n" "$file" "$TEMPLATE_DIR" >&2
    exit 1
  fi
done

for pack in ${PACKS[@]+"${PACKS[@]}"}; do
  if [[ -z "$SKILLS_DIR" ]]; then
    printf "ERROR: %s is a rules-only template and has no skill packs.\n" "$AGENT_NAME" >&2
    exit 2
  fi
  if [[ ! "$pack" =~ ^[a-z0-9][a-z0-9-]*$ || ! -d "$TEMPLATE_DIR/packs/$pack" ]]; then
    printf "ERROR: Unknown pack '%s'. Available packs:\n" "$pack" >&2
    list_packs >&2
    exit 2
  fi
done

# Warn when the root instruction file belongs to another agent template.
if [[ -f "$TARGET_DIR/$INSTRUCTIONS" ]]; then
  existing_marker="$(head -n 1 -- "$TARGET_DIR/$INSTRUCTIONS")"
  if [[ "$existing_marker" == "$MARKER_PREFIX"* && "$existing_marker" != "$MARKER_PREFIX $AGENT -->" ]]; then
    other="${existing_marker#"$MARKER_PREFIX "}"
    other="${other% -->}"
    printf "WARNING: %s was installed by the '%s' template and will be replaced with the %s version.\n" "$INSTRUCTIONS" "$other" "$AGENT_NAME" >&2
    printf "         The previous file is kept in the backup below.\n" >&2
  fi
fi

# Back up every managed path that already exists before merging or replacing it.
MANAGED=("$INSTRUCTIONS" "$RULES_DIR")
if [[ -n "$SKILLS_DIR" ]]; then MANAGED+=("$SKILLS_DIR"); fi
MANAGED+=(${ROOT_FILES[@]+"${ROOT_FILES[@]}"} ${KEEP_FILES[@]+"${KEEP_FILES[@]}"})

STAMP="$(date +%Y%m%d-%H%M%S)-$$"
BACKUP_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/${TARGET_DIR##*/}-$(printf '%s' "$TARGET_DIR" | cksum | awk '{print $1}')/$AGENT/$STAMP"
BACKUP_NEEDED=0
for item in "${MANAGED[@]}"; do
  if [[ -e "$TARGET_DIR/$item" ]]; then BACKUP_NEEDED=1; break; fi
done
if [[ "$BACKUP_NEEDED" -eq 1 ]]; then
  for item in "${MANAGED[@]}"; do
    if [[ -e "$TARGET_DIR/$item" ]]; then
      mkdir -p "$BACKUP_DIR/$(dirname -- "$item")"
      cp -a "$TARGET_DIR/$item" "$BACKUP_DIR/$item"
    fi
  done
  printf "BACKUP: Existing target files saved to %s\n" "$BACKUP_DIR"
fi

cp -a "$TEMPLATE_DIR/$INSTRUCTIONS" "$TARGET_DIR/$INSTRUCTIONS"
for file in ${ROOT_FILES[@]+"${ROOT_FILES[@]}"}; do
  mkdir -p "$TARGET_DIR/$(dirname -- "$file")"
  cp -a "$TEMPLATE_DIR/$file" "$TARGET_DIR/$file"
done
mkdir -p "$TARGET_DIR/$RULES_DIR"
cp -a "$TEMPLATE_DIR/$RULES_DIR/." "$TARGET_DIR/$RULES_DIR/"
if [[ -n "$SKILLS_DIR" ]]; then
  mkdir -p "$TARGET_DIR/$SKILLS_DIR"
  cp -a "$TEMPLATE_DIR/$SKILLS_DIR/." "$TARGET_DIR/$SKILLS_DIR/"
  for pack in ${PACKS[@]+"${PACKS[@]}"}; do
    cp -a "$TEMPLATE_DIR/packs/$pack/." "$TARGET_DIR/$SKILLS_DIR/"
    printf "PACK: Installed optional '%s' skills\n" "$pack"
  done
fi
for file in ${KEEP_FILES[@]+"${KEEP_FILES[@]}"}; do
  if [[ ! -e "$TARGET_DIR/$file" ]]; then
    mkdir -p "$TARGET_DIR/$(dirname -- "$file")"
    cp -a "$TEMPLATE_DIR/$file" "$TARGET_DIR/$file"
  elif ! cmp -s "$TEMPLATE_DIR/$file" "$TARGET_DIR/$file"; then
    printf "NOTE: Kept your existing %s. Compare it with %s to merge the template settings.\n" "$file" "$TEMPLATE_DIR/$file"
  fi
done

printf "\nSUCCESS: %s guardrails installed in %s\n" "$AGENT_NAME" "$TARGET_DIR"
printf 'NOTE: Agent Skills are experimental in some Gemini CLI versions; enable them in settings if /skills list is empty.\n'
printf "Restart your agent session to load the new rules and skills.\n"
