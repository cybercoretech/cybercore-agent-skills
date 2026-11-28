---
name: cyberpunk-neon-palette
description: Build dark-mode cyberpunk and high-contrast neon colour systems that pass WCAG contrast, with disciplined glow and border rules that add atmosphere without clutter. Use when asked for a "neon palette", "cyberpunk theme", "synthwave colours", "dark mode tokens", "glowing borders", "neon glow CSS", "high-contrast dark theme", "check colour contrast", "WCAG contrast for a dark theme", "accent colours for a terminal or editor look", or when a dark neon UI looks cluttered, washed out or hard to read. Not for extracting tokens or adding a theme switcher (use design-token-theme-switcher).
metadata:
  version: '1'
---
# Cyberpunk & High-Contrast Neon Palette Generator

Produces dark-mode colour tokens with neon accents, proves every text and control colour
meets WCAG contrast, and applies glow and border rules that keep a neon interface readable.

> [!CAUTION]
> Neon on near-black is easy to make beautiful and easy to make unreadable. Contrast is not
> negotiable: **every text colour passes 4.5:1 on every surface it can appear on, and every
> control boundary and focus ring passes 3:1.** Glow is a garnish. It never carries meaning,
> never sits behind body text, and never fills the screen. Run the checker (§3) on every
> palette before it ships, and again after any colour edit.

---

## Steps

### 1. Read the context first

- Find the existing colour system: CSS custom properties, Tailwind `@theme`, a design-token
  file, or a component library theme. **Extend it; never fork a second palette.**
- **Runtime theme switcher present** (for example the Cybercore theme chooser, which paints
  `--bg --white --panel --line --muted --acid --pink --purple --cyan --orange --red` on
  `<html>`)? Then build on those variable names and never hard-code hex values in
  components. Generate with `--names cybercore`.
- Note where colours appear: surfaces (page, panel, raised panel, popover), text (body,
  muted, code), controls (buttons, inputs, links), states (hover, focus, selected, error),
  data (chart series).

**Completion criterion:** you know the token names in use, whether a theme switcher repaints
them, and every surface a text colour can land on.

---

### 2. Token architecture (dark only)

| Role | Rule | Typical OKLCH lightness |
|---|---|---|
| `bg` | Near-black **tinted** toward the brand hue, never pure `#000` | 0.13–0.16 |
| `surface` | One step up for panels and cards | 0.17–0.20 |
| `surface-raised` | Popovers, menus, sheets | 0.21–0.24 |
| `border` | Control boundaries: **3:1 against `bg`**. Decorative dividers may be fainter. | 0.40–0.50 |
| `text` | Off-white, never pure `#fff` (it halates on near-black). Aim for 12:1 or higher. | 0.88–0.93 |
| `text-muted` | Secondary text, still **≥ 4.5:1** on the lightest surface it sits on | 0.62–0.70 |
| Accents (2–6) | High chroma, lightness raised until each passes 4.5:1 on every surface | 0.74–0.85 |
| `focus` | One accent reserved for focus rings, ≥ 3:1 against adjacent colours | as accent |
| `glow-*` | Derived from accents with `color-mix()`, low alpha | n/a |

Rules:
- **Work in OKLCH.** Equal lightness means equal perceived brightness across hues, so cyan,
  pink and acid accents look equally loud. Hex picked by eye gives a blinding yellow next to
  a dim blue.
- **Few accents with fixed jobs:** one primary (actions, links, focus), one secondary
  (highlights, kickers), the rest for status (success/warning/danger) and data series. An
  accent with no job is clutter.
- **Status colours never rely on hue alone:** pair them with an icon, label or pattern.
  Red/green and pink/purple pairs are confusable for many viewers.
- `color-scheme: dark` on `:root` so form controls and scrollbars match.

**Completion criterion:** every token has a role, and no component uses a raw colour.

---

### 3. Generate or check the palette (bundled script)

```bash
# Generate (CSS on stdout, contrast report on stderr; exit 1 if any rule fails)
python3 <this-skill-dir>/scripts/neon_palette.py generate
python3 <this-skill-dir>/scripts/neon_palette.py generate --bg-hue 280 --hues cyan=200,pink=350,acid=128
python3 <this-skill-dir>/scripts/neon_palette.py generate --names cybercore --format json

# Check an existing stylesheet's hex tokens
python3 <this-skill-dir>/scripts/neon_palette.py check src/styles/tokens.css [--names cybercore]
```

The generator builds every token in OKLCH, gamut-maps it into sRGB by reducing chroma (keeping
lightness and hue), then **raises lightness until the contrast rule passes** on all three
surfaces. Default run (all 26 pairs pass):

```css
:root {
  color-scheme: dark;
  --bg: #050b12;  --surface: #0b131c;  --surface-raised: #131d27;
  --border: #515f6e;  --text-muted: #7b8895;  --text: #d5dbe3;
  --cyan: #00c2ca;  --pink: #ff71bb;  --acid: #87c010;
  --purple: #bb91ff;  --orange: #ff8505;  --red: #ff7e77;
  --focus: var(--cyan);
  --glow-cyan: color-mix(in oklab, var(--cyan) 28%, transparent);  /* …one per accent */
}
```

Check-mode results:
- **FAIL** (exit 1): text, muted text or an accent below 4.5:1 on a surface, or the focus ring
  below 3:1 against `bg`.
- **WARN**: `border`/`line` below 3:1. That's fine for decorative dividers. Input and button
  outlines need a separate border token that reaches 3:1 (WCAG 1.4.11).

Fixing a failure: **raise OKLCH lightness** of the foreground (or lower the surface). Don't
reduce chroma first, because the neon character comes from chroma. Re-run the check after
every change.

**Completion criterion:** the script exits 0, and any WARN is a decorative divider by intent.

---

### 4. Contrast rules beyond the token pairs

| Element | Minimum (WCAG 2.2 AA) | Notes |
|---|---|---|
| Body and UI text | 4.5:1 | Includes placeholder text, table text, code |
| Large text (≥ 24px, or ≥ 18.66px bold) | 3:1 | Neon headings may use this, body text may not |
| Long-form reading | Aim for 7:1 (AAA) | Docs and articles on dark backgrounds |
| Control boundaries (inputs, toggles, unfilled buttons) | 3:1 against adjacent colours | Decorative borders exempt |
| Focus indicator | 3:1 against adjacent colours, clearly visible | A 2px outline with an offset beats a glow |
| Icons that carry meaning | 3:1 | Decorative icons exempt |
| Text **on** a neon fill (primary button label) | 4.5:1 | Usually dark text (`bg`) on the neon, not white |
| Disabled controls | Exempt | Still distinguishable from the background |

Never:
- Neon text on a neon fill, or two saturated accents touching (they vibrate).
- Text over a glow, gradient, image or scanline layer without checking the **worst** pixel
  behind it (use a solid or scrim panel instead).
- Colour as the only signal for state, error or selection.

**Completion criterion:** every text element has a checked pair, including placeholders,
button labels on fills, and text over any effect layer.

---

### 5. Glow and border rules (no clutter)

**The glow budget:** at rest, **at most one glowing focal element per viewport** (the hero
headline, the primary call to action, or a live status). Everything else glows only on
**interaction** (hover, focus, active) or **state** (selected, alert). If three things glow,
nothing is the focus.

| Rule | Do | Don't |
|---|---|---|
| Where | Edges of controls, cards on hover, one focal element | Paragraphs, every card at rest, whole sections |
| Colour | `--glow-*` from `color-mix()` with the accent, 20–35% alpha | Fixed hex glows (theme switches can't repaint them) |
| Size | One layer, blur 8–24px | Stacks of three or more shadows, 60px+ blooms |
| Text glow | Display headings ≥ 32px only, one `text-shadow`, low alpha | Body text, labels, small UI text (it blurs the letterforms) |
| Borders | 1px lines; accent-coloured border = role or state | An accent border on everything |
| Shape | Square or low-radius edges suit the genre | Pill shapes plus glow plus gradient on one element |
| Texture | Scanlines, grid or noise at ≤ 4% opacity, behind content | Texture over text blocks |
| Motion | Pulse ≥ 2s per cycle, subtle; never flash > 3 times per second | Flicker effects on text; animated glows on many elements |

Recipes:

```css
/* Primary action: dark label on neon fill, glow on hover/focus only */
.btn-primary {
  background: var(--cyan); color: var(--bg);
  border: 1px solid var(--cyan); border-radius: 0;
  transition: box-shadow .15s ease, transform .15s ease;
}
.btn-primary:hover { box-shadow: 0 0 0 1px var(--cyan), 0 0 16px var(--glow-cyan); }

/* Ghost / secondary */
.btn-ghost { background: transparent; color: var(--cyan); border: 1px solid var(--border); }
.btn-ghost:hover { border-color: var(--cyan); box-shadow: 0 0 12px var(--glow-cyan); }

/* Focus: a real outline first, glow optional on top */
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }

/* Card: quiet at rest, lit on hover; role colour on the top edge only */
.card { background: var(--surface); border: 1px solid var(--border); border-top: 2px solid var(--pink); }
.card:hover { box-shadow: 0 0 20px var(--glow-pink); }

/* The one focal glow per view */
.hero h1 em { color: var(--pink); text-shadow: 0 0 18px var(--glow-pink); }

/* Inputs: boundary meets 3:1; focus adds the accent */
input, select, textarea { background: var(--bg); color: var(--text); border: 1px solid var(--border); }
input:focus-visible { border-color: var(--focus); box-shadow: 0 0 0 3px var(--glow-cyan); outline: none; }
input::placeholder { color: var(--text-muted); }   /* placeholder must pass 4.5:1 too */
```

**Completion criterion:** count glowing elements at rest in each viewport (≤ 1), no glow
on body text, every glow comes from a `--glow-*` token.

---

### 6. Accessibility media queries (always ship these)

```css
/* Users who asked for more contrast: drop glows, strengthen borders, solid text */
@media (prefers-contrast: more) {
  :root { --border: var(--text-muted); }
  * { text-shadow: none !important; box-shadow: none !important; }
  :focus-visible { outline-width: 3px; }
}

/* Windows high-contrast / forced colours: let system colours win; keep outlines */
@media (forced-colors: active) {
  * { text-shadow: none !important; box-shadow: none !important; }
  .btn-primary, .btn-ghost, input { border: 1px solid ButtonText; }
  :focus-visible { outline: 2px solid Highlight; }
}

/* Reduced motion: no pulsing or flickering glows */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition-duration: .01ms !important; }
}
```

**Completion criterion:** all three blocks are present, and the page is usable with each
one emulated in DevTools (Rendering panel).

---

### 7. Data and charts in a neon palette

- Series colours from the accent tokens in a fixed order. Adjacent series differ in
  **lightness**, not just hue, so they stay distinct for colour-blind viewers and in
  greyscale.
- Grid lines from `--border` at reduced opacity; axis text from `--text-muted` (4.5:1).
- Highlight one series with glow at most; the rest stay flat.
- Repaint charts when the theme changes (listen for the switcher's event, for example
  Cybercore's `cc:theme`).

**Completion criterion:** the chart reads in greyscale, and series are labelled directly or
by legend with markers.

---

### 8. Verify on the rendered page

```bash
python3 <this-skill-dir>/scripts/neon_palette.py check <tokens.css>   # tokens
npx @axe-core/cli http://localhost:4321 --tags wcag2a,wcag2aa          # rendered contrast
```

- DevTools colour picker shows the contrast ratio on any text element; check text over glows
  and textures at the **worst** spot.
- DevTools → Rendering → emulate vision deficiencies (protanopia, deuteranopia,
  tritanopia, achromatopsia): states and series must still be distinguishable.
- Emulate `prefers-contrast: more`, `forced-colors: active` and `prefers-reduced-motion`.
- Screenshot at 2× device pixel ratio on the real dark background: glows that look subtle
  at 1× can bloom at 2×.
- With a theme switcher: re-run the checks on the lightest and the most saturated themes.

#### Final checklist

- [ ] Script check exits 0; WARNs are decorative dividers only.
- [ ] Placeholders, button labels on fills, and text over effects all pass 4.5:1.
- [ ] Focus is visible on every control (3:1 outline), not glow-only.
- [ ] ≤ 1 glowing element at rest per viewport; no glow on body text.
- [ ] No raw hex in components; glows derive from tokens.
- [ ] High-contrast, forced-colours and reduced-motion blocks present and tested.
- [ ] States and chart series readable under colour-blindness emulation.

**Completion criterion:** every checklist item checked.

---

## Reference

### WCAG 2.x contrast formula (what the script computes)

```
channel c in 0..1:   lin = c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)^2.4
luminance L = 0.2126 R + 0.7152 G + 0.0722 B          (linear values)
ratio = (L_lighter + 0.05) / (L_darker + 0.05)         range 1:1 … 21:1
```

Reference values the script reproduces: `#fff`/`#000` 21:1, `#767676`/`#fff` 4.54:1,
`#777777`/`#fff` 4.48:1, `#0000ff`/`#fff` 8.59:1.

WCAG 2's formula is the legal and audit standard today. APCA (the candidate method for WCAG 3)
models dark mode better, but don't use it in place of the WCAG 2 checks while WCAG 2 is what
audits test.

### Neon anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Pure `#000` background + pure `#fff` text | Halation; text appears to smear | Tinted near-black + off-white |
| Muted text at 3:1 "because it's secondary" | Fails WCAG; unreadable on phones in daylight | Muted ≥ 4.5:1 |
| Glow on every card and button at rest | No focal point; looks like a casino | Glow budget: 1 at rest, rest on interaction |
| Neon text on a neon fill | Vibrating edges, fails contrast | Dark text on neon fill |
| Hex-coded glows | Theme switch leaves stale glows | `color-mix()` from accent tokens |
| Blue accent equally saturated as yellow, picked by eye | Blue looks dim, yellow blinding | Equal OKLCH lightness |
| Focus shown only by a soft glow | Invisible to many users; fails 2.4.7/2.4.11 intent | 2px outline with offset |
| Scanline/noise overlay over text | Lowers effective contrast unpredictably | Effects behind content, ≤ 4% opacity |
