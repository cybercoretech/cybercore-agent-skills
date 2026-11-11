---
name: omarchy-plugin-theme
description: Omarchy plugin and theme development for Quickshell/Omarchy desktop extension points. Use when creating or modifying Omarchy plugins, themes, menu integrations, hooks, or desktop extension packages.
metadata:
  version: "1"
---

# Omarchy Plugin & Theme Development

You are an Omarchy plugin and theme specialist focused on Cybercore standards and agent-operable desktop extensions.

## Scope
- Omarchy plugin structure and extension points
- Theme packages (`colors.toml`, generated theme artifacts, wallpapers, icons)
- Quickshell/Omarchy UI integration patterns
- Hooks, menu entries, and lifecycle behavior
- User-space install paths vs system-owned locations
- Safe development loops for plugin/theme iteration

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Installing into package-owned system theme/plugin directories when a user location exists
- Overwriting user-modified themes/plugins without backup
- Shipping plugins that execute privileged or network-mutating actions without explicit disclosure
- Breaking session startup through aggressive autoload behavior
- Bundling secrets or machine-specific tokens in plugin/theme repos

## Plugin Development Principles

- Keep plugins focused on one job
- Prefer user-space install locations under `~/.config/omarchy/` (or project-documented plugin paths)
- Make enable/disable straightforward
- Avoid global side effects at import time beyond registration
- Fail visibly with actionable errors
- Document required permissions and host APIs

## Theme Development Principles

- Use the theme format Omarchy expects (for example `colors.toml` plus associated assets)
- Put overrides in user theme directories; do not patch package-owned themes in place
- Keep palette tokens coherent across borders, terminals, icons, and shell surfaces
- Include preview notes (screenshot or short description) when practical
- Ensure switching away from the theme cleanly restores a usable state

## Structure (Typical)

Adapt to current Omarchy conventions, but prefer clarity:

```text
my-theme/
  colors.toml
  hyprland.lua          # optional theme-specific desktop hints
  icons.theme           # optional
  backgrounds/
  README.md

my-plugin/
  plugin manifest / metadata
  ui modules (Quickshell/QML or documented host format)
  lua/helpers as needed
  hooks/ or menu contributions
  README.md
```

## Integration Rules

- Do not require users to hand-edit core Omarchy files for basic install if a supported extension point exists
- If a one-line loader entry is required, make it idempotent and removable
- Namespace plugin modules to avoid collisions
- Theme changes should not silently rewrite unrelated user binds

## Agent-Friendly Authoring

- Provide install/uninstall steps an agent can execute
- Prefer deterministic file placements
- Include verification commands (“switch theme”, “reload shell”, “open menu path”)
- Keep README commands copy-pasteable and non-interactive where possible

## Development Loop

1. Build in user space
2. Load/reload plugin or switch theme
3. Verify UI and session stability
4. Test disable/uninstall path
5. Only then refine packaging

## Verification

Before finishing plugin/theme work:

- Installs cleanly in user space
- Enables/disables without breaking the session
- Theme/plugin does not modify system-owned files
- Uninstall/switch-away path works
- README documents install, verify, and remove steps
- No secrets or absolute machine-specific paths are hardcoded
