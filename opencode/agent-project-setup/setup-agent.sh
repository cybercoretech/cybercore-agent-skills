#!/usr/bin/env zsh
# ==============================================================================
# Script Name: setup-agent.sh
# Description: Copies agent-project-setup guardrails into the target repository root.
# ==============================================================================

set -euo pipefail

# Define source template directory (Update this to your actual absolute path)
TEMPLATE_DIR="$HOME/projects/agent-project-setup"
TARGET_DIR="$(pwd)"

echo "==> Deploying OpenCode agent guardrails to: $TARGET_DIR"

# 1. Ensure target is a valid git repository or project root
if [[ ! -d "$TARGET_DIR/.git" ]]; then
    echo "⚠️ Warning: No .git directory found here. Continuing anyway..."
fi

# 2. Copy root configuration files
if [[ -f "$TEMPLATE_DIR/opencode.json" ]]; then
    cp "$TEMPLATE_DIR/opencode.json" "$TARGET_DIR/opencode.json"
    echo "  ✔ Copied opencode.json"
else
    echo "  ✖ Error: opencode.json not found in template directory!"
    exit 1
fi

if [[ -f "$TEMPLATE_DIR/AGENTS.md" ]]; then
    cp "$TEMPLATE_DIR/AGENTS.md" "$TARGET_DIR/AGENTS.md"
    echo "  ✔ Copied AGENTS.md"
fi

# 3. Copy the .opencode rules directory
if [[ -d "$TEMPLATE_DIR/.opencode" ]]; then
    mkdir -p "$TARGET_DIR/.opencode"
    cp -r "$TEMPLATE_DIR/.opencode/" "$TARGET_DIR/.opencode/"
    echo "  ✔ Copied .opencode/ rules suite"
fi

echo "==> Success! Agent guardrails successfully applied."
echo "==> Restart your OpenCode session in this directory to load new rules."
