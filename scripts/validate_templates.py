#!/usr/bin/env python3
"""Validate the canonical skills, the manifest, and every agent template.

Checks:
  - canonical skills/<name>/SKILL.md frontmatter (name matches folder, valid
    name format, non-empty description within 1024 characters)
  - templates/skill-skeleton is a valid template and never ships to an agent
  - skill cross-references point at real skills, and default skills never
    depend on an opt-in pack skill
  - each agent template: instruction file with the right ownership marker,
    exactly one installer (executable), rules, skills, packs as the manifest says
  - every template copy matches the canonical source (via sync_templates --check)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sync_templates  # noqa: E402

ROOT = sync_templates.ROOT
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
errors: list[str] = []


def frontmatter(path: Path) -> dict | None:
    rel = path.relative_to(ROOT)
    content = path.read_text(encoding="utf-8")
    if not content.startswith("---\n"):
        errors.append(f"{rel}: missing YAML frontmatter opener")
        return None
    end = content.find("\n---\n", 4)
    if end < 0:
        errors.append(f"{rel}: missing YAML frontmatter closer")
        return None
    try:
        meta = yaml.safe_load(content[4:end])
    except yaml.YAMLError as exc:
        errors.append(f"{rel}: invalid YAML: {exc}")
        return None
    if not isinstance(meta, dict):
        errors.append(f"{rel}: frontmatter must be a YAML mapping")
        return None
    return meta


def check_skill(path: Path, expected_name: str | None) -> None:
    rel = path.relative_to(ROOT)
    meta = frontmatter(path)
    if meta is None:
        return
    name = meta.get("name")
    if not isinstance(name, str) or not name.strip():
        errors.append(f"{rel}: missing non-empty name")
    else:
        if expected_name is not None and name != expected_name:
            errors.append(f"{rel}: name {name!r} does not match folder {expected_name!r}")
        if not NAME_RE.match(name) or len(name) > 64:
            errors.append(f"{rel}: name {name!r} must be lowercase words joined by hyphens, max 64 chars")
    desc = meta.get("description")
    if not isinstance(desc, str) or not desc.strip():
        errors.append(f"{rel}: missing non-empty description")
    elif len(desc) > 1024:
        errors.append(f"{rel}: description is {len(desc)} characters (max 1024)")


manifest = sync_templates.load_manifest()
skills = manifest["skills"]
groups = manifest["groups"]

# Canonical skills.
for name in skills:
    skill_file = ROOT / "skills" / name / "SKILL.md"
    if skill_file.is_file():
        check_skill(skill_file, name)

# The authoring template must stay valid, but never ship.
skeleton = ROOT / "templates" / "skill-skeleton" / "SKILL.md"
if skeleton.is_file():
    check_skill(skeleton, None)
else:
    errors.append("templates/skill-skeleton/SKILL.md is missing")

# Cross-references: `skill-name` in backticks must exist; default skills must
# not point at pack-only skills, which are absent from a default install.
names_pattern = re.compile(r"`(" + "|".join(map(re.escape, sorted(skills, key=len, reverse=True))) + r")`")
for name, meta in skills.items():
    skill_file = ROOT / "skills" / name / "SKILL.md"
    if not skill_file.is_file():
        continue
    is_default = groups[meta["group"]].get("default", False)
    for ref in set(names_pattern.findall(skill_file.read_text(encoding="utf-8"))):
        if ref != name and is_default and not groups[skills[ref]["group"]].get("default", False):
            errors.append(f"skills/{name}: default skill references pack-only skill `{ref}`")

# Agent templates.
for agent, spec in manifest["agents"].items():
    base = sync_templates.template_dir(agent)
    if not base.is_dir():
        errors.append(f"{agent}: missing template directory")
        continue
    instruction = base / spec["instructions"]
    if not instruction.is_file():
        errors.append(f"{agent}: missing {spec['instructions']}")
    elif instruction.read_text(encoding="utf-8").splitlines()[0] != f"<!-- cybercore-agent-skills: {agent} -->":
        errors.append(f"{agent}: {spec['instructions']} must start with its ownership marker")
    scripts = list(base.glob("setup-*.sh"))
    if [s.name for s in scripts] != [spec["script"]]:
        errors.append(f"{agent}: expected exactly {spec['script']}, found {[s.name for s in scripts]}")
    for script in scripts:
        if not script.stat().st_mode & 0o111:
            errors.append(f"{agent}: {script.name} is not executable")
    for rel in spec.get("root_files", []) + spec.get("keep_files", []):
        if not (base / rel).is_file():
            errors.append(f"{agent}: missing template file {rel}")
    if not spec.get("skills_dir"):
        if spec.get("status") != "rules-only":
            errors.append(f"{agent}: no skills_dir, so status must be rules-only")
    for found in base.rglob("skill-skeleton"):
        errors.append(f"{found.relative_to(ROOT)}: the skill skeleton must not ship in a template")
    for skill_file in base.rglob("SKILL.md"):
        if skill_file.parent.name not in skills:
            errors.append(f"{skill_file.relative_to(ROOT)}: skill is not listed in manifest.yaml")

if (ROOT / "codex" / "agent-project-setup" / ".codex" / "rules" / "default.rules").is_file() is False:
    errors.append("codex: missing .codex/rules/default.rules")

# Documentation must list every skill and the current counts.
readme = (ROOT / "README.md").read_text(encoding="utf-8")
for name in skills:
    if f"`{name}`" not in readme:
        errors.append(f"README.md: skill `{name}` is not listed")
for badge in (f"agents-{len(manifest['agents'])}-", f"skills-{len(skills)}-"):
    if badge not in readme:
        errors.append(f"README.md: badge '{badge}' is missing or has a stale count")

# Template copies must match the canonical sources exactly.
report = sync_templates.sync(check=True)
errors.extend(f"sync: {e}" for e in report.errors)
errors.extend(f"sync: out of date: {p}" for p in report.changed)
errors.extend(f"sync: unexpected: {p}" for p in report.unexpected)

if errors:
    print("Template validation failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    print("\nIf templates are out of date, run: python3 scripts/sync_templates.py", file=sys.stderr)
    sys.exit(1)

agents = manifest["agents"]
skill_agents = [a for a, s in agents.items() if s.get("skills_dir")]
default_skills = [n for n, m in skills.items() if groups[m["group"]].get("default")]
pack_skills = [n for n in skills if n not in default_skills]
print(f"Validated {len(skills)} canonical skills ({len(default_skills)} default, "
      f"{len(pack_skills)} in opt-in packs) and {len(manifest['rules'])} rules.")
print(f"Validated {len(agents)} agent templates: {len(skill_agents)} with skills, "
      f"{len(agents) - len(skill_agents)} rules-only; "
      f"{len(skill_agents) * len(skills)} template skill copies match the canonical source.")
