---
name: css-grid-motion-system
description: Build responsive CSS Grid and Flexbox layout shells and GPU-friendly micro-interactions in plain CSS (and a little vanilla JS), without heavy JS frameworks or animation libraries. Use when asked for a "layout grid", "app shell", "dashboard layout", "sidebar layout", "card grid", "holy grail layout", "responsive grid", "container queries", "subgrid", "micro-interactions", "hover effects", "button animation", "smooth transitions", "animate a dialog or popover", "accordion animation", "skeleton loader", "view transitions", "scroll animations", "janky animation", "60fps", or "remove GSAP/Framer Motion for simple effects". Not for setting a visual direction or building whole pages (use web-design-and-frontend-craft).
metadata:
  version: '1'
---
# CSS Micro-Interaction & Layout Grid System

Builds page and app layouts with CSS Grid and Flexbox, and interaction feedback with
compositor-only CSS animations. Modern CSS covers what used to need a JS framework: container
queries, subgrid, `:has()`, `@starting-style`, view transitions and scroll-driven animations.

> [!CAUTION]
> Animate **only `transform` and `opacity`** (plus `translate`, `scale`, `rotate`), because
> those run on the compositor. Animating width, height, top/left, margin or padding forces
> layout on every frame and janks on phones. Every page that moves must respect
> `prefers-reduced-motion`. Don't add an animation library for an effect CSS can do; the
> bundled linter (§7) fails builds that break these rules.

---

## Steps

### 1. Read the context first

- Existing tokens (spacing scale, breakpoints, durations, easing) and the framework. **Use
  them; don't invent a parallel scale.**
- Is a motion library already installed (GSAP, Framer Motion/Motion, anime.js)? Keep it for
  what it's needed for (complex timelines, physics, scroll storytelling); do simple effects
  in CSS.
- Target browsers: modern features below are **progressive enhancement**. Check support
  on caniuse for the project's audience and keep a working fallback.

**Completion criterion:** you know the spacing, breakpoint and motion tokens, and which
modern CSS features the audience's browsers support.

---

### 2. Choose the layout primitive

| Need | Use |
|---|---|
| Page regions in two dimensions (header, sidebar, main, footer) | **Grid** with `grid-template-areas` |
| A row or column of items (toolbar, nav, button group, tags) | **Flexbox** with `gap` |
| Repeating cards that fill the width | Grid `repeat(auto-fit, minmax(min(100%, 18rem), 1fr))` |
| Card internals aligned across a row (titles, footers line up) | Grid **subgrid** |
| A component that changes layout by its own width | **Container queries** |
| Content-sized sidebar that wraps under the main column when narrow | Flex with `flex-basis` + `flex-grow` ("sidebar" pattern) |
| Overlapping layers (image + caption) | Grid with items placed in the same cell |

Always: `gap` instead of margins, `min-width: 0` on grid/flex children that hold text or
code, logical properties (`margin-inline`, `padding-block`), `dvh` instead of `100vh` for
full-height shells.

**Completion criterion:** each region and component has a chosen primitive with a reason.

---

### 3. Copy-ready shells

#### App shell (header, sidebar, main), collapses to a drawer on phones

```css
.app {
  display: grid;
  grid-template: "header header" auto "nav main" 1fr / minmax(14rem, 16rem) minmax(0, 1fr);
  min-block-size: 100dvh;
}
.app > header { grid-area: header; position: sticky; inset-block-start: 0; z-index: 10; }
.app > nav    { grid-area: nav; overflow-y: auto; }
.app > main   { grid-area: main; min-inline-size: 0; padding: var(--space-6, 1.5rem); }

@media (max-width: 48rem) {
  .app { grid-template: "header" auto "main" 1fr / minmax(0, 1fr); }
  .app > nav {                       /* off-canvas drawer: moves with transform only */
    position: fixed; inset-block: 0; inset-inline-start: 0; inline-size: min(80vw, 18rem);
    translate: -100% 0; transition: translate 220ms var(--ease-out, ease-out);
  }
  .app[data-nav-open] > nav { translate: 0 0; }
}
```

#### Dashboard: intrinsic grid + container-query widgets

```css
.dashboard { display: grid; gap: var(--space-4, 1rem);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr)); }
.dashboard .wide { grid-column: 1 / -1; }
.widget { container: widget / inline-size; }
@container widget (min-width: 32rem) {
  .widget-body { display: grid; grid-template-columns: 1fr 1fr; }
}
```

#### Card grid with aligned internals (subgrid)

```css
.cards { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); }
.card  { display: grid; grid-row: span 3; grid-template-rows: subgrid; } /* title / body / footer line up */
```

#### Docs: navigation, readable content, table of contents

```css
.docs { display: grid; gap: 2rem;
  grid-template-columns: minmax(12rem, 16rem) minmax(0, 72ch) minmax(10rem, 14rem);
  justify-content: center; }
@media (max-width: 64rem) { .docs { grid-template-columns: minmax(0, 72ch); } .docs > .toc, .docs > .nav { display: none; } }
```

#### Small primitives

```css
.stack   > * + * { margin-block-start: var(--stack-space, 1rem); }          /* vertical rhythm */
.cluster { display: flex; flex-wrap: wrap; gap: var(--space-2, .5rem); align-items: center; }
.sidebar { display: flex; flex-wrap: wrap; gap: 1.5rem; }
.sidebar > :first-child { flex-basis: 16rem; flex-grow: 1; }
.sidebar > :last-child  { flex-basis: 0; flex-grow: 999; min-inline-size: 60%; } /* wraps when narrow */
.center  { box-sizing: content-box; max-inline-size: 72ch; margin-inline: auto; padding-inline: 1rem; }
```

**Completion criterion:** the shell works from 320px to 1920px with no horizontal overflow,
and the DOM order matches the visual reading order.

---

### 4. Responsive rules

- **Components respond to their container** (container queries); the **page** responds to the
  viewport (media queries).
- Fluid type and spacing between breakpoints: `font-size: clamp(1rem, 0.9rem + 0.5vw, 1.25rem)`.
- No fixed widths on anything holding text; use `min()`, `max()`, `clamp()`, `minmax()`.
- `pre`, tables and wide media scroll inside their own box; the page never scrolls sideways.
- Test the in-between widths (600, 900, 1100), not just the breakpoints, and 200% zoom.

**Completion criterion:** no horizontal scroll at 320px, and no layout break at any width in between.

---

### 5. Micro-interaction recipes (CSS-only, compositor-friendly)

```css
:root { --dur-fast: 120ms; --dur-base: 200ms; --dur-slow: 320ms;
        --ease-out: cubic-bezier(.2, .8, .2, 1); --ease-in-out: cubic-bezier(.65, 0, .35, 1); }

/* Press and hover */
.btn { transition: transform var(--dur-fast) var(--ease-out), opacity var(--dur-fast); }
.btn:hover  { transform: translateY(-1px); }
.btn:active { transform: translateY(0) scale(.98); }

/* Shadow/glow without animating box-shadow: fade a pre-drawn shadow on a pseudo-element */
.card { position: relative; transition: transform var(--dur-base) var(--ease-out); }
.card::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: 0 8px 30px rgb(0 0 0 / .35); opacity: 0; transition: opacity var(--dur-base) var(--ease-out); }
.card:hover { transform: translateY(-2px); }
.card:hover::after { opacity: 1; }

/* Dialog / popover enter AND exit with no JS animation code */
dialog, [popover] {
  opacity: 0; transform: translateY(8px) scale(.98);
  transition: opacity var(--dur-base), transform var(--dur-base) var(--ease-out),
              overlay var(--dur-base) allow-discrete, display var(--dur-base) allow-discrete;
}
dialog[open], [popover]:popover-open { opacity: 1; transform: none; }
@starting-style { dialog[open], [popover]:popover-open { opacity: 0; transform: translateY(8px) scale(.98); } }

/* Tab underline: one indicator moved with transform, not a re-drawn border */
.tabs { position: relative; }
.tabs .indicator { position: absolute; inset-block-end: 0; block-size: 2px; inline-size: 1px;
  transform-origin: 0 0; transition: transform var(--dur-base) var(--ease-out);
  transform: translateX(var(--x, 0)) scaleX(var(--w, 0)); }  /* JS sets --x and --w in px */

/* Skeleton shimmer: move a gradient layer, don't animate background-position */
.skeleton { position: relative; overflow: hidden; background: var(--surface); }
.skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / .08), transparent);
  animation: shimmer 1.4s infinite; }
@keyframes shimmer { to { transform: translateX(100%); } }

/* State styling without JS: :has() */
.field:has(input:invalid:not(:placeholder-shown)) { --field-border: var(--danger); }
.card:has(input[type="checkbox"]:checked) { outline: 2px solid var(--accent); }
```

#### Height animations (accordions)

Height is layout, so use these in order of preference:
1. **`<details>`/`<summary>`** opening instantly, with an opacity/transform fade on the content.
2. **Grid rows `0fr` → `1fr`** on a wrapper (`grid-template-rows` transition). It does run
   layout, but only on one small element; accept the linter's error for this one rule
   consciously and keep the content small.
3. **`interpolate-size: allow-keywords`** to animate `height: auto` where supported
   (progressive enhancement).

#### Page and state transitions

- **View Transitions API:** `document.startViewTransition(() => update())` for same-page
  state changes; `@view-transition { navigation: auto; }` for multi-page sites. Name shared
  elements with `view-transition-name` (unique per page). It falls back to an instant change.
- **Scroll-driven reveals:** `animation-timeline: view()` with `animation-range: entry`,
  wrapped in `@supports (animation-timeline: view())`. Content must be visible without it.
- **Vanilla JS when needed:** `element.animate()` (Web Animations API) on transform/opacity,
  `IntersectionObserver` for reveal triggers. Never `scroll` event listeners that read layout.

**Completion criterion:** every interaction gives feedback within about 100ms, uses
transform/opacity, and works with keyboard and touch as well as hover.

---

### 6. GPU and runtime performance rules

| Rule | Why |
|---|---|
| Animate `transform`, `opacity`, `translate`, `scale`, `rotate` | Compositor-only, no layout or paint |
| `will-change` **just before** an animation, removed after; never on `*` or many elements | Each layer costs GPU memory |
| `contain: layout paint` on independent widgets | Changes inside don't re-layout the page |
| `content-visibility: auto` + `contain-intrinsic-size` on long off-screen sections | Skips rendering until near the viewport |
| In JS: read layout (`getBoundingClientRect`) first, then write styles, once per `requestAnimationFrame` | Avoids layout thrashing |
| Durations: 120–250ms for hover/press, ≤ 400ms for larger moves | Longer feels sluggish and delays input |
| Large `blur()` filters and `backdrop-filter` sparingly | Expensive paints on low-end GPUs |
| No layout animation on scroll | Scroll jank is the most visible kind |

**Completion criterion:** a Performance recording of each animation shows no layout or
paint work per frame (§8).

---

### 7. Reduced motion and the linter

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important; animation-iteration-count: 1 !important;
    transition-duration: .01ms !important; scroll-behavior: auto !important;
  }
}
```

Remove movement, keep feedback: under reduced motion, a hover can still change colour or
opacity instantly. Stop auto-playing and looping animations entirely.

```bash
python3 <this-skill-dir>/scripts/css_motion_lint.py src/          # .css .scss .astro .vue .svelte .html
```

The linter (standard library only) reports:
- **ERROR** (exit 1): transitions or keyframes on layout properties, or motion with no
  `prefers-reduced-motion` block anywhere.
- **WARN**:
  - `transition: all`.
  - Paint-heavy animation (box-shadow, filter, backdrop-filter, clip-path).
  - `will-change` misuse (on `*`, on more than 5 selectors, or with layout properties).
  - Infinite animations with no reduced-motion rule that stops them.
  - Hover/focus transitions over 400ms.

It reads `<style>` blocks in component files, with line numbers matching the file. It's a
light parser, so treat it as a gate plus a pointer, then confirm in DevTools.

**Completion criterion:** the linter exits 0 (any accepted exception, such as a grid-rows
accordion, is commented in the CSS).

---

### 8. Verify in the browser

- **DevTools → Performance:** record each interaction; frames show no purple (layout) or
  green (paint) blocks during the animation, and frame rate holds on 4× CPU throttling.
- **DevTools → Rendering:** *Paint flashing* (nothing should flash during transform/opacity
  animations), *Layer borders* (layers only where expected), *Emulate prefers-reduced-motion*.
- **Lighthouse:** CLS ≈ 0 and INP within budget (< 200ms).
- **Widths:** 320, 390, 768, 1024, 1280 and 1920, plus 200% zoom; keyboard through every
  interactive element (focus visible, Esc closes dialogs and popovers).
- **No-JS / old browser:** layout still usable; enhanced effects missing is acceptable,
  content missing is not.

#### Final checklist

- [ ] Shells built with Grid/Flex, `gap`, `min-width: 0`, logical properties, `dvh`.
- [ ] Components use container queries; no horizontal overflow at any width.
- [ ] Animations use transform/opacity only (exceptions commented); linter exits 0.
- [ ] Reduced-motion block present and tested; loops stop.
- [ ] Every hover effect also has a focus and touch path.
- [ ] No animation library added for effects CSS covers.
- [ ] Performance recording clean on throttled CPU.

**Completion criterion:** every checklist item checked.

---

## Reference

### What each property costs to animate

| Cost | Properties | Use for motion? |
|---|---|---|
| **Composite only** | `transform`, `opacity`, `translate`, `scale`, `rotate` | Yes |
| Paint | `color`, `background-color`, `box-shadow`, `filter`, `clip-path`, `border-color`, `outline` | Colour changes at short durations are fine; avoid looping or large-area paint animations |
| **Layout** (then paint) | `width`, `height`, `top/left/right/bottom`, `inset`, `margin`, `padding`, `border-width`, `font-size`, `gap`, `grid-template-*`, `flex-*` | No (accordion exception above) |

### Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| `transition: all .3s` | Animates layout properties by accident; surprise jank | List properties |
| Drawer slides by animating `left` | Layout every frame | `translate` / `transform` |
| Animated `box-shadow` on hover | Repaint each frame | Fade a pseudo-element's shadow |
| `will-change: transform` on every card | GPU memory bloat | Apply just before animating |
| Scroll listener that reads `offsetTop` | Layout thrash on scroll | `IntersectionObserver` / scroll-driven animations |
| GSAP added for a hover lift | 30–60 KB for one CSS line | CSS transition |
| Hover-only reveal | Invisible to touch and keyboard users | Add `:focus-visible` / tap path |
| `100vh` full-screen panel | Jumps under mobile browser UI | `100dvh` |
| Grid children overflowing with long code | Page wider than the screen | `min-width: 0` / `minmax(0, 1fr)` |
