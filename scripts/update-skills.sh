#!/usr/bin/env bash
# Check, and optionally update, the skills and rules installed in your home
# directory against this clone. Compares each installed copy with every
# version in the clone's git history, so it can tell an out-of-date copy
# (safe to update) from one you customised (never touched).
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"

usage() {
  cat <<EOF
Usage: update-skills.sh <agent|all> [--apply [--prune]]

Report which installed skills and rules in your home directory ($HOME) are
up to date, out of date, customised, new or removed upstream. Changes
nothing unless you pass --apply.

  --apply   Update out-of-date skills and rules and install new ones.
            Customised copies are never changed.
  --prune   With --apply, also move skills and rules that were removed
            upstream out of the agent's folders (only unmodified copies).

Every replaced or pruned copy is moved to
\${XDG_STATE_HOME:-\$HOME/.local/state}/cybercore-agent-skills/backups/ first.
Run 'git pull' in this clone first: this script never uses the network.

Exit status: 0 nothing to do, 1 updates available (report mode), 2 usage error.
EOF
}

die() { printf 'ERROR: %s\n' "$*" >&2; exit "${2:-1}"; }
usage_error() { printf 'ERROR: %s\n\n' "$*" >&2; usage >&2; exit 2; }

APPLY=0
PRUNE=0
TARGET=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --apply) APPLY=1 ;;
    --prune) PRUNE=1 ;;
    -*) usage_error "Unknown option: $1" ;;
    *)
      [[ -z "$TARGET" ]] || usage_error "Only one agent (or 'all') may be given."
      TARGET="$1"
      ;;
  esac
  shift
done
[[ -n "$TARGET" ]] || usage_error "Name an agent, or 'all'."
[[ "$PRUNE" -eq 0 || "$APPLY" -eq 1 ]] || usage_error "--prune only works together with --apply."

command -v git >/dev/null || die "git is required."
git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1 || die "$ROOT is not a git clone; the history is needed to recognise old versions."
if [[ "$(git -C "$ROOT" rev-parse --is-shallow-repository)" == "true" ]]; then
  die "This clone has no full history. Run: git -C $ROOT fetch --unshallow"
fi

AGENTS=()
for dir in "$ROOT"/*/agent-project-setup; do
  [[ -d "$dir" ]] && AGENTS+=("$(basename -- "$(dirname -- "$dir")")")
done
if [[ "$TARGET" == "all" ]]; then
  SELECTED=("${AGENTS[@]}")
else
  [[ "$TARGET" =~ ^[a-z0-9][a-z0-9-]*$ && -d "$ROOT/$TARGET/agent-project-setup" ]] \
    || usage_error "Unknown agent '$TARGET'. Available: ${AGENTS[*]} all"
  SELECTED=("$TARGET")
fi

field() { sed -n "s/^$2=\"\([^\"]*\)\".*/\1/p" "$1" | head -n 1; }
version_of() { sed -n 's/^  version: "\([^"]*\)".*/\1/p' "$1" 2>/dev/null | head -n 1; }
short() { # show paths under the home directory as ~/...
  if [[ "$1" == "$HOME"/* ]]; then printf '%s/%s' '~' "${1#"$HOME"/}"; else printf '%s' "$1"; fi
}

# Content fingerprint of an installed folder or file: one line per file,
# "relative-path blob-id", sorted, then hashed. Matches git's blob ids.
fp_installed() {
  local path="$1" files=() hashes=() i
  if [[ -f "$path" ]]; then
    printf '. %s\n' "$(git hash-object -- "$path")" | git hash-object --stdin
    return
  fi
  mapfile -d '' -t files < <(cd -- "$path" && find . -type f -print0 | LC_ALL=C sort -z)
  if [[ ${#files[@]} -gt 0 ]]; then
    mapfile -t hashes < <(cd -- "$path" && printf '%s\n' "${files[@]}" | git hash-object --stdin-paths)
  fi
  for i in "${!files[@]}"; do printf '%s %s\n' "${files[i]#./}" "${hashes[i]}"; done \
    | LC_ALL=C sort | git hash-object --stdin
}

# Same fingerprint for a repository path at a commit; empty if absent there.
fp_commit() {
  local commit="$1" path="$2" kind="$3" blob listing
  if [[ "$kind" == "rule" ]]; then
    blob="$(git -C "$ROOT" rev-parse --verify -q "$commit:$path" 2>/dev/null)" || return 0
    printf '. %s\n' "$blob" | git hash-object --stdin
    return
  fi
  listing="$(git -C "$ROOT" ls-tree -r "$commit" -- "$path/" | awk -F'\t' -v p="$path/" '{split($1, a, " "); print substr($2, length(p) + 1) " " a[3]}')"
  [[ -n "$listing" ]] || return 0
  printf '%s\n' "$listing" | LC_ALL=C sort | git hash-object --stdin
}

# Cached per repository path: the current fingerprint and every historic one.
declare -A CURRENT_FP=() HISTORY_FPS=()
load_history() {
  local path="$1" kind="$2" commit fp list=""
  [[ -n "${HISTORY_FPS[$path]+set}" ]] && return 0
  CURRENT_FP[$path]="$(fp_commit HEAD "$path" "$kind")"
  while IFS= read -r commit; do
    fp="$(fp_commit "$commit" "$path" "$kind")"
    [[ -n "$fp" ]] && list+="$fp"$'\n'
  done < <(git -C "$ROOT" log --format=%H -- "$path")
  HISTORY_FPS[$path]="$list"
}

# Prints current, old or custom.
classify() {
  local installed="$1" path="$2" kind="$3" fp
  load_history "$path" "$kind"
  fp="$(fp_installed "$installed")"
  if [[ -n "${CURRENT_FP[$path]}" && "$fp" == "${CURRENT_FP[$path]}" ]]; then echo current
  elif grep -qxF -- "$fp" <<<"${HISTORY_FPS[$path]}"; then echo old
  else echo custom
  fi
}

ever_in_repo() { [[ -n "$(git -C "$ROOT" log --format=%H -1 -- "$1")" ]]; }

STAMP="$(date +%Y%m%d-%H%M%S)-$$"
BACKUP_ROOT="${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/${HOME##*/}-$(printf '%s' "$HOME" | cksum | awk '{print $1}')"

PENDING=0
CHECKED=0
report() { printf '%-11s %-5s %s%s\n' "$1" "$2" "$3" "${4:-}"; }

backup_move() { # <installed path> <path relative to home>
  local dest="$BACKUP_ROOT/$AGENT/$STAMP/$2"
  mkdir -p "$(dirname -- "$dest")"
  mv -- "$1" "$dest"
}

check_agent() {
  AGENT="$1"
  local template="$ROOT/$AGENT/agent-project-setup" installer="" candidate
  for candidate in "$template"/setup-*.sh; do [[ -f "$candidate" ]] && installer="$candidate" && break; done
  [[ -n "$installer" ]] || return 0
  local name skills_dir rules_dir
  name="$(field "$installer" AGENT_NAME)"
  skills_dir="$(field "$installer" SKILLS_DIR)"
  rules_dir="$(field "$installer" RULES_DIR)"
  if [[ ! -d "$HOME/$rules_dir" && ( -z "$skills_dir" || ! -d "$HOME/$skills_dir" ) ]]; then
    printf '== %s (%s): not installed in %s\n\n' "${name:-$AGENT}" "$AGENT" "$(short "$HOME")"
    return 0
  fi
  CHECKED=$((CHECKED + 1))
  printf '== %s (%s)\n' "${name:-$AGENT}" "$AGENT"

  local up=0 stale=0 new=0 custom=0 removed=0 item status src installed
  local -a unmanaged=() expected_skills=() expected_rules=()
  declare -A expected_src=()

  # Expected skills: the default set, plus every pack that is at least partly installed.
  if [[ -n "$skills_dir" ]]; then
    for src in "$template/$skills_dir"/*/; do
      src="${src%/}"; expected_skills+=("${src##*/}"); expected_src[${src##*/}]="$src"
    done
    for candidate in "$template"/packs/*/; do
      [[ -d "$candidate" ]] || continue
      local pack_installed=0
      for src in "$candidate"*/; do [[ -d "$HOME/$skills_dir/$(basename -- "$src")" ]] && pack_installed=1; done
      [[ "$pack_installed" -eq 1 ]] || continue
      for src in "$candidate"*/; do
        src="${src%/}"; expected_skills+=("${src##*/}"); expected_src[${src##*/}]="$src"
      done
    done
  fi
  for src in "$template/$rules_dir"/*.md; do
    [[ -f "$src" ]] && expected_rules+=("${src##*/}")
  done

  handle() { # <kind> <name> <installed path> <template source> <repo path> <path relative to home>
    local kind="$1" item="$2" installed="$3" src="$4" repo_path="$5" rel="$6" status note=""
    if [[ ! -e "$installed" ]]; then
      new=$((new + 1)); PENDING=$((PENDING + 1))
      report NEW "$kind" "$item"
      if [[ "$APPLY" -eq 1 ]]; then
        mkdir -p "$(dirname -- "$installed")"; cp -a -- "$src" "$installed"; printf '            -> installed\n'
      fi
      return
    fi
    status="$(classify "$installed" "$repo_path" "$kind")"
    case "$status" in
      current) up=$((up + 1)) ;;
      old)
        stale=$((stale + 1)); PENDING=$((PENDING + 1))
        if [[ "$kind" == "skill" ]]; then
          local from to
          from="$(version_of "$installed/SKILL.md")"; to="$(version_of "$src/SKILL.md")"
          [[ -n "$from$to" ]] && note=" (v${from:-?} -> v${to:-?})"
        fi
        report UPDATE "$kind" "$item" "$note"
        if [[ "$APPLY" -eq 1 ]]; then
          backup_move "$installed" "$rel"; cp -a -- "$src" "$installed"; printf '            -> updated (old copy backed up)\n'
        fi
        ;;
      custom)
        custom=$((custom + 1))
        report CUSTOMISED "$kind" "$item" " (kept; compare: diff -ru $(short "$installed") $ROOT/$repo_path)"
        ;;
    esac
  }

  for item in ${expected_skills[@]+"${expected_skills[@]}"}; do
    handle skill "$item" "$HOME/$skills_dir/$item" "${expected_src[$item]}" "skills/$item" "$skills_dir/$item"
  done
  for item in ${expected_rules[@]+"${expected_rules[@]}"}; do
    handle rule "$item" "$HOME/$rules_dir/$item" "$template/$rules_dir/$item" "rules/$item" "$rules_dir/$item"
  done

  # Installed items the current template no longer has: removed upstream, or not ours.
  local kind dir pattern repo_prefix rel_dir
  for kind in skill rule; do
    if [[ "$kind" == "skill" ]]; then
      [[ -n "$skills_dir" && -d "$HOME/$skills_dir" ]] || continue
      dir="$HOME/$skills_dir"; pattern="*/"; repo_prefix="skills"; rel_dir="$skills_dir"
    else
      [[ -d "$HOME/$rules_dir" ]] || continue
      dir="$HOME/$rules_dir"; pattern="*.md"; repo_prefix="rules"; rel_dir="$rules_dir"
    fi
    for installed in "$dir"/$pattern; do
      [[ -e "$installed" ]] || continue
      installed="${installed%/}"; item="${installed##*/}"
      if [[ "$kind" == "skill" ]]; then
        [[ -n "${expected_src[$item]+set}" ]] && continue
        local in_pack=0
        for candidate in "$template"/packs/*/"$item"; do [[ -d "$candidate" ]] && in_pack=1; done
        [[ "$in_pack" -eq 1 ]] && continue   # an uninstalled pack's skill installed by hand: handled above when expected
      else
        [[ " ${expected_rules[*]+${expected_rules[*]}} " == *" $item "* ]] && continue
      fi
      if ! ever_in_repo "$repo_prefix/$item"; then unmanaged+=("$item"); continue; fi
      status="$(classify "$installed" "$repo_prefix/$item" "$kind")"
      if [[ "$status" == "custom" ]]; then
        custom=$((custom + 1))
        report REMOVED "$kind" "$item" " (removed upstream, but customised: kept)"
        continue
      fi
      removed=$((removed + 1)); PENDING=$((PENDING + 1))
      report REMOVED "$kind" "$item" " (no longer in the catalog; --apply --prune moves it to the backup)"
      if [[ "$APPLY" -eq 1 && "$PRUNE" -eq 1 ]]; then
        backup_move "$installed" "$rel_dir/$item"; printf '            -> moved to backup\n'
      fi
    done
  done

  printf 'Summary: %d up to date, %d out of date, %d new, %d customised (kept), %d removed upstream' "$up" "$stale" "$new" "$custom" "$removed"
  [[ ${#unmanaged[@]} -gt 0 ]] && printf ', %d not managed' "${#unmanaged[@]}"
  printf '\n'
  [[ ${#unmanaged[@]} -gt 0 ]] && printf 'Not managed by this repo (left alone): %s\n' "${unmanaged[*]}"
  printf '\n'
}

if upstream="$(git -C "$ROOT" rev-parse --abbrev-ref '@{u}' 2>/dev/null)"; then
  behind="$(git -C "$ROOT" rev-list --count "HEAD..@{u}")"
  if [[ "$behind" -gt 0 ]]; then
    printf 'NOTE: This clone is %d commit(s) behind %s (as of the last fetch). Run git pull in %s first.\n\n' "$behind" "$upstream" "$ROOT"
  fi
fi

for AGENT in "${SELECTED[@]}"; do check_agent "$AGENT"; done

if [[ "$CHECKED" -eq 0 ]]; then
  printf 'Nothing installed to check. Install with %s/<agent>/agent-project-setup/setup-<agent>.sh\n' "$ROOT"
  exit 0
fi
if [[ "$APPLY" -eq 1 ]]; then
  [[ "$PENDING" -gt 0 ]] && printf 'Done. Backups are in %s/<agent>/%s\nRestart your agent sessions to load the changes.\n' "$BACKUP_ROOT" "$STAMP"
  exit 0
fi
if [[ "$PENDING" -eq 0 ]]; then
  printf 'Everything is up to date.\n'
  exit 0
fi
printf 'Run again with --apply to update%s.\n' "$([[ "$PRUNE" -eq 1 ]] && printf '' || printf ' (add --prune to also clear removed items)')"
exit 1
