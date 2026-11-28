#!/usr/bin/env bash
# Smoke-test every agent installer.
# Installers now write to $HOME, so we redirect HOME to a temp dir.
# Requires python3 with PyYAML (reads manifest.yaml).
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export HOME="$TMP/home"
mkdir -p "$HOME"
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

# Sample skills: default ones, and one from a pack.
DEFAULT_SAMPLES=(clarify-before-building testing-qa git-workflow)
PACK=omarchy
PACK_SAMPLE=omarchy-lua-config

for row in "${AGENTS[@]}"; do
  IFS='|' read -r agent instructions rules_dir skills_dir script keep_files <<<"$row"
  installer="$ROOT/$agent/agent-project-setup/$script"

  bash "$installer" --help >/dev/null || fail "$agent: --help failed"
  if bash "$installer" --bogus >/dev/null 2>&1; then fail "$agent: unknown argument accepted"; fi

  # Pre-seed existing files to test backup and preservation.
  printf 'user-owned root config\n' > "$HOME/$instructions"
  if [[ -n "$skills_dir" ]]; then
    mkdir -p "$HOME/$skills_dir/existing-skill"
    printf 'user-owned content\n' > "$HOME/$skills_dir/existing-skill/KEEP.txt"
  fi

  # Default install (writes to $HOME).
  bash "$installer" >/dev/null || fail "$agent: default install failed"
  head -n 1 "$HOME/$instructions" | grep -qx "<!-- cybercore-agent-skills: $agent -->" || fail "$agent: $instructions not installed"
  [[ -f "$HOME/$rules_dir/safety.md" ]] || fail "$agent: rules not installed"
  if find "$HOME" -name skill-skeleton | grep -q .; then fail "$agent: skill-skeleton installed"; fi

  backup_root="$XDG_STATE_HOME/cybercore-agent-skills/backups/${HOME##*/}-$(printf '%s' "$HOME" | cksum | awk '{print $1}')/$agent"
  [[ -d "$backup_root" ]] || fail "$agent: no backup created"
  grep -Rqs 'user-owned root config' "$backup_root" || fail "$agent: root instruction file not backed up"

  if [[ -n "$skills_dir" ]]; then
    for skill in "${DEFAULT_SAMPLES[@]}"; do
      [[ -f "$HOME/$skills_dir/$skill/SKILL.md" ]] || fail "$agent: default skill $skill missing"
    done
    [[ ! -e "$HOME/$skills_dir/$PACK_SAMPLE" ]] || fail "$agent: pack skill installed without --with"
    [[ -f "$HOME/$skills_dir/existing-skill/KEEP.txt" ]] || fail "$agent: user skill removed"

    # Opt-in pack, re-run (idempotent, still preserves user content).
    bash "$installer" --with "$PACK" >/dev/null || fail "$agent: --with $PACK failed"
    [[ -f "$HOME/$skills_dir/$PACK_SAMPLE/SKILL.md" ]] || fail "$agent: pack skill missing after --with"
    [[ -f "$HOME/$skills_dir/existing-skill/KEEP.txt" ]] || fail "$agent: user skill removed on re-run"
    if bash "$installer" --with no-such-pack >/dev/null 2>&1; then fail "$agent: unknown pack accepted"; fi
    if bash "$installer" --with rust,no-such-pack >/dev/null 2>&1; then fail "$agent: unknown pack in a list accepted"; fi
    [[ ! -e "$HOME/$skills_dir/rust-testing" ]] || fail "$agent: rust pack installed without --with rust"

    # Several packs in one flag, then everything.
    bash "$installer" --with rust,web >/dev/null || fail "$agent: --with rust,web failed"
    [[ -f "$HOME/$skills_dir/rust-testing/SKILL.md" && -f "$HOME/$skills_dir/browser-verification/SKILL.md" ]] \
      || fail "$agent: --with rust,web missed a pack"
    [[ ! -e "$HOME/$skills_dir/office-documents" ]] || fail "$agent: --with rust,web installed another pack"
    bash "$installer" --with all >/dev/null || fail "$agent: --with all failed"
    installed="$(find "$HOME/$skills_dir" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l)"
    expected="$(find "$ROOT/skills" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l)"
    [[ "$installed" -eq "$expected" ]] || fail "$agent: --with all installed $installed skills, expected $expected"
    packs="$(bash "$installer" --list-packs)"
    grep -Eq '^rust +15 skills' <<<"$packs" || fail "$agent: --list-packs missing counts: $packs"
  else
    if find "$HOME" -name SKILL.md | grep -q .; then fail "$agent: rules-only template installed skills"; fi
    if bash "$installer" --with "$PACK" >/dev/null 2>&1; then fail "$agent: rules-only accepted --with"; fi
  fi

  # Files installed only when absent (Claude settings).
  if [[ -n "$keep_files" ]]; then
    IFS=',' read -r -a keeps <<<"$keep_files"
    for keep in "${keeps[@]}"; do
      [[ -f "$HOME/$keep" ]] || fail "$agent: $keep not installed"
      printf '{"user": true}\n' > "$HOME/$keep"
      bash "$installer" >/dev/null || fail "$agent: re-run failed"
      grep -q '"user": true' "$HOME/$keep" || fail "$agent: existing $keep was overwritten"
    done
  fi
  [[ "$agent" != claude || ! -e "$HOME/settings.json" ]] || fail "claude: root settings.json written"

  echo "PASS: $agent home installer"
done

# Installing a second agent over another agent's AGENTS.md warns (and still succeeds).
bash "$ROOT/codex/agent-project-setup/setup-codex.sh" >/dev/null 2>&1
warn="$(bash "$ROOT/gemini/agent-project-setup/setup-gemini.sh" 2>&1 >/dev/null)"
grep -q "installed by the 'codex' template" <<<"$warn" || fail "no warning when replacing another agent's AGENTS.md"
echo "PASS: AGENTS.md ownership warning"

# Single-skill installer: one skill, nothing else, into a fresh home.
export HOME="$TMP/home-single"
mkdir -p "$HOME"
single="$ROOT/scripts/install-skill.sh"
bash "$single" --help >/dev/null || fail "install-skill: --help failed"
bash "$single" claude rust-testing >/dev/null || fail "install-skill: default skill failed"
cmp -s "$HOME/.claude/skills/rust-testing/SKILL.md" "$ROOT/skills/rust-testing/SKILL.md" || fail "install-skill: default skill content differs"
[[ "$(find "$HOME" -name SKILL.md | wc -l)" -eq 1 ]] || fail "install-skill: installed more than one skill"
[[ ! -e "$HOME/CLAUDE.md" && ! -e "$HOME/.claude/rules" ]] || fail "install-skill: installed rules or instructions"
bash "$single" opencode "$PACK_SAMPLE" >/dev/null || fail "install-skill: pack skill failed"
[[ -f "$HOME/.opencode/skills/$PACK_SAMPLE/SKILL.md" ]] || fail "install-skill: pack skill missing"
printf 'user edit\n' > "$HOME/.claude/skills/rust-testing/SKILL.md"
bash "$single" claude rust-testing >/dev/null || fail "install-skill: re-run failed"
grep -Rqs 'user edit' "$XDG_STATE_HOME/cybercore-agent-skills/backups" || fail "install-skill: existing skill not backed up"
if bash "$single" claude no-such-skill >/dev/null 2>&1; then fail "install-skill: unknown skill accepted"; fi
if bash "$single" no-such-agent rust-testing >/dev/null 2>&1; then fail "install-skill: unknown agent accepted"; fi
if bash "$single" ollama rust-testing >/dev/null 2>&1; then fail "install-skill: rules-only agent accepted"; fi
if bash "$single" claude ../rules >/dev/null 2>&1; then fail "install-skill: path traversal accepted"; fi
if bash "$single" claude >/dev/null 2>&1; then fail "install-skill: missing argument accepted"; fi
echo "PASS: single-skill installer"

# Update checker: tells stale, customised, new, removed and unmanaged skills apart.
export HOME="$TMP/home-update"
mkdir -p "$HOME"
upd="$ROOT/scripts/update-skills.sh"
# A full install (--with all) matches what everyone had before the catalog was split into packs.
bash "$ROOT/claude/agent-project-setup/setup-claude.sh" --with all >/dev/null || fail "update: base install failed"
SK="$HOME/.claude/skills"
# Write an old revision of a canonical path from git history into the home directory.
restore_old() { # <commit> <repo path> <destination>
  local commit="$1" path="$2" dest="$3" file
  mkdir -p "$dest"
  while IFS= read -r file; do
    mkdir -p "$dest/$(dirname -- "${file#"$path"/}")"
    git -C "$ROOT" show "$commit:$file" > "$dest/${file#"$path"/}"
  done < <(git -C "$ROOT" ls-tree -r --name-only "$commit" -- "$path")
}
out="$(bash "$upd" claude)" || fail "update: fresh install not reported up to date (exit $?): $out"
grep -q 'Everything is up to date' <<<"$out" || fail "update: fresh install summary missing: $out"
grep -Eq '^Catalog: (v[0-9]+\.[0-9]+\.[0-9]+|unreleased)' <<<"$out" || fail "update: catalog version line missing: $out"

old_clarify="$(git -C "$ROOT" log --format=%H -- skills/clarify-before-building | sed -n 2p)"
[[ -n "$old_clarify" ]] || fail "update: need an older clarify-before-building revision (full git history?)"
mv "$SK/clarify-before-building" "$TMP/clarify-current"
restore_old "$old_clarify" skills/clarify-before-building "$SK/clarify-before-building"
printf '\nmy local note\n' >> "$SK/rust-testing/SKILL.md"
mv "$SK/testing-qa" "$TMP/testing-qa-moved"
last_hardening="$(git -C "$ROOT" log --format=%H -1 -- skills/security-hardening)"
restore_old "${last_hardening}^" skills/security-hardening "$SK/security-hardening"
mkdir -p "$SK/my-own-skill" && printf -- '---\nname: my-own-skill\n---\n' > "$SK/my-own-skill/SKILL.md"
old_rule=""
for rule in "$ROOT"/rules/*.md; do
  name="$(basename -- "$rule")"
  for c in $(git -C "$ROOT" log --format=%H -- "rules/$name"); do
    if ! git -C "$ROOT" show "$c:rules/$name" 2>/dev/null | cmp -s - "$rule"; then
      if git -C "$ROOT" cat-file -e "$c:rules/$name" 2>/dev/null; then old_rule="$name"; git -C "$ROOT" show "$c:rules/$name" > "$HOME/.claude/rules/$name"; break 2; fi
    fi
  done
done

before="$(cd "$HOME" && find . -type f -exec cksum {} + | sort)"
set +e; out="$(bash "$upd" claude)"; code=$?; set -e
[[ $code -eq 1 ]] || fail "update: report should exit 1 when updates exist (got $code): $out"
grep -Eq '^UPDATE +skill +clarify-before-building' <<<"$out" || fail "update: stale skill not reported: $out"
grep -Eq '^CUSTOMISED +skill +rust-testing' <<<"$out" || fail "update: customised skill not reported: $out"
grep -Eq '^NEW +skill +testing-qa' <<<"$out" || fail "update: missing skill not reported: $out"
grep -Eq '^REMOVED +skill +security-hardening' <<<"$out" || fail "update: removed skill not reported: $out"
grep -q 'my-own-skill' <<<"$out" || fail "update: unmanaged skill not listed: $out"
if [[ -n "$old_rule" ]]; then grep -Eq "^UPDATE +rule +$old_rule" <<<"$out" || fail "update: stale rule not reported: $out"; fi
[[ "$(cd "$HOME" && find . -type f -exec cksum {} + | sort)" == "$before" ]] || fail "update: report mode changed files"

bash "$upd" claude --apply >/dev/null || fail "update: --apply failed"
diff -r "$SK/clarify-before-building" "$ROOT/skills/clarify-before-building" >/dev/null || fail "update: stale skill not updated"
grep -q 'my local note' "$SK/rust-testing/SKILL.md" || fail "update: customised skill was overwritten"
diff -r "$SK/testing-qa" "$ROOT/skills/testing-qa" >/dev/null || fail "update: new skill not installed"
[[ -d "$SK/security-hardening" ]] || fail "update: removed skill pruned without --prune"
[[ -f "$SK/my-own-skill/SKILL.md" ]] || fail "update: unmanaged skill touched"
if [[ -n "$old_rule" ]]; then cmp -s "$HOME/.claude/rules/$old_rule" "$ROOT/rules/$old_rule" || fail "update: stale rule not updated"; fi
find "$XDG_STATE_HOME/cybercore-agent-skills/backups" -path '*clarify-before-building/SKILL.md' -print -quit | grep -q . || fail "update: old skill not backed up"

bash "$upd" claude --apply --prune >/dev/null || fail "update: --prune failed"
[[ ! -e "$SK/security-hardening" ]] || fail "update: removed skill not pruned"
find "$XDG_STATE_HOME/cybercore-agent-skills/backups" -path '*security-hardening/SKILL.md' -print -quit | grep -q . || fail "update: pruned skill not kept in backup"
out="$(bash "$upd" claude)" || fail "update: customised-only state should exit 0: $out"
grep -Eq '^CUSTOMISED +skill +rust-testing' <<<"$out" || fail "update: customised skill not still reported: $out"

out="$(bash "$upd" all)" || fail "update: 'all' failed: $out"
grep -q 'claude' <<<"$out" || fail "update: 'all' did not check claude: $out"
set +e
bash "$upd" no-such-agent >/dev/null 2>&1; [[ $? -eq 2 ]] || fail "update: unknown agent not a usage error"
bash "$upd" claude --bogus >/dev/null 2>&1; [[ $? -eq 2 ]] || fail "update: unknown flag not a usage error"
bash "$upd" claude --prune >/dev/null 2>&1; [[ $? -eq 2 ]] || fail "update: --prune without --apply accepted"
set -e
bash "$upd" --help >/dev/null || fail "update: --help failed"
echo "PASS: update checker"

echo 'All installer smoke tests passed.'
