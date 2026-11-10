#!/usr/bin/env python3
"""Validate agent template structure and skill frontmatter."""
from pathlib import Path
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]
AGENTS = [
    "claude", "codex", "copilot", "crush", "gemini", "hermes",
    "kimi-code", "ollama", "openclaw", "opencode", "ori", "pi", "qwen",
]
SKILLS = [
    "android-development", "api-backend", "container-devops", "git-workflow",
    "qt-cpp-desktop", "rust-development", "security-guidelines",
    "shell-scripting", "system-administration", "testing-qa",
    "web-design-and-frontend-craft",
]
RULES = ["safety", "workflow", "rust", "gleam"]
errors = []

for agent in AGENTS:
    template = ROOT / agent / "agent-project-setup"
    hidden = f".{agent}"
    instruction = "CLAUDE.md" if agent == "claude" else "AGENTS.md"
    setup_scripts = list(template.glob("setup-*.sh"))
    if not template.is_dir():
        errors.append(f"{agent}: missing template directory")
        continue
    if not (template / instruction).is_file():
        errors.append(f"{agent}: missing {instruction}")
    if len(setup_scripts) != 1:
        errors.append(f"{agent}: expected exactly one setup-*.sh, found {len(setup_scripts)}")
    for script in setup_scripts:
        if not script.stat().st_mode & 0o111:
            errors.append(f"{agent}: {script.name} is not executable")
    config = template / hidden
    for rule in RULES:
        if not (config / "rules" / f"{rule}.md").is_file():
            errors.append(f"{agent}: missing {hidden}/rules/{rule}.md")
    for skill in SKILLS:
        skill_file = config / "skills" / skill / "SKILL.md"
        if not skill_file.is_file():
            errors.append(f"{agent}: missing {hidden}/skills/{skill}/SKILL.md")
            continue
        content = skill_file.read_text(encoding="utf-8")
        if not content.startswith("---\n"):
            errors.append(f"{skill_file.relative_to(ROOT)}: missing YAML frontmatter opener")
            continue
        end = content.find("\n---\n", 4)
        if end < 0:
            errors.append(f"{skill_file.relative_to(ROOT)}: missing YAML frontmatter closer")
            continue
        try:
            metadata = yaml.safe_load(content[4:end])
        except yaml.YAMLError as exc:
            errors.append(f"{skill_file.relative_to(ROOT)}: invalid YAML: {exc}")
            continue
        if not isinstance(metadata, dict):
            errors.append(f"{skill_file.relative_to(ROOT)}: frontmatter must be a YAML mapping")
            continue
        if not isinstance(metadata.get("name"), str) or not metadata["name"].strip():
            errors.append(f"{skill_file.relative_to(ROOT)}: missing non-empty name")
        elif metadata["name"].strip() != skill:
            errors.append(f"{skill_file.relative_to(ROOT)}: name does not match directory ({skill})")
        if not isinstance(metadata.get("description"), str) or not metadata["description"].strip():
            errors.append(f"{skill_file.relative_to(ROOT)}: missing non-empty description")

# The shared skills must remain identical across every agent implementation.
for skill in SKILLS:
    files = [ROOT / agent / "agent-project-setup" / f".{agent}" / "skills" / skill / "SKILL.md" for agent in AGENTS]
    existing = [p for p in files if p.is_file()]
    if len(existing) == len(AGENTS):
        baseline = existing[0].read_bytes()
        for path in existing[1:]:
            if path.read_bytes() != baseline:
                errors.append(f"{skill}: skill content differs in {path.relative_to(ROOT)}")

if errors:
    print("Template validation failed:", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    sys.exit(1)

print(f"Validated {len(AGENTS)} agent templates, {len(RULES)} rules per agent, and {len(SKILLS)} shared skills per agent.")
print(f"Validated {len(AGENTS) * len(SKILLS)} SKILL.md frontmatter blocks and cross-agent content parity.")
