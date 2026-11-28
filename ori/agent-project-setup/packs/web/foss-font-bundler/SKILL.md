---
name: foss-font-bundler
description: Self-host open-source fonts as local WOFF2 subsets with generated @font-face rules and zero runtime CDN calls. Use when asked to "self-host fonts", "remove Google Fonts", "stop loading fonts from a CDN", "use Fontsource", "download a font as WOFF2", "subset a font", "generate @font-face", "fix font layout shift", "font-display", "preload fonts", "GDPR font issue", "font-src CSP", or "check a site for external font requests".
metadata:
  version: '1'
---
# Self-Hosted FOSS Typography & Fontsource Bundler

Moves every web font onto your own origin: download open-source fonts at build time (from
Fontsource or the font's own releases), subset them to WOFF2, generate `@font-face` rules
with `unicode-range` and metric-matched fallbacks, ship the licence, and prove the built site
makes **no** requests to a font CDN.

> [!CAUTION]
> Self-hosting means *you* distribute the font, so the font's licence now applies to you.
> Only bundle fonts whose licence allows web self-hosting (OFL, Apache 2.0, Ubuntu Font
> Licence, MIT), always ship the licence text next to the files, and remember that under the
> OFL **subsetting is modification**: a font with a Reserved Font Name must be renamed before
> you publish a subset. Commercial fonts need a separate webfont licence; never download one
> from a CDN and rehost it.

---

## Steps

### 1. Inventory what the site loads today

```bash
# External font sources in source and build output
grep -rnE "fonts\.googleapis|fonts\.gstatic|typekit|fonts\.bunny|fontsource|cdnfonts|fontshare" \
  --include='*.{html,css,scss,js,ts,jsx,tsx,astro,vue,svelte,json}' . | grep -v node_modules
# Which families, weights and styles are actually used
grep -rhoE "font-(family|weight|style)\s*:[^;]+" --include='*.{css,scss}' src | sort | uniq -c | sort -rn
```

Record for each family: the weights and styles really used, the languages and scripts the
content needs, where it renders (body text, headings, code, logo), and its **licence** (with
or without a Reserved Font Name).

**Completion criterion:** a table of family → weights → styles → subsets → licence, and every
external font URL listed.

---

### 2. Choose the source and the shape

| Source | Use when | Notes |
|---|---|---|
| **Fontsource** (`fetch` below, or npm `@fontsource/<id>` / `@fontsource-variable/<id>`) | Google Fonts families and many other open-source fonts | Already split into per-script WOFF2 subsets, with `unicode-range` data |
| **The font's own release** (GitHub releases) | Not on Fontsource, newer version, or you need every OpenType feature | Subset it yourself (`subset` below) |
| **A system/local file** | Brand fonts you own the rights to | Check the licence covers web use |

| Shape | Choose when |
|---|---|
| **Variable font** (`--variable`) | Three or more weights of one family: one file covers the whole weight range |
| **Static weights** (`--weights 400,700`) | One or two weights: usually smaller than the variable file |
| **Per-script subsets** (`--subsets latin,latin-ext`) | Always: browsers download only the subsets whose `unicode-range` matches the page's text |
| **Custom subset** (`subset --text-file`) | A display face used for a logo or a few headings: keep only those characters |

The npm route works too and is just as self-hosted: `@fontsource/inter` imported in your
bundle copies the WOFF2 files into **your** build output.

**Completion criterion:** a decision per family: source, variable or static, subsets.

---

### 3. Fetch, subset and generate (bundled script)

```bash
B=<this-skill-dir>/scripts/font_bundler.py

# Static weights from Fontsource → public/fonts/<id>/ + CSS + LICENSE.txt
python3 $B fetch jetbrains-mono --weights 400,700 --subsets latin,latin-ext \
  --out public/fonts --css src/styles/fonts/jetbrains-mono.css --url-prefix /fonts

# Variable font (whole weight axis in one file per subset)
python3 $B fetch inter --variable --styles normal,italic --out public/fonts --css src/styles/fonts/inter.css

# Subset a local font to WOFF2 (default: Latin; or --unicodes / --text-file)
python3 $B subset brand/Display.ttf --out public/fonts/display/display-latin.woff2
python3 $B subset brand/Display.ttf --out public/fonts/display/logo.woff2 --text-file logo-chars.txt
```

Real output for the first command:

```
JetBrains Mono: 4 file(s), 56.5 KiB in public/fonts/jetbrains-mono
  latin-400-normal.woff2                  20.7 KiB
  latin-ext-400-normal.woff2               7.2 KiB
  latin-700-normal.woff2                  21.4 KiB
  latin-ext-700-normal.woff2               7.3 KiB
font-family: "JetBrains Mono", "JetBrains Mono Fallback", monospace;
preload (critical face only):
  <link rel="preload" href="/fonts/jetbrains-mono/latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
```

`fetch` validates the requested weights, styles and subsets against Fontsource's metadata,
downloads only those files and the licence, and writes CSS with one `@font-face` per
weight × style × subset (each with its `unicode-range`), plus a metric-matched fallback face.
`subset` uses fontTools with brotli (`pacman -S python-fonttools python-brotli`), keeps the
common layout features (kerning, ligatures, contextual alternates, marks), and **warns when
the font declares a Reserved Font Name**. Subsetting a local 267 KiB TTF to Latin gives about
29 KiB.

Network is used only here, at build time. Commit the downloaded files (or fetch them in CI),
so production never depends on the CDN.

**Completion criterion:** WOFF2 files, `LICENSE.txt` and the CSS exist in the repo, and the
script exited 0.

---

### 4. `@font-face` rules that load fast and stay correct

```css
@font-face {
  font-family: "Inter";                 /* one family name for every weight and style */
  font-style: normal;
  font-weight: 100 900;                 /* range for variable fonts; a single value for static */
  font-display: swap;                   /* body text: show fallback immediately, swap when ready */
  src: url("/fonts/inter/latin-wght-normal.woff2") format("woff2");
  unicode-range: U+0000-00FF, U+0131, /* … from Fontsource metadata */;
}
```

Rules:
- **WOFF2 only.** Every current browser supports it; extra formats only add bytes.
- **`font-display`:** `swap` for body and UI text; `optional` for decorative faces that may
  simply not appear on slow connections; never `block` for text people need to read.
- **One family name**, with weight and style set in each `@font-face`. Don't name families
  `"Inter Bold"`, which breaks `font-weight` and causes faux bold.
- **`font-synthesis: none`** (or `font-synthesis-weight: none`) on elements using a family
  where you didn't ship a weight or italic, so the browser doesn't fake it.
- **Preload one or two files only**: the face used above the fold (usually the Latin body
  weight). Preload needs `crossorigin` even on the same origin. Preloading everything slows
  first paint.
- **No `local()` for the primary source.** The visitor's installed copy may be a different
  version, and `local()` lookups can be used for fingerprinting. The generated *fallback*
  face uses `local()` on purpose, for a system font.
- **Caching:** hashed file names, or a versioned path, with
  `Cache-Control: public, max-age=31536000, immutable`.
- **CSP:** `font-src 'self'` enforces zero external fonts in the browser itself.

**Completion criterion:** the CSS follows every rule above, and only critical faces are preloaded.

---

### 5. Fallback metrics: no layout shift on swap

The generated fallback face makes a system font take up the same space as the web font, so
text doesn't jump when the web font arrives:

```css
@font-face {
  font-family: "JetBrains Mono Fallback";
  src: local("Courier New");
  size-adjust: 100.00%;  ascent-override: 102.00%;  descent-override: 30.00%;  line-gap-override: 0.00%;
}
body { font-family: "JetBrains Mono", "JetBrains Mono Fallback", monospace; }
```

- **Monospace:** exact. `size-adjust` = advance width ÷ Courier New's 0.6em.
- **Proportional:** `size-adjust` comes from the font's average width against Arial or Times
  New Roman, so it's **approximate**. Tune it by eye on a paragraph with the web font blocked
  (DevTools → Network → block `*.woff2`), until line breaks match.
- Ascent, descent and line-gap overrides come straight from the font's metrics and are exact.

**Completion criterion:** blocking the WOFF2 files and then allowing them causes no visible
reflow on the main text block (or a CLS contribution near 0 in Lighthouse).

---

### 6. Framework integration

| Stack | Self-hosted approach |
|---|---|
| **Plain HTML / static** | Files in `public/fonts/`, the generated CSS linked or inlined in `<head>`, preload tag for the critical face |
| **Astro** | Files in `public/fonts/` and the CSS imported in the base layout; or `import "@fontsource-variable/inter"` in the layout. Check whether the installed Astro version's built-in fonts feature fits. |
| **Next.js** | `next/font/local` with the WOFF2 files (`display`, `adjustFontFallback` built in). `next/font/google` also downloads at build time and self-hosts; it makes no runtime CDN calls. |
| **Nuxt** | The Nuxt Fonts module downloads and self-hosts at build; or local files plus the generated CSS |
| **SvelteKit / Vite apps** | Import `@fontsource/<id>` packages or the generated CSS; Vite fingerprints the files |
| **Tailwind v4** | `@theme { --font-sans: "Inter", "Inter Fallback", sans-serif; --font-mono: …; }` after the `@font-face` CSS |
| **Rust (Leptos, Dioxus, Yew)** | Copy files through the asset pipeline (`assets-dir`, `asset!()`, Trunk `data-trunk rel="copy-dir"`), link the CSS in the shell |
| **Docs (Docusaurus, Starlight, mdBook)** | Static folder + custom CSS; remove the theme's Google Fonts link if it has one |

**Completion criterion:** the framework serves the files from your origin, and no plugin or
theme still injects a CDN link.

---

### 7. Licence compliance

- Ship **`LICENSE.txt`** (the full licence with copyright lines) next to the font files. The
  script downloads it from the Fontsource package. For other sources, copy `OFL.txt` from the
  font's release.
- Keep the copyright notice in the CSS comment and, if the site has one, on a credits page.
- **Reserved Font Names (OFL):** a subset or modified font must not use the reserved name.
  Rename the family in the font's name table before publishing, or use the unmodified
  Fontsource subsets. Fontsource's Google Fonts families normally have no reserved name;
  fonts from other sources often do.
- Converting to WOFF2 **without changing the font data** may keep the name; tools that alter
  tables produce a modified version.
- Apache 2.0 fonts: include the `LICENSE` and keep any `NOTICE` file.

**Completion criterion:** every self-hosted family has its licence beside it, and no subset
of a reserved-name font keeps the original name.

---

### 8. Verify: prove zero CDN calls

```bash
python3 <this-skill-dir>/scripts/font_bundler.py audit dist/      # exit 1 on any font CDN reference
```

- **Browser:** DevTools → Network → filter `font`. Every request goes to your own origin, and
  only the expected subsets load for the page's language.
- **CSP:** deploy `font-src 'self'`. Any leftover external font shows as a console error.
- **Rendering:** each shipped weight and style renders (no faux bold or italic); accented and
  non-Latin text uses the right subset; code ligatures appear if the font has them.
- **Performance:** Lighthouse shows no render-blocking font CSS from third parties, low CLS,
  and an LCP that isn't delayed by fonts.
- **Offline:** load the built site with the network disconnected after the first visit; text
  renders in the web font from cache.

#### Final checklist

- [ ] `audit` exits 0 on the production build output.
- [ ] Network panel: all font requests same-origin; CSP `font-src 'self'` in place.
- [ ] Only used weights, styles and subsets are shipped; variable font where it saves bytes.
- [ ] `font-display` set; one or two preloads with `crossorigin`; long-cache headers.
- [ ] Fallback face present; no visible reflow when the font swaps in.
- [ ] `LICENSE.txt` beside every family; reserved names respected.

**Completion criterion:** every checklist item checked.

---

## Reference

### Common `unicode-range` subsets (Fontsource / Google naming)

| Subset | Covers |
|---|---|
| `latin` | Basic Latin, Latin-1 punctuation and symbols, € ™ arrows |
| `latin-ext` | Central/Eastern European, Vietnamese-adjacent, extra diacritics |
| `cyrillic`, `cyrillic-ext` | Russian, Ukrainian, Bulgarian, Serbian, … |
| `greek`, `greek-ext` | Greek, polytonic Greek |
| `vietnamese` | Vietnamese diacritics |

Fetch the exact ranges from `https://api.fontsource.org/v1/fonts/<id>` (`unicodeRange`);
the script writes them into the CSS for you.

### Why self-host

- **Privacy:** no visitor IP addresses sent to a third party on every page view. A German
  court ruled in 2022 that embedding Google Fonts from Google's servers without consent
  breached the GDPR.
- **Performance:** no extra DNS, TLS and connection to a font host; browsers partition caches
  per site, so there was no shared-cache benefit anyway.
- **Reliability:** fonts can't break because a CDN is blocked, down or changed.

### Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| `<link href="https://fonts.googleapis.com/...">` left in a layout or theme | Runtime CDN call, privacy issue | Self-host; run `audit` |
| Every weight 100–900 shipped "just in case" | Hundreds of KiB unused | Ship used weights, or one variable file |
| All subsets preloaded | Delays first paint | Preload the critical Latin face only |
| `"Inter Bold"` as a separate family | Faux bold, broken `font-weight` | One family, weight per `@font-face` |
| TTF/OTF served to browsers | 3–10× larger than WOFF2 | WOFF2 only |
| Subset of a reserved-name OFL font published under the same name | Licence breach | Rename, or use unmodified subsets |
| No fallback metrics | Layout shift when the font loads | Generated fallback face |
