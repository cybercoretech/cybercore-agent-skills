#!/usr/bin/env zsh
# ==============================================================================
# Script Name: setup-kimi-code.sh
# Description: Copies kimi-code agent-project-setup guardrails into the target repository root.
# ==============================================================================

set -euo pipefail

# Define source template directory (Update this to your actual absolute path)
TEMPLATE_DIR="$HOME/Projects/ai/kimi-code/agent-project-setup"
TARGET_DIR="$(pwd)"

echo "==> Deploying kimi-code agent guardrails to: $TARGET_DIR"

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

# 3. Copy the .kimi-code rules directory
if [[ -d "$TEMPLATE_DIR/.kimi-code/rules" ]]; then
    mkdir -p "$TARGET_DIR/.kimi-code/rules"
    cp -r "$TEMPLATE_DIR/.kimi-code/rules/"* "$TARGET_DIR/.kimi-code/rules/"
    echo "  ✔ Copied .kimi-code/rules/ suite"
fi

# 4. Copy the .kimi-code skills directory
if [[ -d "$TEMPLATE_DIR/.kimi-code/skills" ]]; then
    mkdir -p "$TARGET_DIR/.kimi-code/skills"
    cp -r "$TEMPLATE_DIR/.kimi-code/skills/" "$TARGET_DIR/.kimi-code/skills/"
    echo "  ✔ Copied .kimi-code/skills/ suite"
fi

echo "==> Success! kimi-code agent guardrails successfully applied."
echo "==> Restart your kimi-code session in this directory to load new rules."
