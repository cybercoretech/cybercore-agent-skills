#!/usr/bin/env zsh
# ==============================================================================
# Script Name: setup-codex.sh
# Description: Copies Codex agent-project-setup guardrails into the target repository root.
# ==============================================================================

set -euo pipefail

# Define source template directory (Update this to your actual absolute path)
TEMPLATE_DIR="$HOME/Projects/ai/codex/agent-project-setup"
TARGET_DIR="$(pwd)"

echo "==> Deploying Codex agent guardrails to: $TARGET_DIR"

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

# 3. Copy the .codex rules directory
if [[ -d "$TEMPLATE_DIR/.codex/rules" ]]; then
    mkdir -p "$TARGET_DIR/.codex/rules"
    cp -r "$TEMPLATE_DIR/.codex/rules/"* "$TARGET_DIR/.codex/rules/"
    echo "  ✔ Copied .codex/rules/ suite"
fi

# 4. Copy the .codex skills directory
if [[ -d "$TEMPLATE_DIR/.codex/skills" ]]; then
    mkdir -p "$TARGET_DIR/.codex/skills"
    cp -r "$TEMPLATE_DIR/.codex/skills/" "$TARGET_DIR/.codex/skills/"
    echo "  ✔ Copied .codex/skills/ suite"
fi

echo "==> Success! Codex agent guardrails successfully applied."
echo "==> Restart your Codex session in this directory to load new rules."
