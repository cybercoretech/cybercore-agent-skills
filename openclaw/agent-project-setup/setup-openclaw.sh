#!/usr/bin/env zsh
# ==============================================================================
# Script Name: setup-openclaw.sh
# Description: Copies openclaw agent-project-setup guardrails into the target repository root.
# ==============================================================================

set -euo pipefail

# Define source template directory (Update this to your actual absolute path)
TEMPLATE_DIR="$HOME/Projects/ai/openclaw/agent-project-setup"
TARGET_DIR="$(pwd)"

echo "==> Deploying openclaw agent guardrails to: $TARGET_DIR"

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

# 3. Copy the .openclaw rules directory
if [[ -d "$TEMPLATE_DIR/.openclaw/rules" ]]; then
    mkdir -p "$TARGET_DIR/.openclaw/rules"
    cp -r "$TEMPLATE_DIR/.openclaw/rules/"* "$TARGET_DIR/.openclaw/rules/"
    echo "  ✔ Copied .openclaw/rules/ suite"
fi

# 4. Copy the .openclaw skills directory
if [[ -d "$TEMPLATE_DIR/.openclaw/skills" ]]; then
    mkdir -p "$TARGET_DIR/.openclaw/skills"
    cp -r "$TEMPLATE_DIR/.openclaw/skills/" "$TARGET_DIR/.openclaw/skills/"
    echo "  ✔ Copied .openclaw/skills/ suite"
fi

echo "==> Success! openclaw agent guardrails successfully applied."
echo "==> Restart your openclaw session in this directory to load new rules."
