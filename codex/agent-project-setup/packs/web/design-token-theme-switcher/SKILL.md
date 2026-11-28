---
name: design-token-theme-switcher
description: Extract hard-coded colours, spacing and radii from CSS and components into semantic design tokens (CSS custom properties, with TOML theme files as the source of truth), and add instant, flash-free theme switching. Use when asked to "extract design tokens", "replace hardcoded colors", "tokenize the CSS", "create a design system", "add dark mode", "add a theme switcher", "theme toggle", "multiple themes", "CSS variables for theming", "spacing scale", "consolidate colours", "TOML theme", or "stop the theme flash on reload". Not for Omarchy desktop themes (use omarchy-plugin-theme).
metadata:
  version: '1'
---
# Design-System Token & Theme Switcher

Finds every hard-coded colour, spacing value and radius, consolidates near-duplicates,
proposes semantic tokens, rewrites the code to use them, compiles any number of themes from
TOML files, and adds a switcher that changes themes instantly without a flash on load.

> [!CAUTION]
> Rewriting literals touches many files at once. Commit (or stash) first, always run `apply`
> as a **dry run** and read the diff, and keep the default theme **visually identical**
> before and after the refactor: tokenization changes names, not looks. If the project
> already has a theme system (for example the Cybercore theme chooser and its eleven
> variables), extract **into those names**; never introduce a competing switcher.

---

## Steps

### 1. Scan what's hard-coded

```bash
T=<this-skill-dir>/scripts/tokenize.py
python3 $T scan src/                      # .css .scss .less .astro .vue .svelte .html .jsx .tsx
```

Real output on a small project:

```
color: 13 literal(s), 9 distinct
  #e6edf3      x3    e.g. src/Widget.vue:3
  #131a22      x2    e.g. src/Widget.vue:3
  …
space: 9 literal(s), 5 distinct        (rem converted to px at 16px)
radius: 4 literal(s), 3 distinct
near-duplicate colours (likely the same intent):
  #00e5ff ~ #00e4fe  (ΔOKLab 0.003)
```

`scan` normalises `#abc`, `#aabbcc`, `rgb()`, `rgba()`, `hsl()` and `hsla()` to hex, skips
existing custom-property definitions, and lists colours that are perceptually the same
(OKLab distance < 0.02).

Decide the scope: which folders are yours (skip vendored CSS, third-party themes, logos and
illustrations whose colours are part of the artwork).

**Completion criterion:** you know how many literals exist, which near-duplicates are the
same intent, and which files are out of scope.

---

### 2. Token architecture

| Tier | Example | Used by |
|---|---|---|
| **Semantic (role)** | `--bg`, `--surface`, `--surface-raised`, `--text`, `--text-muted`, `--border`, `--primary`, `--primary-contrast`, `--danger`, `--focus` | **Components; the only tier they may use** |
| Scales | `--space-1…n` (4, 8, 12, 16, 24, 32…), `--radius-xs…full` | Components |
| Primitives (optional) | `--cyan-500` | Only theme files, never components |

Naming rules:
- **Name by role, not value.** `--primary`, not `--cyan`; `--surface`, not `--gray-900`.
  A light theme changes the value; the role name still fits.
- Pair every fill with its readable foreground: `--primary` + `--primary-contrast`.
- State tokens where states differ by theme: `--primary-hover`, `--border-strong`,
  `--selection`.
- **Don't tokenize:** `0`, hairline `1px` widths, percentages, unitless line-heights. Keep
  z-index and breakpoints as their own small scales.
- **Breakpoints can't be custom properties:** `@media (min-width: var(--bp))` doesn't
  work. Use container queries, or a preprocessor or build constant.

**Completion criterion:** a list of semantic roles the UI needs, mapped from the scan.

---

### 3. Extract tokens (TOML is the source of truth)

```bash
python3 $T extract src/ --toml themes/midnight.toml --css src/styles/tokens.css --name midnight
```

`extract` merges near-duplicates into the most used colour, then guesses each colour's role
from where it's used (backgrounds → `bg-n`, text → `text-n`, borders → `border-n`, shadows
→ `shadow-n`, vivid colours → `accent-n`), orders backgrounds dark-to-light and text
light-to-dark, builds the spacing and radius scales, and detects dark or light mode from the
main background. It writes:

```toml
[meta]
name = "midnight"
mode = "dark"          # sets color-scheme

[color]
"text-1" = "#e6edf3"   # rename → "text"
"bg-1" = "#0b0f14"     # rename → "bg"
"accent-1" = "#00e5ff" # rename → "primary"

[space]
"1" = "4px"
"2" = "8px"

[radius]
"xs" = "4px"
"full" = "9999px"
```

**Now rename the keys to the semantic names from §2.** The script can't know intent, so
`bg-2` might be `surface` or `surface-raised`. Variable names follow the sections:
`[color] key` → `--key`, `[space] key` → `--space-key`, `[radius] key` → `--radius-key`.

**Completion criterion:** every key in the TOML has a semantic name, and the merges listed
by `extract` were intended.

---

### 4. Apply: rewrite literals to tokens

```bash
python3 $T apply src/ --toml themes/midnight.toml            # dry run: prints a unified diff
python3 $T apply src/ --toml themes/midnight.toml --write    # edits files, keeps <file>.bak
python3 $T scan src/                                         # should report 0 literals in scope
```

Real diff excerpt:

```diff
-.btn { background: rgb(0, 229, 255); color: #0b0f14; border-radius: 4px; padding: 8px 16px; }
+.btn { background: var(--primary); color: var(--bg); border-radius: var(--radius-xs); padding: var(--space-2) var(--space-4); }
-.btn:hover { background: #00e4fe; }
+.btn:hover { background: var(--primary); }
note: src/app.css: #00e4fe -> --primary (near-duplicate, ΔOKLab 0.003)
```

- Exact matches are replaced, and near-duplicates map to the nearest token (each one is
  listed as a `note:` so you can check it). Spacing in `rem` is matched through its px value.
- Values with no matching token are left alone; `scan` afterwards shows what remains.
- Review `note:` lines: a hover colour that was *meant* to differ should get its own token
  (`--primary-hover`) instead of being merged.
- Delete the `.bak` files once the diff is committed and the page looks identical.

**Completion criterion:** `scan` reports zero literals in scope (or only documented
exceptions), and a screenshot of the default theme matches the pre-refactor screenshot.

---

### 5. Build themes from TOML

Copy the default theme file, change values (never keys), and compile:

```bash
python3 $T build themes/midnight.toml themes/daylight.toml --out src/styles/themes.css --default midnight
```

```css
/* generated by tokenize.py build — edit the TOML, not this file */
:root, [data-theme="midnight"] {
  color-scheme: dark;
  --text: #e6edf3;  --bg: #0b0f14;  --primary: #00e5ff;  --space-2: 8px;  /* … */
}
[data-theme="daylight"] { color-scheme: light; --text: #14181d; --bg: #f7f9fb; /* … */ }
```

- `build` **fails (exit 1) if any theme is missing a token another theme defines**, because a
  missing token leaves the previous theme's value on screen after a swap.
- Spacing and radius usually stay identical across themes. Keep them in every file anyway
  (a "compact" theme may change them).
- Check contrast for **every** theme: text pairs ≥ 4.5:1, controls and focus ≥ 3:1. Check
  each theme **on its own**, because a checker reading the combined file sees only one
  value per variable. With the `cyberpunk-neon-palette` skill's checker:

  ```bash
  for t in themes/*.toml; do
    python3 $T build "$t" --out "/tmp/check-$(basename "$t" .toml).css" >/dev/null
    python3 <palette-skill-dir>/scripts/neon_palette.py check "/tmp/check-$(basename "$t" .toml).css" | tail -1
  done
  ```

  The most common failure is a light theme that kept the dark theme's muted grey: it passes
  on near-black and fails on white.
- TOML suits this because desktop and terminal tools (Alacritty, Helix, Starship) use it,
  so one theme file can feed web and desktop generators.

**Completion criterion:** `build` exits 0, and every theme passes contrast.

---

### 6. The theme switcher (no flash, accessible, persistent)

**1. Apply the theme before first paint**: an inline script at the top of `<head>`, before
any stylesheet:

```html
<script>
  (() => {
    const saved = localStorage.getItem("theme");
    const system = matchMedia("(prefers-color-scheme: light)").matches ? "daylight" : "midnight";
    document.documentElement.dataset.theme = saved || system;
  })();
</script>
```

**2. The control**: a labelled `<select>` (or a radio group) for several themes; a
`<button aria-pressed>` only for a two-state toggle.

```html
<label for="theme">Theme</label>
<select id="theme"><option value="midnight">Midnight</option><option value="daylight">Daylight</option></select>
```

**3. Switch instantly, persist, and notify**:

```js
const root = document.documentElement, select = document.getElementById("theme");
select.value = root.dataset.theme;
function setTheme(name, persist = true) {
  root.classList.add("theme-switching");              // suppress every transition for one frame
  root.dataset.theme = name;
  if (persist) localStorage.setItem("theme", name);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",
    getComputedStyle(root).getPropertyValue("--bg").trim());
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
  root.dispatchEvent(new CustomEvent("themechange", { detail: { name } }));  // canvases, charts
}
select.addEventListener("change", () => setTheme(select.value));
addEventListener("storage", (e) => e.key === "theme" && e.newValue && setTheme(e.newValue, false)); // other tabs
matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
  if (!localStorage.getItem("theme")) setTheme(e.matches ? "daylight" : "midnight", false);
});
```

```css
.theme-switching, .theme-switching * { transition: none !important; }
```

**Server-rendered frameworks** (Next.js, Nuxt, SvelteKit, Astro SSR): also store the theme in
a cookie and render `data-theme` on `<html>` on the server, so the server's markup and the
client's agree (no hydration warning, no flash). Keep the inline script as the fallback for
first visits.

**Existing switchers win:** on Cybercore sites the shared theme chooser is the only theme
control. Map extracted tokens onto its variables (`--bg --white --panel --line --muted --acid
--pink --purple --cyan --orange --red`, or `window.SITE.themeVars`) and listen for its
`cc:theme` event instead of adding this switcher.

**Completion criterion:** reloading in any theme shows no flash of the default; the choice
persists and syncs across tabs; the control works by keyboard and has a visible label.

---

### 7. Make everything read the tokens

| Consumer | How |
|---|---|
| Tailwind v4 | `@theme inline { --color-bg: var(--bg); --color-primary: var(--primary); --spacing: var(--space-1); }` so utilities follow the theme at runtime |
| Component libraries | Map the library's variables to yours (shadcn `--background: var(--bg)`, DaisyUI `--color-base-100: var(--bg)`, MUI with `cssVariables: true`) |
| CSS-in-JS | Use `var(--token)` in styles, not JS theme objects, so swaps need no re-render |
| Canvas, SVG, charts | Read `getComputedStyle(root).getPropertyValue("--primary")` on load and on `themechange` |
| Inline SVG icons | `fill: currentColor` / `stroke: currentColor` |
| Images | Provide theme-specific assets with `<picture>` + `prefers-color-scheme` only when a swap needs them |

**Completion criterion:** switching themes repaints every surface, including charts and
icons; nothing keeps the old theme's colours.

---

### 8. Verify

- `scan` → zero in-scope literals; `build` → exit 0.
- **Screenshot diff** of key pages in the default theme, before vs after: no visual change.
- Each theme: screenshot key pages, check contrast, check focus rings and selection colour.
- Reload in each theme with cache disabled and throttled CPU: no flash of the wrong theme.
- Keyboard-only: reach and operate the switcher; it has a label; state is announced.
- Second tab follows a switch made in the first; clearing storage falls back to the system
  preference.

#### Final checklist

- [ ] Committed before `apply --write`; diff reviewed; `.bak` files removed after commit.
- [ ] Components use semantic tokens only; primitives live in theme files.
- [ ] All themes define the same tokens; `color-scheme` set per theme.
- [ ] Contrast passes in every theme.
- [ ] No flash on reload; SSR renders the theme attribute.
- [ ] Charts, canvases and SVG icons follow the theme.
- [ ] No second theme switcher where one already existed.

**Completion criterion:** every checklist item checked.

---

## Reference

### Script commands

| Command | Does | Writes files? |
|---|---|---|
| `scan <paths>` | Counts literals by category, near-duplicate colours | No |
| `extract <paths> --toml F [--css F] [--name N] [--merge 0.02]` | Proposes tokens | The TOML (and CSS) you name |
| `apply <paths> --toml F [--write] [--merge 0.02]` | Literal → `var(--token)` | Only with `--write` (keeps `.bak`) |
| `build <toml...> --out F [--default N]` | Themes → CSS; checks matching keys | The output CSS |

The parser works line by line on declarations, so it handles normal CSS, SCSS, component
`<style>` blocks and inline `style` attributes. Values built across lines or by
preprocessor functions (`darken($x, 10%)`) need a manual pass; `scan` lists what's left.

### Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| `--blue-500` used directly in components | A light theme can't change what "blue-500" means | Semantic tokens in components |
| A dark theme as a `filter: invert(1)` | Images and brand colours invert; contrast unpredictable | A real theme file |
| Theme applied in a `DOMContentLoaded` handler | Flash of the default theme on every load | Inline `<head>` script (plus cookie for SSR) |
| Themes with different token sets | Stale values after switching | `build` key check |
| Transitions on `background-color` everywhere | Every element animates during a swap | `.theme-switching` suppression |
| A second switcher next to an existing one | Two sources of truth fighting | Extend the existing system |
| Tokenizing breakpoints as custom properties | `var()` doesn't work in media queries | Container queries or build constants |
