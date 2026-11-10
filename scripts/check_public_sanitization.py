#!/usr/bin/env python3
"""Fail CI if private machine/account details enter the public templates package."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

# Construct tokens from fragments so this checker doesn't flag itself.
FORBIDDEN = [
    "darkstar" + "devx",
    "dsdx" + ".code@",
    "19244308" + "+",
    "<" + "PHONE_SERIAL>",
    "~/" + "android",
    "~/" + "Vaults/",
    "~/" + "Projects/ai/",
    "/home/" + "raven/",
    "holo" + "drive",
    "workrate-report" + ".pages.dev",
    "oma" + "mail",
    "AWS_MCP_" + "PROXY_PROFILES",
    "cybercore-tech account" + " was suspended",
]

SELF = Path(__file__).resolve()
errors = []

for path in ROOT.rglob("*"):
    if not path.is_file():
        continue
    if ".git" in path.parts or path.resolve() == SELF:
        continue

    try:
        content = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue

    for token in FORBIDDEN:
        if token.lower() in content.lower():
            errors.append(
                f"{path.relative_to(ROOT)}: forbidden private reference {token!r}"
            )

if errors:
    print("Public sanitization check failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    sys.exit(1)

print("Public sanitization check passed.")
