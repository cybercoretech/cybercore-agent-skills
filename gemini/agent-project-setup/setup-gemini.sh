#!/usr/bin/env zsh
# ==============================================================================
# Script Name: setup-gemini.sh
# Description: Copies gemini agent-project-setup guardrails into the target repository root.
# ==============================================================================

set -euo pipefail

# Define source template directory (Update this to your actual absolute path)
TEMPLATE_DIR="$HOME/Projects/ai/gemini/agent-project-setup"
TARGET_DIR="$(pwd)"

echo "==> Deploying gemini agent guardrails to: $TARGET_DIR"

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

# 3. Copy the .gemini rules directory
if [[ -d "$TEMPLATE_DIR/.gemini/rules" ]]; then
    mkdir -p "$TARGET_DIR/.gemini/rules"
    cp -r "$TEMPLATE_DIR/.gemini/rules/"* "$TARGET_DIR/.gemini/rules/"
    echo "  ✔ Copied .gemini/rules/ suite"
fi

# 4. Copy the .gemini skills directory
if [[ -d "$TEMPLATE_DIR/.gemini/skills" ]]; then
    mkdir -p "$TARGET_DIR/.gemini/skills"
    cp -r "$TEMPLATE_DIR/.gemini/skills/" "$TARGET_DIR/.gemini/skills/"
    echo "  ✔ Copied .gemini/skills/ suite"
fi

echo "==> Success! gemini agent guardrails successfully applied."
echo "==> Restart your gemini session in this directory to load new rules."
