#!/usr/bin/env zsh
# ==============================================================================
# Script Name: setup-qwen.sh
# Description: Copies qwen agent-project-setup guardrails into the target repository root.
# ==============================================================================

set -euo pipefail

# Define source template directory (Update this to your actual absolute path)
TEMPLATE_DIR="$HOME/Projects/ai/qwen/agent-project-setup"
TARGET_DIR="$(pwd)"

echo "==> Deploying qwen agent guardrails to: $TARGET_DIR"

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

# 3. Copy the .qwen rules directory
if [[ -d "$TEMPLATE_DIR/.qwen/rules" ]]; then
    mkdir -p "$TARGET_DIR/.qwen/rules"
    cp -r "$TEMPLATE_DIR/.qwen/rules/"* "$TARGET_DIR/.qwen/rules/"
    echo "  ✔ Copied .qwen/rules/ suite"
fi

# 4. Copy the .qwen skills directory
if [[ -d "$TEMPLATE_DIR/.qwen/skills" ]]; then
    mkdir -p "$TARGET_DIR/.qwen/skills"
    cp -r "$TEMPLATE_DIR/.qwen/skills/" "$TARGET_DIR/.qwen/skills/"
    echo "  ✔ Copied .qwen/skills/ suite"
fi

echo "==> Success! qwen agent guardrails successfully applied."
echo "==> Restart your qwen session in this directory to load new rules."
