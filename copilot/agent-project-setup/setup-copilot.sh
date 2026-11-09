#!/usr/bin/env zsh
# ==============================================================================
# Script Name: setup-copilot.sh
# Description: Copies Copilot agent-project-setup guardrails into the target repository root.
# ==============================================================================

set -euo pipefail

# Define source template directory (Update this to your actual absolute path)
TEMPLATE_DIR="$HOME/Projects/ai/copilot/agent-project-setup"
TARGET_DIR="$(pwd)"

echo "==> Deploying Copilot agent guardrails to: $TARGET_DIR"

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

# 3. Copy the .copilot rules directory
if [[ -d "$TEMPLATE_DIR/.copilot/rules" ]]; then
    mkdir -p "$TARGET_DIR/.copilot/rules"
    cp -r "$TEMPLATE_DIR/.copilot/rules/"* "$TARGET_DIR/.copilot/rules/"
    echo "  ✔ Copied .copilot/rules/ suite"
fi

# 4. Copy the .copilot skills directory
if [[ -d "$TEMPLATE_DIR/.copilot/skills" ]]; then
    mkdir -p "$TARGET_DIR/.copilot/skills"
    cp -r "$TEMPLATE_DIR/.copilot/skills/" "$TARGET_DIR/.copilot/skills/"
    echo "  ✔ Copied .copilot/skills/ suite"
fi

echo "==> Success! Copilot agent guardrails successfully applied."
echo "==> Restart your Copilot session in this directory to load new rules."
