---
name: ansi-nerd-font-glyph-stylist
description: Standardize ANSI escape codes, box-drawing characters, and Nerd Font glyph alignment for consistent rendering across terminal emulators. Use when asked to "style terminal output", "fix box-drawing glyphs", "align Nerd Font icons", "ANSI color fallbacks", "standardize terminal UI", "fix glyph width", or "make TUI portable". Not for self-hosting web fonts (use foss-font-bundler).
metadata:
  version: '1'
---
# ANSI & Nerd Font Glyph Stylist

Standardizes box-drawing characters, ANSI color fallbacks, and Nerd Font icon alignment
so terminal output renders predictably across emulators, multiplexers, and color depths.

> [!IMPORTANT]
> Run the **audit** step first every time — never apply fixes before confirming what the
> target emulator actually supports. Assumptions cause worse breakage than the original problem.

---

## Steps

### 1. Audit the target environment

Collect the four facts that determine every downstream decision:

| Fact | How to collect it |
|---|---|
| **Color depth** | `$COLORTERM` (`truecolor`/`24bit`), `$TERM` (e.g. `xterm-256color`), or `tput colors` |
| **Font support** | Query user: is a [Nerd Font](https://www.nerdfonts.com/) patched font active in the terminal? |
| **Emulator** | `$TERM_PROGRAM`, `$TERMINAL`, or ask (kitty / Alacritty / iTerm2 / tmux / SSH-only, etc.) |
| **Unicode width** | Does the emulator use [`wcwidth`](https://www.mankier.com/3/wcwidth) correctly? Test with a known double-wide glyph (e.g. `echo -e '\ue0b0'` and check column shift). |

**Completion criterion:** all four facts are known. Do not proceed with any fact missing.

---

### 2. Select the color strategy

Choose one tier based on color depth; apply it uniformly — no mixing tiers.

#### Tier table

| Depth | Condition | Escape form |
|---|---|---|
| **True color** | `$COLORTERM=truecolor` or `24bit` | `\e[38;2;R;G;Bm` / `\e[48;2;R;G;Bm` |
| **256-color** | `tput colors` ≥ 256 | `\e[38;5;Nm` / `\e[48;5;Nm` |
| **16-color** | `tput colors` ≥ 8 | `\e[30–37m` / `\e[40–47m` + bright `\e[90–97m` |
| **No-color** | `$NO_COLOR` set, or `tput colors` < 8 | Emit zero escape codes; use Unicode symbols for state only |

**Fallback rule:** when unsure, default one tier down. A 256-color palette always degrades
cleanly to 16-color; true-color never degrades to anything readable unassisted.

**Reset discipline:** every styled span must end with `\e[0m` (full reset) or `\e[39m`/`\e[49m`
(foreground/background reset only). Naked resets left open are the leading cause of color bleed.

---

### 3. Standardize box-drawing characters

Box-drawing must be chosen from the right Unicode block for the emulator's font coverage.

#### Block reference

| Block | Range | Use when |
|---|---|---|
| **Basic box-drawing** | U+2500–U+257F | Universal safe baseline; all modern terminals |
| **Block elements** | U+2580–U+259F | Half-blocks, braille; use only after confirming font coverage |
| **Nerd Font powerline** | U+E0A0–U+E0D4 | Patched font confirmed; powerline segment dividers |
| **Nerd Font extra** | U+E000–U+F8FF (PUA) | Patched font confirmed; icons and glyphs from PUA range |

#### Canonical box pieces

Use these exact codepoints for all structural chrome:

```
Corners : ╭ U+256D  ╮ U+256E  ╰ U+2570  ╯ U+256F  (rounded)
           ┌ U+250C  ┐ U+2510  └ U+2514  ┘ U+2518  (sharp)
Horizontals: ─ U+2500  ━ U+2501  (thin / heavy)
Verticals  : │ U+2502  ┃ U+2503  (thin / heavy)
T-joints   : ├ U+251C  ┤ U+2524  ┬ U+252C  ┴ U+2534  ┼ U+253C
Heavy T    : ┣ U+2523  ┫ U+252B  ┳ U+2533  ┻ U+253B  ╋ U+254B
Double     : ═ U+2550  ║ U+2551  ╔ U+2554  ╗ U+2557  ╚ U+255A  ╝ U+255D
```

**Consistency rule:** pick one corner style (rounded vs. sharp vs. double) per visual layer
and never mix within a single box. Mixing signals an _inconsistent_ layer boundary to the reader.

---

### 4. Align Nerd Font glyphs

Nerd Font icons are single-codepoint PUA characters but many terminals count them as
ambiguous-width or double-wide. Apply all three alignment fixes:

#### 4a. Width normalization

- Treat every Nerd Font icon as **exactly one column wide** in layout math, unless you have
  confirmed the emulator applies double-width rendering for that codepoint range.
- Kitty and Alacritty: typically single-wide. GNOME Terminal / VTE: may render double-wide.
- When in doubt, follow each icon with a **padding space** (`\u0020`) so the cursor lands
  one column past the glyph regardless of emulator width interpretation. This is the
  _safe padding_ idiom — a single character overhead, universal fix.

#### 4b. Icon–text gap

Maintain exactly **one space** between an icon and its adjacent label text:

```
 icon + " " + label          ✓  consistent eye-line
 icon + "  " + label         ✗  gap breaks optical baseline
 icon + label                ✗  glyph may bleed into first character
```

#### 4c. Vertical centering in box rows

When an icon appears inside a box-drawing row, the row must account for the icon's visual
weight. Use a thin space (`\u2009`) or hair space (`\u200A`) only when the emulator supports
Unicode spacing characters. Otherwise use a standard space and accept the slight offset;
do not use zero-width joiner (U+200D) as a spacer — it is semantically a joiner, not a space.

---

### 5. Apply emulator-specific overrides

Handle the five common emulator families:

| Emulator | Known quirks | Override |
|---|---|---|
| **kitty** | Full true-color; underline colors (`\e[58;2;R;G;Bm`); single-wide PUA | No special workaround needed; use full feature set |
| **Alacritty** | True-color; no italic via `\e[3m` in some configs | Test italic; fall back to bold (`\e[1m`) if italic renders as blank |
| **tmux** | Strips `\e[` sequences if `terminal-overrides` unset; needs `Tc` flag for true-color pass-through | Wrap sequences; set `set -g default-terminal "tmux-256color"` and `set -ga terminal-overrides ",*256col*:Tc"` |
| **GNU Screen** | 8-color by default; 256-color needs `term xterm-256color` in `.screenrc` | Downgrade to 16-color tier unless confirmed 256-color |
| **SSH / headless** | `$TERM` often `xterm` or `vt100`; `$COLORTERM` absent | Default to 16-color; skip Nerd Font glyphs; substitute ASCII fallbacks (see §6) |

**Completion criterion:** every emulator in the target list has an explicit override decision recorded,
even if that decision is "no override needed."

---

### 6. Define ASCII fallbacks

For every Nerd Font icon used, specify an ASCII or basic-Unicode substitute activated when
Nerd Font support is absent. Store the mapping as a table, not inline conditionals:

```
# Example fallback table (adapt to actual icons used)
Icon codepoint  → Nerd Font  │ Fallback (no font)
─────────────────────────────┼──────────────────
\uF016 (file)   →            │ [F]
\uF115 (folder) →            │ [D]
\uF00C (check)  →            │ [+]
\uF00D (cross)  →            │ [x]
\uE0B0 (arrow)  →            │ >
\uF441 (branch) →            │ *
\uF7D9 (lock)   →            │ [L]
```

**Activation:** check `$NERD_FONT` (user-set convention) or the font-support fact from §1.
Gate every glyph emission behind a function, not a bare conditional — the function is a
_single source of truth_ for the font-availability test.

---

### 7. Validate the output

Run all three checks before marking the work done:

1. **Visual diff**: render the output side-by-side in the target emulator and a fallback
   (e.g. xterm + no Nerd Font). Screenshot or record both. Confirm no color bleed, no
   misaligned columns, no box-drawing gaps.

2. **Column count**: for every row in a box, assert `rendered_width == declared_width` using
   the emulator's cursor position reporting (`\e[6n` DSR sequence) or a scripted `tput`
   measurement. A one-column drift means an unhandled double-wide glyph.

3. **No-color smoke test**: set `NO_COLOR=1` and re-render. Confirm the output is legible
   ASCII-only text — no raw escape codes visible, no empty boxes.

**Completion criterion:** all three checks pass with no exceptions. Any failure resets to
the step that introduced the defect (§2 for color bleed, §3–4 for column drift, §6 for no-color failure).

---

## Reference

### ANSI escape sequences — quick lookup

```
Style modifiers
  \e[0m   reset all       \e[1m  bold       \e[2m  dim
  \e[3m   italic          \e[4m  underline  \e[7m  reverse
  \e[9m   strikethrough   \e[22m normal weight

Foreground (standard 16)
  Black \e[30m  Red \e[31m  Green \e[32m  Yellow \e[33m
  Blue  \e[34m  Magenta \e[35m  Cyan \e[36m  White \e[37m
  Bright variants: \e[90m–\e[97m

Background: same codes +10 (e.g. \e[41m = red bg)

256-color:  \e[38;5;Nm  (fg)  \e[48;5;Nm  (bg)   N = 0–255
True-color: \e[38;2;R;G;Bm (fg)  \e[48;2;R;G;Bm (bg)

Underline color (kitty extension):
  \e[58;2;R;G;Bm   set  |  \e[59m  reset
```

### Nerd Font PUA ranges

```
Seti-UI / Custom         U+E000–U+E0A9
Devicons                 U+E0A0–U+E0FF
Powerline Extra          U+E0A0–U+E0D4
Font Awesome             U+F000–U+F2E0
Font Awesome Extension   U+E200–U+E2A9
Material Design          U+F0001–U+F1AF0 (requires font v3+)
Octicons                 U+F400–U+F533
Codicons                 U+EA60–U+EBEB
Pomicons                 U+E000–U+E00D
Weather                  U+E300–U+E3E3
```

> [!NOTE]
> Nerd Fonts v3 moved several glyphs. If icons render as tofu (□) on a patched font, the
> font version and the codepoint table may be mismatched. Confirm with `nf-core` or the
> [Nerd Fonts cheat sheet](https://www.nerdfonts.com/cheat-sheet).

### 256-color palette landmarks

```
System 16  : 0–15   (terminal-defined; never rely on exact RGB)
Grayscale  : 232–255 (black → white in 24 steps, no hue)
Color cube : 16–231  (6×6×6 RGB cube; formula: 16 + 36r + 6g + b)
```

### Shell helper: glyph-safe emit function

Paste this into shell scripts to gate glyph emission correctly:

```bash
# Returns 0 if Nerd Font glyphs are safe to emit
_nf_available() {
  [[ "${NERD_FONT:-}" == "1" ]] && return 0
  [[ "${TERM_PROGRAM:-}" == "iTerm.app" ]] && return 0
  [[ "${TERM_PROGRAM:-}" == "WezTerm" ]] && return 0
  return 1
}

# Emit glyph or fallback
glyph() {
  local nf="$1" fallback="$2"
  if _nf_available; then
    printf '%b' "$nf"
  else
    printf '%s' "$fallback"
  fi
}

# Usage:
# glyph $'\uF00C' '[+]'   →  or [+]
```

> [!TIP]
> Expose `NERD_FONT=1` as a user-set environment variable (documented in your project's
> README) rather than auto-detecting it from `$TERM_PROGRAM`. Auto-detection lists grow stale;
> explicit opt-in does not.
