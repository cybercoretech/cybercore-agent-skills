#!/usr/bin/env zsh
# ==============================================================================
# Script Name: setup-crush.sh
# Description: Copies crush agent-project-setup guardrails into the target repository root.
# ==============================================================================

set -euo pipefail

# Define source template directory (Update this to your actual absolute path)
TEMPLATE_DIR="$HOME/Projects/ai/crush/agent-project-setup"
TARGET_DIR="$(pwd)"

echo "==> Deploying crush agent guardrails to: $TARGET_DIR"

# 1. Ensure target is a valid git repository or project root
if [[ ! -d "$TARGET_DIR/.git" ]]; then
    echo "⚠️ Warning: No .git directory found here. Continuing anyway..."
fi

# 2. Copy root configuration files
if [[ -f "$TEMPLATE_DIR/AGENTS.md" ]]; then
    cp "$TEMPLATE_DIR/AGENTS.md" "$TARGET_DIR/AGENTS.md"
    echo "  ✔ Copied AGENTS.md"
else
    echo "  ✖ Error: AGENTS.md not found in template directory!"
    exit 1
fi

# 3. Copy the .crush rules directory
if [[ -d "$TEMPLATE_DIR/.crush/rules" ]]; then
    mkdir -p "$TARGET_DIR/.crush/rules"
    cp -r "$TEMPLATE_DIR/.crush/rules/"* "$TARGET_DIR/.crush/rules/"
    echo "  ✔ Copied .crush/rules/ suite"
fi

# 4. Copy the .crush skills directory
if [[ -d "$TEMPLATE_DIR/.crush/skills" ]]; then
    mkdir -p "$TARGET_DIR/.crush/skills"
    cp -r "$TEMPLATE_DIR/.crush/skills/" "$TARGET_DIR/.crush/skills/"
    echo "  ✔ Copied .crush/skills/ suite"
fi

echo "==> Success! crush agent guardrails successfully applied."
echo "==> Restart your crush session in this directory to load new rules."
