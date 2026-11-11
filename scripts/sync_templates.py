#!/usr/bin/env python3
"""Sync canonical skills, rules, and installers into every agent template.

Sources of truth (repository root):
  manifest.yaml           agents, skill groups, packs, display metadata
  skills/<name>/          canonical skill folders
  rules/<rule>.md         canonical rule files
  templates/setup.sh.in   installer template

Targets, per agent (<agent>/agent-project-setup/):
  <rules_dir>/<rule>.md
  <skills_dir>/<skill>/   skills from default groups
  packs/<pack>/<skill>/   skills from opt-in pack groups
  <script>                rendered installer (mode 0755)

Usage:
  python3 scripts/sync_templates.py          write any changes
  python3 scripts/sync_templates.py --check  report drift, write nothing, exit 1 on drift

The script never deletes. Folders or files in a template that the manifest does
not expect are reported so a human can remove them deliberately.
"""
from __future__ import annotations

import argparse
import os
import shlex
import sys
from dataclasses import dataclass, field
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "manifest.yaml"
SKILLS_SRC = ROOT / "skills"
RULES_SRC = ROOT / "rules"
SETUP_TEMPLATE = ROOT / "templates" / "setup.sh.in"

LEGACY_CLAUDE_SETTINGS = """{
  "permissions": {
    "allow": [],
    "deny": []
  },
  "hooks": {}
}"""


@dataclass
class Report:
    changed: list[str] = field(default_factory=list)
    unexpected: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def load_manifest() -> dict:
    with MANIFEST.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def template_dir(agent: str) -> Path:
    return ROOT / agent / "agent-project-setup"


def skill_targets(manifest: dict, agent: str) -> dict[str, Path]:
    """Map skill name -> destination folder inside the agent template."""
    spec = manifest["agents"][agent]
    if not spec.get("skills_dir"):
        return {}
    base = template_dir(agent)
    targets: dict[str, Path] = {}
    for name, meta in manifest["skills"].items():
        group = manifest["groups"][meta["group"]]
        if group.get("default"):
            targets[name] = base / spec["skills_dir"] / name
        else:
            targets[name] = base / "packs" / group["pack"] / name
    return targets


def bash_array(items: list[str] | None) -> str:
    return " ".join(shlex.quote(item) for item in (items or []))


def bash_printf(text: str) -> str:
    """Render a note as a printf line; {project} becomes the target path."""
    parts = text.split("{project}")
    fmt = "%s".join(part.replace("%", "%%").replace("\\", "\\\\") for part in parts)
    args = ' "$TARGET_DIR"' * (len(parts) - 1)
    return f"printf {shlex.quote('NOTE: ' + fmt + chr(92) + 'n')}{args}\n"


def render_setup(manifest: dict, agent: str) -> str:
    spec = manifest["agents"][agent]
    notes = "".join(bash_printf(note) for note in spec.get("notes", []))
    if agent == "claude":
        notes += (
            "LEGACY_SETTINGS=" + shlex.quote(LEGACY_CLAUDE_SETTINGS) + "\n"
            'if [[ -f "$TARGET_DIR/settings.json" && "$(cat -- "$TARGET_DIR/settings.json")" == "$LEGACY_SETTINGS" ]]; then\n'
            '  printf "NOTE: %s/settings.json was written by an older version of this installer and is not read by Claude Code. Remove it if nothing else uses it.\\n" "$TARGET_DIR"\n'
            "fi\n"
        )
    replacements = {
        "@AGENT@": agent,
        "@AGENT_NAME@": spec["name"],
        "@INSTRUCTIONS@": spec["instructions"],
        "@RULES_DIR@": spec["rules_dir"],
        "@SKILLS_DIR@": spec.get("skills_dir") or "",
        "@ROOT_FILES@": bash_array(spec.get("root_files")),
        "@KEEP_FILES@": bash_array(spec.get("keep_files")),
        "@NOTES@": notes,
    }
    text = SETUP_TEMPLATE.read_text(encoding="utf-8")
    for key, value in replacements.items():
        text = text.replace(key, value)
    return text


def sync_file(src_bytes: bytes, dest: Path, check: bool, report: Report, mode: int | None = None) -> None:
    rel = str(dest.relative_to(ROOT))
    current = dest.read_bytes() if dest.is_file() else None
    mode_ok = mode is None or (dest.exists() and (dest.stat().st_mode & 0o777) == mode)
    if current == src_bytes and mode_ok:
        return
    report.changed.append(rel if current is not None else f"{rel} (missing)")
    if check:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(src_bytes)
    if mode is not None:
        os.chmod(dest, mode)


def sync_tree(src: Path, dest: Path, check: bool, report: Report) -> None:
    for path in sorted(src.rglob("*")):
        if path.is_file():
            target = dest / path.relative_to(src)
            sync_file(path.read_bytes(), target, check, report)
    if dest.is_dir():
        for path in sorted(dest.rglob("*")):
            if path.is_file() and not (src / path.relative_to(dest)).is_file():
                report.unexpected.append(f"{path.relative_to(ROOT)} (not in {src.relative_to(ROOT)})")


def report_unexpected_children(parent: Path, expected: set[str], report: Report) -> None:
    if not parent.is_dir():
        return
    for child in sorted(parent.iterdir()):
        if child.name not in expected:
            report.unexpected.append(f"{child.relative_to(ROOT)} (not in manifest)")


def validate_manifest(manifest: dict, report: Report) -> None:
    listed = set(manifest["skills"])
    on_disk = {p.name for p in SKILLS_SRC.iterdir() if p.is_dir()}
    for name in sorted(on_disk - listed):
        report.errors.append(f"skills/{name} exists but is not listed in manifest.yaml")
    for name in sorted(listed - on_disk):
        report.errors.append(f"manifest.yaml lists {name} but skills/{name} does not exist")
    for name, meta in manifest["skills"].items():
        group = manifest["groups"].get(meta.get("group"))
        if group is None:
            report.errors.append(f"{name}: unknown group {meta.get('group')!r}")
        elif not group.get("default") and not group.get("pack"):
            report.errors.append(f"group {meta['group']}: non-default groups need a 'pack' name")
    for rule in manifest["rules"]:
        if not (RULES_SRC / f"{rule}.md").is_file():
            report.errors.append(f"rules/{rule}.md is missing")


def sync(check: bool) -> Report:
    manifest = load_manifest()
    report = Report()
    validate_manifest(manifest, report)
    if report.errors:
        return report

    for agent, spec in manifest["agents"].items():
        base = template_dir(agent)
        if not base.is_dir():
            report.errors.append(f"{agent}: template directory {base.relative_to(ROOT)} is missing")
            continue

        for rule in manifest["rules"]:
            src = (RULES_SRC / f"{rule}.md").read_bytes()
            sync_file(src, base / spec["rules_dir"] / f"{rule}.md", check, report)

        targets = skill_targets(manifest, agent)
        for name, dest in targets.items():
            sync_tree(SKILLS_SRC / name, dest, check, report)

        if spec.get("skills_dir"):
            default_names = {n for n, d in targets.items() if d.parent == base / spec["skills_dir"]}
            report_unexpected_children(base / spec["skills_dir"], default_names, report)
            packs = {d.parent.name for d in targets.values() if d.parent.parent == base / "packs"}
            report_unexpected_children(base / "packs", packs, report)
            for pack in packs:
                pack_names = {n for n, d in targets.items() if d.parent == base / "packs" / pack}
                report_unexpected_children(base / "packs" / pack, pack_names, report)
        elif (base / "packs").exists():
            report.unexpected.append(f"{(base / 'packs').relative_to(ROOT)} (rules-only agent)")

        script = render_setup(manifest, agent).encode("utf-8")
        sync_file(script, base / spec["script"], check, report, mode=0o755)
        for other in sorted(base.glob("setup-*.sh")):
            if other.name != spec["script"]:
                report.unexpected.append(f"{other.relative_to(ROOT)} (extra installer)")
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="report drift without writing")
    args = parser.parse_args()

    report = sync(check=args.check)
    for error in report.errors:
        print(f"ERROR: {error}", file=sys.stderr)
    verb = "out of date" if args.check else "updated"
    for path in report.changed:
        print(f"{verb}: {path}")
    for path in report.unexpected:
        print(f"unexpected: {path}", file=sys.stderr)

    if report.errors:
        return 1
    if args.check and (report.changed or report.unexpected):
        print(f"\nTemplates are out of sync ({len(report.changed)} to update, "
              f"{len(report.unexpected)} unexpected). Run: python3 scripts/sync_templates.py", file=sys.stderr)
        return 1
    if report.unexpected:
        print(f"\n{len(report.unexpected)} unexpected path(s) left in place; remove them deliberately if obsolete.",
              file=sys.stderr)
    print("Templates are in sync." if not report.changed else f"\n{len(report.changed)} file(s) {verb}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
