---
name: hyprland-wayland-theme-integrator
description: Sync custom app color palettes, window rules, and IPC hooks with Hyprland and other Wayland compositors, and integrate with Linux desktop themes. Use when asked to "sync theme colors", "write window rules", "Hyprland IPC", "Wayland theme integration", "GTK/Qt theming on Wayland", "hyprctl dispatch", "color palette from wallpaper", "pywal integration", "window decorations", or "compositor IPC hook". Not for Omarchy theme plugins (use omarchy-plugin-theme).
metadata:
  version: '1'
---
# Hyprland / Wayland Theme Integrator

Syncs custom app color palettes, window rules, and IPC hooks with Hyprland and other
Wayland compositors, and propagates colors into GTK, Qt, terminal, and app-specific
config files so the entire desktop speaks one palette.

> [!IMPORTANT]
> Hyprland config reloads are **live** — a syntax error in `hyprland.conf` can freeze
> window management. Always validate config with `hyprctl --batch` or in a nested
> Hyprland session before writing to the active config. Keep a backup of every file
> edited in this skill.

---

## Steps

### 1. Audit the existing environment

Collect every fact that determines what can be synced before touching any file.

| Fact | How to collect |
|---|---|
| **Compositor** | `echo $XDG_CURRENT_DESKTOP` / `echo $WAYLAND_DISPLAY` / `hyprctl version` |
| **Hyprland version** | `hyprctl version` — IPC socket path and keyword support change between releases |
| **IPC socket path** | `echo $HYPRLAND_INSTANCE_SIGNATURE` → socket at `/tmp/hypr/$HYPRLAND_INSTANCE_SIGNATURE/.socket.sock` |
| **GTK version in use** | `gtk-query-immodules-3.0 --help 2>&1 \| head -1` / check installed packages |
| **Qt platform** | `echo $QT_QPA_PLATFORM` — must be `wayland` or `wayland;xcb` for native Wayland |
| **Color source** | Wallpaper path, existing palette file, or manual hex values |
| **Active theme system** | pywal / matugen / flavours / manual / none |
| **Terminal emulator** | kitty / foot / alacritty / wezterm — each has its own color reload mechanism |
| **Bar / panel** | waybar / eww / ags / yambar — determines where color CSS/SCSS lives |
| **Notification daemon** | mako / dunst / swaync — each has its own color config format |

**Completion criterion:** all ten facts recorded. No file is edited until this table is complete.

---

### 2. Define the master color palette

The palette is the **single source of truth** for every color applied anywhere in the
desktop. All app-specific configs are generated from it, never edited by hand.

#### Palette structure

Define 16 named roles. Names are semantic — they describe purpose, not hue.

```toml
# palette.toml — master palette
[colors]
# Base scale (dark to light for dark themes; invert for light)
base00 = "#1e1e2e"   # darkest background
base01 = "#181825"   # alternative background
base02 = "#313244"   # selection background
base03 = "#45475a"   # comments, invisible text
base04 = "#585b70"   # dark foreground (status bars)
base05 = "#cdd6f4"   # default foreground
base06 = "#f5e0dc"   # light foreground
base07 = "#b4befe"   # lightest foreground / headings

# Accent / semantic
base08 = "#f38ba8"   # red    — errors, deletions
base09 = "#fab387"   # orange — warnings, special values
base0A = "#f9e2af"   # yellow — attention
base0B = "#a6e3a1"   # green  — success, additions
base0C = "#94e2d5"   # cyan   — info, special
base0D = "#89b4fa"   # blue   — primary accent, links
base0E = "#cba6f7"   # purple — keywords, secondary accent
base0F = "#f2cdcd"   # brown / extra — deprecated / misc
```

#### Generating a palette from a wallpaper

Use one of these tools; they all output a compatible 16-color table:

| Tool | Command | Output |
|---|---|---|
| **pywal** | `wal -i /path/to/wallpaper.png -n` | `~/.cache/wal/colors.json` + shell/CSS exports |
| **matugen** | `matugen image /path/to/wallpaper.png` | `~/.config/matugen/colors.css` + template renders |
| **flavours** | `flavours apply <scheme-name>` | Writes per-app files from templates |

**Pywal integration** — convert `colors.json` to `palette.toml`:

```python
#!/usr/bin/env python3
# wal-to-palette.py — run after `wal -i wallpaper.png -n`
import json, tomllib, sys
from pathlib import Path

wal = json.loads(Path("~/.cache/wal/colors.json").expanduser().read_text())
colors = wal["colors"]
names = [f"base{i:02X}" for i in range(16)]
lines = ["[colors]"]
for i, (name, key) in enumerate(zip(names, sorted(colors))):
    lines.append(f'{name} = "{colors[key]}"')
Path("palette.toml").write_text("\n".join(lines) + "\n")
print("Written palette.toml")
```

**Completion criterion:** `palette.toml` exists with all 16 roles populated, every hex
value is a valid 6-digit `#RRGGBB` string, no two roles share the same value.

---

### 3. Write Hyprland window rules

Window rules control geometry, decoration, and behavior per application. Keep all rules
in a dedicated sourced file, not inline in `hyprland.conf`.

#### Config organization

```bash
# hyprland.conf — only source, never inline rules
source = ~/.config/hypr/window-rules.conf
source = ~/.config/hypr/colors.conf          # generated; see §4
source = ~/.config/hypr/keybinds.conf
```

#### Window rule syntax (Hyprland v0.40+)

```ini
# windowrulev2 syntax — always prefer over legacy windowrule
# windowrulev2 = rule, matcher[,matcher...]

# --- Floating windows ---
windowrulev2 = float, class:(pavucontrol)
windowrulev2 = float, class:(nm-connection-editor)
windowrulev2 = float, title:(Picture-in-Picture)
windowrulev2 = float, class:(org.gnome.Calculator)
windowrulev2 = size 800 600, class:(pavucontrol)
windowrulev2 = center, class:(pavucontrol)

# --- Workspace assignment ---
windowrulev2 = workspace 2 silent, class:(firefox)
windowrulev2 = workspace 3 silent, class:(kitty)
windowrulev2 = workspace 4 silent, class:(code-oss)

# --- Opacity (active / inactive) ---
windowrulev2 = opacity 1.0 0.85, class:(kitty)
windowrulev2 = opacity 1.0 0.90, class:(code-oss)
windowrulev2 = opacity 1.0 1.0, class:(firefox)   # never transparent browser

# --- Blur exceptions ---
windowrulev2 = noblur, class:(firefox)
windowrulev2 = noblur, class:(mpv)

# --- Tile overrides ---
windowrulev2 = tile, class:(Spotify)

# --- Layer rules (for bars, notifications, etc.) ---
layerrule = blur, waybar
layerrule = blur, notifications
layerrule = ignorezero, waybar
```

#### Matcher reference

| Matcher | Matches on | Example |
|---|---|---|
| `class:` | `app_id` / WM class (regex) | `class:(kitty)` |
| `title:` | Window title (regex) | `title:(.*YouTube.*)` |
| `initialClass:` | WM class at spawn (doesn't change) | `initialClass:(steam)` |
| `initialTitle:` | Title at spawn | — |
| `tag:` | Custom tag set by `addwindowrule` | `tag:terminal` |
| `workspace:` | Current workspace number | `workspace:2` |
| `floating:` | Is window floating | `floating:1` |
| `fullscreen:` | Fullscreen state | `fullscreen:1` |
| `monitor:` | Monitor name | `monitor:DP-1` |
| `xwayland:` | Is XWayland window | `xwayland:1` |

> [!TIP]
> Find exact class and title values with `hyprctl clients | grep -E "class|title"` or by
> watching `hyprctl -j clients` while opening the target app. Regex is anchored — `(kitty)`
> matches exactly `kitty`; use `(.*kitty.*)` for substring match.

**Completion criterion:** `window-rules.conf` loads without errors (`hyprctl reload` shows
no parse errors in `journalctl --user -u hyprland -n 20`). Every floating app centers
correctly; workspace assignments verified by opening each app.

---

### 4. Generate Hyprland color config from palette

Convert `palette.toml` into Hyprland's `colors.conf` format. This file is sourced by
`hyprland.conf` and re-generated by the theme hook (§5) on palette change.

#### `colors.conf` template

```ini
# colors.conf — GENERATED. Do not edit by hand. Run: theme-apply.sh
# Generated from palette.toml

general {
    col.active_border   = rgba(89b4faff) rgba(cba6f7ff) 45deg  # base0D → base0E
    col.inactive_border = rgba(313244ff)                         # base02
    col.nogroup_border  = rgba(45475aff)                         # base03
    col.nogroup_border_active = rgba(f38ba8ff)                   # base08
}

decoration {
    col.shadow          = rgba(1e1e2ebb)                         # base00 + alpha
    col.shadow_inactive = rgba(1e1e2e66)
}

group {
    col.border_active        = rgba(89b4faff)                    # base0D
    col.border_inactive      = rgba(313244ff)                    # base02
    col.border_locked_active = rgba(f9e2afff)                    # base0A
    col.border_locked_inactive = rgba(45475aff)                  # base03
    groupbar {
        col.active   = rgba(89b4faff)                            # base0D
        col.inactive = rgba(313244ff)                            # base02
        col.locked_active   = rgba(f9e2afff)                     # base0A
        col.locked_inactive = rgba(45475aff)                     # base03
    }
}
```

#### Color format rules

- Hyprland expects `rgba(RRGGBBAA)` — always 8 hex digits including alpha. `ff` = fully opaque.
- Gradient syntax: `rgba(color1) rgba(color2) <angle>deg`
- Strip the `#` from palette hex values when inserting into `rgba()`.
- Comment each color with its palette role name so the generated file is self-documenting.

#### Generator script — `gen-hyprland-colors.py`

```python
#!/usr/bin/env python3
"""Generate colors.conf from palette.toml."""
import re
from pathlib import Path

try:
    import tomllib
except ImportError:
    import tomli as tomllib  # pip install tomli on Python < 3.11

PALETTE = Path("~/.config/hypr/palette.toml").expanduser()
OUT = Path("~/.config/hypr/colors.conf").expanduser()

p = tomllib.loads(PALETTE.read_text())["colors"]

def rgba(role: str, alpha: str = "ff") -> str:
    return f'rgba({p[role].lstrip("#")}{alpha})'

content = f"""\
# colors.conf — GENERATED from palette.toml. Do not edit.

general {{
    col.active_border   = {rgba("base0D")} {rgba("base0E")} 45deg
    col.inactive_border = {rgba("base02")}
    col.nogroup_border  = {rgba("base03")}
    col.nogroup_border_active = {rgba("base08")}
}}

decoration {{
    col.shadow          = {rgba("base00", "bb")}
    col.shadow_inactive = {rgba("base00", "66")}
}}

group {{
    col.border_active          = {rgba("base0D")}
    col.border_inactive        = {rgba("base02")}
    col.border_locked_active   = {rgba("base0A")}
    col.border_locked_inactive = {rgba("base03")}
    groupbar {{
        col.active          = {rgba("base0D")}
        col.inactive        = {rgba("base02")}
        col.locked_active   = {rgba("base0A")}
        col.locked_inactive = {rgba("base03")}
    }}
}}
"""
OUT.write_text(content)
print(f"Written {OUT}")
```

**Completion criterion:** running the generator produces a syntactically valid `colors.conf`.
`hyprctl reload` succeeds; active window borders reflect the new palette immediately.

---

### 5. Propagate palette to desktop subsystems

Generate color configs for every subsystem from `palette.toml`. Never edit generated
files by hand — the generator is the authority.

#### GTK 3 / 4 — `gtk.css`

```css
/* ~/.config/gtk-3.0/gtk.css — GENERATED */
@define-color accent_color  #89b4fa;   /* base0D */
@define-color accent_bg_color #89b4fa;
@define-color accent_fg_color #1e1e2e;
@define-color window_bg_color #1e1e2e;  /* base00 */
@define-color window_fg_color #cdd6f4;  /* base05 */
@define-color view_bg_color  #181825;   /* base01 */
@define-color view_fg_color  #cdd6f4;
@define-color headerbar_bg_color #181825;
@define-color headerbar_fg_color #cdd6f4;
@define-color popover_bg_color #313244; /* base02 */
@define-color popover_fg_color #cdd6f4;
@define-color card_bg_color  #313244;
@define-color card_fg_color  #cdd6f4;
@define-color dialog_bg_color #1e1e2e;
@define-color dialog_fg_color #cdd6f4;
@define-color error_color    #f38ba8;   /* base08 */
@define-color success_color  #a6e3a1;   /* base0B */
@define-color warning_color  #f9e2af;   /* base0A */
```

Apply immediately without logout:
```bash
gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
# GTK4 apps reload gtk.css automatically; GTK3 may need a restart
```

#### Qt — `qt5ct` / `qt6ct` color scheme

```ini
# ~/.config/qt5ct/colors/<palette-name>.conf — GENERATED
[ColorScheme]
active_colors=#ffcdd6f4, #ff1e1e2e, #ff313244, #ff45475a, #ff181825, \
              #ff585b70, #ffcdd6f4, #ffffffff, #ffcdd6f4, #ff1e1e2e, \
              #ff181825, #ff313244, #ff89b4fa, #ff1e1e2e, #ff89b4fa, \
              #fff38ba8, #ffa6e3a1, #ffe0def4, #ffcdd6f4, #ff6c7086
```

Set in environment:
```bash
# ~/.config/environment.d/qt.conf
QT_QPA_PLATFORM=wayland;xcb
QT_QPA_PLATFORMTHEME=qt6ct
QT_STYLE_OVERRIDE=kvantum
```

#### Waybar — `style.css`

```css
/* ~/.config/waybar/style.css — GENERATED section */
:root {
  --base00: #1e1e2e;
  --base01: #181825;
  --base02: #313244;
  --base03: #45475a;
  --base04: #585b70;
  --base05: #cdd6f4;
  --base0D: #89b4fa;
  --base0E: #cba6f7;
  --base08: #f38ba8;
  --base0B: #a6e3a1;
}

window#waybar { background: var(--base00); color: var(--base05); }
#workspaces button.active { background: var(--base0D); color: var(--base00); }
#workspaces button.urgent { background: var(--base08); color: var(--base00); }
```

Reload waybar without killing it:
```bash
killall -SIGUSR2 waybar
```

#### Mako (notification daemon)

```ini
# ~/.config/mako/config — GENERATED section
background-color=#1e1e2eff
text-color=#cdd6f4ff
border-color=#89b4faff
progress-color=over #313244ff

[urgency=low]
border-color=#45475aff

[urgency=normal]
border-color=#89b4faff

[urgency=high]
border-color=#f38ba8ff
background-color=#1e1e2eff
```

Reload:
```bash
makoctl reload
```

#### Kitty terminal

```ini
# ~/.config/kitty/theme.conf — GENERATED; included via `include theme.conf`
background            #1e1e2e
foreground            #cdd6f4
selection_background  #313244
selection_foreground  #cdd6f4
cursor                #f5e0dc
cursor_text_color     #1e1e2e

color0  #45475a    color8  #585b70
color1  #f38ba8    color9  #f38ba8
color2  #a6e3a1    color10 #a6e3a1
color3  #f9e2af    color11 #f9e2af
color4  #89b4fa    color12 #89b4fa
color5  #cba6f7    color13 #cba6f7
color6  #94e2d5    color14 #94e2d5
color7  #bac2de    color15 #a6adc8
```

Reload without restart:
```bash
kill -SIGUSR1 $(pidof kitty)
```

**Completion criterion:** every subsystem in the audit (§1) has a generated config entry.
Running the master generator script rewrites all subsystem configs and triggers their reload
commands. No config file contains hardcoded hex values outside the generated block.

---

### 6. Implement Hyprland IPC hooks

IPC hooks let external scripts react to compositor events (workspace change, window open,
focus change, monitor connect) and re-apply theme or layout logic dynamically.

#### IPC socket protocol

```bash
# Listen to the event socket (append 2 to socket name)
SOCKET="/tmp/hypr/${HYPRLAND_INSTANCE_SIGNATURE}/.socket2.sock"
socat - "UNIX-CONNECT:${SOCKET}"

# Send a command and read JSON response
hyprctl -j activewindow
hyprctl -j workspaces
hyprctl -j clients
```

#### Event types (`.socket2.sock` stream)

```
workspace>>n             Active workspace changed to n
focusedmon>>name,ws      Monitor focus changed
activewindow>>class,title Window focused
activewindowv2>>addr     Window focused (address form)
fullscreen>>0|1          Fullscreen toggled
monitoradded>>name       Monitor plugged in
monitorremoved>>name     Monitor unplugged
createworkspace>>n       Workspace created
destroyworkspace>>n      Workspace destroyed
openwindow>>addr,ws,class,title   Window opened
closewindow>>addr        Window closed
movewindow>>addr,ws      Window moved to workspace
submap>>name             Submap activated (name=reset for normal)
changefloatingmode>>addr,0|1  Window float state changed
urgent>>addr             Urgency hint set
screencast>>0|1,owner    Screencast started/stopped
```

#### Event listener daemon — `hypr-hooks.sh`

```bash
#!/usr/bin/env bash
# hypr-hooks.sh — start as a user service or via exec-once in hyprland.conf
# exec-once = ~/.config/hypr/scripts/hypr-hooks.sh

SOCKET="/tmp/hypr/${HYPRLAND_INSTANCE_SIGNATURE}/.socket2.sock"

socat -U - "UNIX-CONNECT:${SOCKET}" | while IFS= read -r event; do
  type="${event%%>>*}"
  data="${event#*>>}"

  case "$type" in
    monitoradded)
      # Re-apply monitor layout when new display is plugged in
      ~/.config/hypr/scripts/apply-monitors.sh
      ;;
    workspace)
      # Update external workspace indicator (e.g. eww widget)
      eww update active-workspace="$data" 2>/dev/null || true
      ;;
    activewindow)
      class="${data%%,*}"
      title="${data#*,}"
      # Per-app opacity adjustment via IPC
      case "$class" in
        kitty)   hyprctl setprop address:$(hyprctl -j activewindow | jq -r .address) alpha 0.92 ;;
        firefox) hyprctl setprop address:$(hyprctl -j activewindow | jq -r .address) alpha 1.0  ;;
      esac
      ;;
    submap)
      # Show submap name in waybar custom module
      echo "$data" > /tmp/hypr-submap
      pkill -RTMIN+1 waybar 2>/dev/null || true
      ;;
  esac
done
```

Register as a user service so it auto-restarts:

```ini
# ~/.config/systemd/user/hypr-hooks.service
[Unit]
Description=Hyprland IPC event hooks
After=graphical-session.target
PartOf=graphical-session.target

[Service]
Type=simple
ExecStart=%h/.config/hypr/scripts/hypr-hooks.sh
Restart=on-failure
RestartSec=3s
Environment=HYPRLAND_INSTANCE_SIGNATURE=%i

[Install]
WantedBy=graphical-session.target
```

> [!NOTE]
> `HYPRLAND_INSTANCE_SIGNATURE` is set in the Hyprland environment. For the systemd service
> to inherit it, start it from within the Hyprland session via `exec-once` or ensure
> `systemctl --user import-environment HYPRLAND_INSTANCE_SIGNATURE` runs at session start.

#### `hyprctl dispatch` quick reference

```bash
# Window manipulation
hyprctl dispatch focuswindow class:kitty
hyprctl dispatch movetoworkspace 2,class:firefox
hyprctl dispatch setfloating address:0xADDRESS
hyprctl dispatch fullscreen 0          # real fullscreen
hyprctl dispatch fullscreen 1          # maximize (keep bar)
hyprctl dispatch pin                   # pin floating window on all workspaces
hyprctl dispatch killactive

# Layout
hyprctl dispatch layoutmsg swapwithmaster
hyprctl dispatch layoutmsg mfact 0.6

# Submap (modal keybind layers)
hyprctl dispatch submap mysubmap
hyprctl dispatch submap reset

# Batch (atomic; no round-trip per command)
hyprctl --batch \
  "dispatch workspace 1; dispatch workspace 2; keyword general:gaps_out 10"

# Keyword override (live, until reload)
hyprctl keyword general:border_size 3
hyprctl keyword decoration:rounding 12
```

**Completion criterion:** `hypr-hooks.sh` runs as a user service, starts cleanly (`systemctl --user status hypr-hooks`), handles `monitoradded` and `submap` events without crashing, and passes `shellcheck` with no errors.

---

### 7. Write the master theme-apply script

One script regenerates everything and reloads all subsystems atomically. This is the only
entry point for theme changes — humans and automation both call it.

```bash
#!/usr/bin/env bash
# ~/.config/hypr/scripts/theme-apply.sh
# Usage: theme-apply.sh [palette.toml]
set -euo pipefail

PALETTE="${1:-${XDG_CONFIG_HOME:-$HOME/.config}/hypr/palette.toml}"
SCRIPTS="${XDG_CONFIG_HOME:-$HOME/.config}/hypr/scripts"

echo "==> Applying theme from ${PALETTE}"

# 1. Generate Hyprland colors
python3 "${SCRIPTS}/gen-hyprland-colors.py" "${PALETTE}"

# 2. Generate GTK css
python3 "${SCRIPTS}/gen-gtk-css.py" "${PALETTE}"

# 3. Generate waybar CSS
python3 "${SCRIPTS}/gen-waybar-css.py" "${PALETTE}"

# 4. Generate mako config
python3 "${SCRIPTS}/gen-mako.py" "${PALETTE}"

# 5. Generate kitty theme
python3 "${SCRIPTS}/gen-kitty-theme.py" "${PALETTE}"

# 6. Reload compositor (non-blocking; avoids freeze on syntax error)
if hyprctl reload 2>&1 | grep -q "error"; then
  echo "ERROR: hyprland.conf has errors — aborting further reloads" >&2
  exit 1
fi

# 7. Reload subsystems
killall -SIGUSR2 waybar 2>/dev/null || true
makoctl reload 2>/dev/null || true
kill -SIGUSR1 "$(pidof kitty)" 2>/dev/null || true

# 8. Reload GTK settings (force refresh)
gsettings set org.gnome.desktop.interface color-scheme 'default'
gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'

echo "==> Theme applied."
```

Bind it in `hyprland.conf` for on-demand triggering:
```ini
# hyprland.conf
bind = SUPER SHIFT, T, exec, ~/.config/hypr/scripts/theme-apply.sh
```

Or hook it to wallpaper change via swww:
```bash
swww img ~/wallpapers/new.png --transition-type grow --transition-duration 2 \
  && wal -i ~/wallpapers/new.png -n -s -t \
  && ~/.config/hypr/scripts/wal-to-palette.py \
  && ~/.config/hypr/scripts/theme-apply.sh
```

**Completion criterion:** running `theme-apply.sh` with a valid palette changes border
colors (visible immediately), waybar colors, notification colors, and terminal colors —
all within 3 seconds, with no manual intervention.

---

### 8. Validate the full integration

#### Functional checklist

- [ ] `hyprctl reload` exits 0 with no parse errors after any config change.
- [ ] `hyprctl -j clients` shows correct `class` and `title` values for all running apps.
- [ ] Window rules: floating apps open floating, centered, at correct size.
- [ ] Workspace assignments: target apps open on correct workspace silently.
- [ ] Opacity rules: inactive windows show correct opacity vs. active.
- [ ] `theme-apply.sh` runs without errors and visibly changes all subsystem colors.
- [ ] Waybar reloads via SIGUSR2 (no crash, no blank bar).
- [ ] Mako notifications appear in palette colors.
- [ ] Kitty background matches `base00` within one second of theme apply.
- [ ] GTK apps (file manager, etc.) reflect new accent and background colors.
- [ ] `hypr-hooks.sh` service is `active (running)` after session start.
- [ ] `monitoradded` event triggers monitor layout script correctly.
- [ ] `submap` event updates waybar indicator.
- [ ] Nested Hyprland session (`Hyprland -c ~/.config/hypr/hyprland.conf`) starts cleanly
      (use to validate config without risking the live session).
- [ ] `shellcheck ~/.config/hypr/scripts/*.sh` passes with no errors.

**Completion criterion:** every checkbox checked. Any failure is traced to its owning step:
§3 for window rule failures, §4 for color failures, §5 for subsystem failures, §6 for IPC failures.

---

## Reference

### Hyprland config keyword quick lookup

```ini
# Gaps and borders
general {
    gaps_in  = 4
    gaps_out = 8
    border_size = 2
    layout = dwindle   # or master
}

# Decorations
decoration {
    rounding      = 10
    blur {
        enabled   = true
        size      = 8
        passes    = 2
        new_optimizations = true
    }
    drop_shadow   = true
    shadow_range  = 20
    shadow_offset = 0 5
}

# Animations
animations {
    enabled = true
    bezier  = ease, 0.4, 0, 0.2, 1
    animation = windows,     1, 4,  ease, slide
    animation = workspaces,  1, 6,  ease, slidevert
    animation = fade,        1, 4,  ease
    animation = border,      1, 10, ease
    animation = borderangle, 1, 30, ease, loop
}
```

### `hyprctl` command cheat-sheet

```bash
# Info
hyprctl version
hyprctl -j monitors
hyprctl -j workspaces
hyprctl -j clients
hyprctl -j activewindow
hyprctl -j activeworkspace
hyprctl -j layers
hyprctl -j devices           # keyboards, mice
hyprctl -j getoption general:border_size

# Live keyword overrides (lost on reload)
hyprctl keyword decoration:rounding 16
hyprctl keyword general:border_size 3
hyprctl keyword general:col.active_border "rgba(89b4faff) rgba(cba6f7ff) 45deg"

# Dispatch
hyprctl dispatch workspace 3
hyprctl dispatch exec "kitty"
hyprctl dispatch movetoworkspacesilent 2

# Reload / notify
hyprctl reload
hyprctl notify 1 3000 "rgba(a6e3a1ff)" "Theme applied"
#               ^icon ^ms  ^color        ^message
# Icons: 0=info  1=warning  2=hint  3=error  4=confused  5=ok

# Batch
hyprctl --batch "keyword general:gaps_out 12; dispatch workspace 1"
```

### Environment variables — Wayland / theming

```bash
# ~/.config/environment.d/wayland.conf  (read by systemd user environment)
WAYLAND_DISPLAY=wayland-1
XDG_SESSION_TYPE=wayland
XDG_CURRENT_DESKTOP=Hyprland
XDG_SESSION_DESKTOP=Hyprland

# GTK
GDK_BACKEND=wayland,x11
GTK_THEME=<your-gtk-theme>
XCURSOR_THEME=<cursor-theme>
XCURSOR_SIZE=24

# Qt
QT_QPA_PLATFORM=wayland;xcb
QT_QPA_PLATFORMTHEME=qt6ct
QT_WAYLAND_DISABLE_WINDOWDECORATION=1

# SDL / other
SDL_VIDEODRIVER=wayland
CLUTTER_BACKEND=wayland
MOZ_ENABLE_WAYLAND=1          # Firefox native Wayland
ELECTRON_OZONE_PLATFORM_HINT=wayland
```

### XDG autostart vs. `exec-once` vs. user service

| Method | Runs when | Restarts? | Best for |
|---|---|---|---|
| `exec-once` in hyprland.conf | Compositor starts | No | Simple launchers, bars |
| `exec` in hyprland.conf | Every reload | No | Never — use exec-once |
| XDG autostart (`~/.config/autostart/*.desktop`) | Desktop session | No | Portable apps |
| `systemd --user` service | Session target | Yes (configurable) | Daemons, event hooks |

> [!WARNING]
> Avoid editing `~/.config/hypr/hyprland.conf` while Hyprland is running without first
> validating the change in a nested session. A bad `col.` value or malformed `source =`
> path can cause `hyprctl reload` to silently fail mid-reload, leaving the compositor in
> a partially configured state. Always run `systemd-analyze verify` on unit files and test
> configs in `Hyprland -c` before writing to the live config path.
