#!/usr/bin/env zsh
# ==============================================================================
# Script Name: setup-hermes.sh
# Description: Copies hermes agent-project-setup guardrails into the target repository root.
# ==============================================================================

set -euo pipefail

# Define source template directory (Update this to your actual absolute path)
TEMPLATE_DIR="$HOME/Projects/ai/hermes/agent-project-setup"
TARGET_DIR="$(pwd)"

echo "==> Deploying hermes agent guardrails to: $TARGET_DIR"

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

# 3. Copy the .hermes rules directory
if [[ -d "$TEMPLATE_DIR/.hermes/rules" ]]; then
    mkdir -p "$TARGET_DIR/.hermes/rules"
    cp -r "$TEMPLATE_DIR/.hermes/rules/"* "$TARGET_DIR/.hermes/rules/"
    echo "  ✔ Copied .hermes/rules/ suite"
fi

# 4. Copy the .hermes skills directory
if [[ -d "$TEMPLATE_DIR/.hermes/skills" ]]; then
    mkdir -p "$TARGET_DIR/.hermes/skills"
    cp -r "$TEMPLATE_DIR/.hermes/skills/" "$TARGET_DIR/.hermes/skills/"
    echo "  ✔ Copied .hermes/skills/ suite"
fi

echo "==> Success! hermes agent guardrails successfully applied."
echo "==> Restart your hermes session in this directory to load new rules."
