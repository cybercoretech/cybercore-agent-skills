#!/usr/bin/env zsh
# ==============================================================================
# Script Name: setup-ollama.sh
# Description: Copies ollama agent-project-setup guardrails into the target repository root.
# ==============================================================================

set -euo pipefail

# Define source template directory (Update this to your actual absolute path)
TEMPLATE_DIR="$HOME/Projects/ai/ollama/agent-project-setup"
TARGET_DIR="$(pwd)"

echo "==> Deploying ollama agent guardrails to: $TARGET_DIR"

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

# 3. Copy the .ollama rules directory
if [[ -d "$TEMPLATE_DIR/.ollama/rules" ]]; then
    mkdir -p "$TARGET_DIR/.ollama/rules"
    cp -r "$TEMPLATE_DIR/.ollama/rules/"* "$TARGET_DIR/.ollama/rules/"
    echo "  ✔ Copied .ollama/rules/ suite"
fi

# 4. Copy the .ollama skills directory
if [[ -d "$TEMPLATE_DIR/.ollama/skills" ]]; then
    mkdir -p "$TARGET_DIR/.ollama/skills"
    cp -r "$TEMPLATE_DIR/.ollama/skills/" "$TARGET_DIR/.ollama/skills/"
    echo "  ✔ Copied .ollama/skills/ suite"
fi

echo "==> Success! ollama agent guardrails successfully applied."
echo "==> Restart your ollama session in this directory to load new rules."
