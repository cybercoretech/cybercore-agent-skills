#!/usr/bin/env zsh
# ==============================================================================
# Script Name: setup-claude.sh
# Description: Copies Claude agent-project-setup guardrails into the target repository root.
# ==============================================================================

set -euo pipefail

# Define source template directory (Update this to your actual absolute path)
TEMPLATE_DIR="$HOME/Projects/ai/claude/agent-project-setup"
TARGET_DIR="$(pwd)"

echo "==> Deploying Claude agent guardrails to: $TARGET_DIR"

# 1. Ensure target is a valid git repository or project root
if [[ ! -d "$TARGET_DIR/.git" ]]; then
    echo "⚠️ Warning: No .git directory found here. Continuing anyway..."
fi

# 2. Copy root configuration files
if [[ -f "$TEMPLATE_DIR/CLAUDE.md" ]]; then
    cp "$TEMPLATE_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md"
    echo "  ✔ Copied CLAUDE.md"
else
    echo "  ✖ Error: CLAUDE.md not found in template directory!"
    exit 1
fi

if [[ -f "$TEMPLATE_DIR/settings.json" ]]; then
    cp "$TEMPLATE_DIR/settings.json" "$TARGET_DIR/settings.json"
    echo "  ✔ Copied settings.json"
fi

# 3. Copy the .claude rules directory
if [[ -d "$TEMPLATE_DIR/.claude/rules" ]]; then
    mkdir -p "$TARGET_DIR/.claude/rules"
    cp -r "$TEMPLATE_DIR/.claude/rules/"* "$TARGET_DIR/.claude/rules/"
    echo "  ✔ Copied .claude/rules/ suite"
fi

# 4. Copy the .claude skills directory
if [[ -d "$TEMPLATE_DIR/.claude/skills" ]]; then
    mkdir -p "$TARGET_DIR/.claude/skills"
    cp -r "$TEMPLATE_DIR/.claude/skills/" "$TARGET_DIR/.claude/skills/"
    echo "  ✔ Copied .claude/skills/ suite"
fi

echo "==> Success! Claude agent guardrails successfully applied."
echo "==> Restart your Claude Code session in this directory to load new rules."
