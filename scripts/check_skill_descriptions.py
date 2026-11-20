#!/usr/bin/env python3
"""Check that skill descriptions keep agents routing to the right skill.

Agents choose a skill by its description, so three rules guard them:

1. Every description says when to use the skill ("Use when/for/after ...").
2. Every pointer to another skill ("(use other-skill)", ", use other-skill",
   "stays in other-skill") names a skill that exists.
3. Every neighbour pair in scripts/skill-neighbours.yaml stays linked: at
   least one of the two descriptions points to the other.

Usage:
  python3 scripts/check_skill_descriptions.py    exit 1 and list problems if any rule fails
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
USE_CLAUSE = re.compile(r"\bUse (when|for|after|before|whenever)\b", re.IGNORECASE)
SKILL_ID = r"[a-z0-9]+(?:-[a-z0-9]+)+"
POINTER_FORMS = [
    re.compile(rf"\(use ({SKILL_ID})(?:,? (?:and|or) ({SKILL_ID}))?"),  # (use x) / (use x and y)
    re.compile(rf"\buse ({SKILL_ID})\b"),                               # ..., use x.
    re.compile(rf"\bstays? in ({SKILL_ID})\b"),                         # ... stays in x
]


def pointers(description: str) -> set[str]:
    """Skill IDs a description points to."""
    found: set[str] = set()
    for form in POINTER_FORMS:
        for match in form.finditer(description):
            found.update(group for group in match.groups() if group)
    return found


def missing_use_clause(descriptions: dict[str, str]) -> list[str]:
    return sorted(sid for sid, desc in descriptions.items() if not USE_CLAUSE.search(desc))


def broken_pointers(descriptions: dict[str, str]) -> list[tuple[str, str]]:
    return sorted((sid, target) for sid, desc in descriptions.items()
                  for target in pointers(desc) if target not in descriptions)


def unlinked_neighbours(descriptions: dict[str, str], pairs: list) -> list[tuple[str, str]]:
    problems = []
    for a, b in pairs:
        if a not in descriptions or b not in descriptions:
            problems.append((a, b))
        elif b not in pointers(descriptions[a]) and a not in pointers(descriptions[b]):
            problems.append((a, b))
    return problems


def load_descriptions(root: Path = ROOT) -> dict[str, str]:
    manifest = yaml.safe_load((root / "manifest.yaml").read_text(encoding="utf-8"))
    descriptions = {}
    for sid in manifest["skills"]:
        text = (root / "skills" / sid / "SKILL.md").read_text(encoding="utf-8")
        descriptions[sid] = str(yaml.safe_load(text.split("---", 2)[1]).get("description", ""))
    return descriptions


def main(argv: list[str]) -> int:
    descriptions = load_descriptions()
    pairs = yaml.safe_load((ROOT / "scripts" / "skill-neighbours.yaml").read_text(encoding="utf-8"))["pairs"]
    problems = [f"{sid}: description has no 'Use when/for/after ...' clause" for sid in missing_use_clause(descriptions)]
    problems += [f"{sid}: points to '{target}', which is not a skill" for sid, target in broken_pointers(descriptions)]
    problems += [f"{a} / {b}: neighbours, but neither description points to the other (or one no longer exists)"
                 for a, b in unlinked_neighbours(descriptions, pairs)]
    if problems:
        print("Skill description check failed:")
        for problem in problems:
            print(f"- {problem}")
        return 1
    print(f"Skill description check passed: {len(descriptions)} skills, {len(pairs)} neighbour pairs.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
