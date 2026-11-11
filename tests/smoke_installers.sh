#!/usr/bin/env bash
# Smoke-test every agent installer in throwaway projects.
# Requires python3 with PyYAML (reads manifest.yaml). Writes nothing outside a temp dir.
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
# Keep installer backups inside the temp dir instead of the real state directory.
export XDG_STATE_HOME="$TMP/state"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

# One line per agent: agent|instructions|rules_dir|skills_dir|script|keep_files
AGENTS=()
while IFS= read -r line; do AGENTS+=("$line"); done < <(python3 - "$ROOT/manifest.yaml" <<'EOF'
import sys, yaml
m = yaml.safe_load(open(sys.argv[1], encoding="utf-8"))
for agent, s in m["agents"].items():
    print("|".join([agent, s["instructions"], s["rules_dir"], s.get("skills_dir") or "",
                    s["script"], ",".join(s.get("keep_files", []))]))
EOF
)
[[ ${#AGENTS[@]} -gt 0 ]] || fail "no agents read from manifest.yaml"

# One sample skill per default group, one from the opt-in pack.
DEFAULT_SAMPLES=(android-development python-development rust-testing)
PACK=omarchy
PACK_SAMPLE=omarchy-lua-config

for row in "${AGENTS[@]}"; do
  IFS='|' read -r agent instructions rules_dir skills_dir script keep_files <<<"$row"
  installer="$ROOT/$agent/agent-project-setup/$script"
  target="$TMP/project-$agent"
  mkdir -p "$target"
  printf 'user-owned root config\n' > "$target/$instructions"
  if [[ -n "$skills_dir" ]]; then
    mkdir -p "$target/$skills_dir/existing-skill"
    printf 'user-owned content\n' > "$target/$skills_dir/existing-skill/KEEP.txt"
  fi

  bash "$installer" --help >/dev/null || fail "$agent: --help failed"
  if (cd "$target" && bash "$installer" --bogus >/dev/null 2>&1); then fail "$agent: unknown argument accepted"; fi

  # Default install.
  (cd "$target" && bash "$installer") >/dev/null || fail "$agent: default install failed"
  head -n 1 "$target/$instructions" | grep -qx "<!-- cybercore-agent-skills: $agent -->" || fail "$agent: $instructions not installed"
  [[ -f "$target/$rules_dir/safety.md" ]] || fail "$agent: rules not installed"
  if find "$target" -name skill-skeleton | grep -q .; then fail "$agent: skill-skeleton installed"; fi

  backup_root="$XDG_STATE_HOME/cybercore-agent-skills/backups/${target##*/}-$(printf '%s' "$target" | cksum | awk '{print $1}')/$agent"
  [[ -d "$backup_root" ]] || fail "$agent: no backup created"
  grep -Rqs 'user-owned root config' "$backup_root" || fail "$agent: root instruction file not backed up"

  if [[ -n "$skills_dir" ]]; then
    for skill in "${DEFAULT_SAMPLES[@]}"; do
      [[ -f "$target/$skills_dir/$skill/SKILL.md" ]] || fail "$agent: default skill $skill missing"
    done
    [[ ! -e "$target/$skills_dir/$PACK_SAMPLE" ]] || fail "$agent: pack skill installed without --with"
    [[ -f "$target/$skills_dir/existing-skill/KEEP.txt" ]] || fail "$agent: user skill removed"

    # Opt-in pack, re-run (idempotent, still preserves user content).
    (cd "$target" && bash "$installer" --with "$PACK") >/dev/null || fail "$agent: --with $PACK failed"
    [[ -f "$target/$skills_dir/$PACK_SAMPLE/SKILL.md" ]] || fail "$agent: pack skill missing after --with"
    [[ -f "$target/$skills_dir/existing-skill/KEEP.txt" ]] || fail "$agent: user skill removed on re-run"
    if (cd "$target" && bash "$installer" --with no-such-pack >/dev/null 2>&1); then fail "$agent: unknown pack accepted"; fi
  else
    if find "$target" -name SKILL.md | grep -q .; then fail "$agent: rules-only template installed skills"; fi
    if (cd "$target" && bash "$installer" --with "$PACK" >/dev/null 2>&1); then fail "$agent: rules-only accepted --with"; fi
  fi

  # Files installed only when absent (Claude settings).
  if [[ -n "$keep_files" ]]; then
    IFS=',' read -r -a keeps <<<"$keep_files"
    for keep in "${keeps[@]}"; do
      [[ -f "$target/$keep" ]] || fail "$agent: $keep not installed"
      printf '{"user": true}\n' > "$target/$keep"
      (cd "$target" && bash "$installer") >/dev/null || fail "$agent: re-run failed"
      grep -q '"user": true' "$target/$keep" || fail "$agent: existing $keep was overwritten"
    done
  fi
  [[ "$agent" != claude || ! -e "$target/settings.json" ]] || fail "claude: root settings.json written"

  echo "PASS: $agent project installer"
done

# Installing a second agent over another agent's AGENTS.md warns (and still succeeds).
shared="$TMP/project-shared"
mkdir -p "$shared"
(cd "$shared" && bash "$ROOT/codex/agent-project-setup/setup-codex.sh") >/dev/null 2>&1
warn="$(cd "$shared" && bash "$ROOT/gemini/agent-project-setup/setup-gemini.sh" 2>&1 >/dev/null)"
grep -q "installed by the 'codex' template" <<<"$warn" || fail "no warning when replacing another agent's AGENTS.md"
echo "PASS: AGENTS.md ownership warning"

echo 'All installer smoke tests passed.'
