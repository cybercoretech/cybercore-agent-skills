#!/usr/bin/env python3
"""Release checks driven by CHANGELOG.md (standard library only).

Usage:
  python3 scripts/check_release.py v1.2.0           exit 1 unless the tag is the newest released
                                                    version in CHANGELOG.md, dated, with notes
  python3 scripts/check_release.py --notes v1.2.0   print that version's notes (release body)
  python3 scripts/check_release.py --latest         print the newest released version, or nothing
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEADING = re.compile(r"^## \[([^\]]+)\](?: - (.*))?$", re.MULTILINE)
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _sections(text: str) -> list[tuple[str, str | None, str]]:
    """(name, date, body) for every '## [name] - date' heading, in file order."""
    matches = list(HEADING.finditer(text))
    out = []
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        out.append((m.group(1), m.group(2), text[m.end():end].strip()))
    return out


def latest_version(text: str) -> str | None:
    for name, _date, _body in _sections(text):
        if SEMVER.match(name):
            return name
    return None


def release_notes(text: str, version: str) -> str | None:
    for name, _date, body in _sections(text):
        if name == version:
            return body
    return None


def check_tag(tag: str, text: str) -> list[str]:
    if not re.match(r"^v\d+\.\d+\.\d+$", tag):
        return [f"tag '{tag}' is not of the form vMAJOR.MINOR.PATCH"]
    version = tag[1:]
    latest = latest_version(text)
    if latest != version:
        return [f"tag {tag} does not match the newest release in CHANGELOG.md ({latest or 'none'})"]
    errors = []
    date = next(d for n, d, _b in _sections(text) if n == version)
    if not date or not DATE.match(date.strip()):
        errors.append(f"CHANGELOG.md: [{version}] needs a date as YYYY-MM-DD")
    if not release_notes(text, version):
        errors.append(f"CHANGELOG.md: [{version}] has no notes")
    return errors


def main(argv: list[str]) -> int:
    text = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    if argv == ["--latest"]:
        print(latest_version(text) or "")
        return 0
    if len(argv) == 2 and argv[0] == "--notes":
        notes = release_notes(text, argv[1].lstrip("v"))
        if notes is None:
            print(f"No CHANGELOG.md entry for {argv[1]}", file=sys.stderr)
            return 1
        print(notes)
        return 0
    if len(argv) == 1 and not argv[0].startswith("-"):
        errors = check_tag(argv[0], text)
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        if not errors:
            print(f"Release {argv[0]} matches CHANGELOG.md.")
        return 1 if errors else 0
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
