#!/usr/bin/env zsh
# ==============================================================================
# Script Name: setup-ori.sh
# Description: Copies ori agent-project-setup guardrails into the target repository root.
# ==============================================================================

set -euo pipefail

# Define source template directory (Update this to your actual absolute path)
TEMPLATE_DIR="$HOME/Projects/ai/ori/agent-project-setup"
TARGET_DIR="$(pwd)"

echo "==> Deploying ori agent guardrails to: $TARGET_DIR"

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

# 3. Copy the .ori rules directory
if [[ -d "$TEMPLATE_DIR/.ori/rules" ]]; then
    mkdir -p "$TARGET_DIR/.ori/rules"
    cp -r "$TEMPLATE_DIR/.ori/rules/"* "$TARGET_DIR/.ori/rules/"
    echo "  ✔ Copied .ori/rules/ suite"
fi

# 4. Copy the .ori skills directory
if [[ -d "$TEMPLATE_DIR/.ori/skills" ]]; then
    mkdir -p "$TARGET_DIR/.ori/skills"
    cp -r "$TEMPLATE_DIR/.ori/skills/" "$TARGET_DIR/.ori/skills/"
    echo "  ✔ Copied .ori/skills/ suite"
fi

echo "==> Success! ori agent guardrails successfully applied."
echo "==> Restart your ori session in this directory to load new rules."
