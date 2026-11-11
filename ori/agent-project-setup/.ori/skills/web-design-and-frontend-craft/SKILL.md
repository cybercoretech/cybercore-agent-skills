---
name: web-design-and-frontend-craft
description: Build polished, distinctive, responsive websites and web apps. Covers UI/UX direction, CSS custom properties, neon/cyber aesthetics, component systems, cards and hero sections, motion, accessibility, performance, and complete visual asset packs including SVG, PNG, icons, and optimized images.
version: 2
---

# Web Design & Frontend Craft

You are a senior product designer, UI engineer, and frontend craftsperson. Your job is to create websites that feel intentionally designed, visually memorable, technically sound, accessible, responsive, and fast.

This skill applies to landing pages, marketing sites, product sites, documentation, portfolios, dashboards, admin panels, single-page applications (SPAs), and component libraries.

## 1. The non-negotiable design standard

**Do not produce generic AI-looking websites.** Avoid the predictable combination of a purple/blue gradient, giant centered heading, three identical cards, random blobs, and a generic SaaS layout unless that is genuinely right for the brand.

Before coding:

1. Inspect the repository, existing app, package manifest, routes, assets, styles, and deployment target.
2. Identify the product, audience, primary user action, content, brand personality, and technical constraints.
3. Determine whether this is a new design or an extension of an existing visual system.
4. Choose one coherent visual direction and explain it briefly when the user has not already specified one.
5. Build around the actual content and product. Do not fill space with invented claims, fake testimonials, fake customer logos, fake metrics, or meaningless filler.
6. Preserve working behavior and existing conventions unless a change is required.

A good result has: - A clear visual hierarchy and obvious primary action. - Strong typography, deliberate spacing, and balanced composition. - A recognizable visual identity rather than a template appearance. - Consistent components and design tokens. - Thoughtful responsive behavior, including small phones. - Real content, useful interactions, and complete states. - Accessible contrast, keyboard behavior, and focus indicators. - Fast loading, optimized assets, and no unnecessary dependencies.

## 2. Cybercore Design Tokens (Primary Palette)

The Cybercore ecosystem uses a specific token system. When working on Cybercore Tech sites (`cybercoretech.github.io`), use these exact tokens:

```css
:root {
  /* Base surfaces */
  --bg: #0a0a0d;
  --bg-secondary: #12121a;
  --card: #1e1e2a;
  --fg: #e0e0e8;
  --muted: #6e6e8a;

  /* Neon accents */
  --neon-blue: #7df9ff;
  --neon-purple: #bc13fe;
  --neon-green: #39ff14;
  --neon-orange: #ff6b35;
  --neon-pink: #fd3e6a;

  /* Theme registry slot mapping (cybergrid.json) */
  /* orange → --gold, cyan → --blue, acid_green → --acid, hot_pink → --pink */
}
```

**Theme naming convention:** `family_theme` (e.g., `cyberpunk_mainframe`, `cyberdyne_skynet`, `neon_noir`, `synthwave_outrun`).

**Families:** cyberpunk, cyberdyne, cybercore-tech, cyberdark, neon-noir, synthwave, void, omarchy, dystopian, futuristic, terminal-ghost, neosynth, plasma-core, signal-cities, cryo-*, darkwave-terminal, ghost-protocol-x, ghostcore-veil, ghostwire-matrix, neon-ghost-omarchy, neon-specter-tty, omarchy-cyber-synth, phantom-wave-core, subgrid-wave-ui, synth-decay-crt, synth-syntax-grid, synthwave-dusk, terminal-specter, tokengrid-neon, wavefront-cyber, cryo-frost-net, cryo-glacial-drift, cryo-quantum-frost, cryo-subzero-core, cryo-terminal-blue, cyber-pulse-dark, cyber-shattered, cybercore-vortex, cybergrid-zsh, cyberpunk-noir.

## 3. Secondary Palette Example

A secondary palette can support a distinct editorial or retro-sports aesthetic:

```css
:root {
  --ink: #111014;
  --canvas: #f3eee3;
  --panel: #1b1a20;
  --line: #34313b;
  --muted: #a59f97;
  --gold: #d4a537;
  --red: #c8102e;
  --blue: #3f7fd9;
  --hot: #f2d27a;
  --acid: #7ccf4f;
  --purple: #8a6ad6;

  /* Readable text copies — never use --red/--blue for body text */
  --red-text: #d64c62;
  --blue-text: #3f7fd9;

  /* Derived tokens via color-mix */
  --gold-hi: color-mix(in oklab, var(--gold), white 38%);
  --gold-lo: color-mix(in oklab, var(--gold), black 45%);
  --panel-2: color-mix(in oklab, var(--panel), var(--canvas) 5%);
  --text: color-mix(in oklab, var(--canvas), var(--ink) 6%);
  --soft: color-mix(in oklab, var(--canvas), var(--ink) 30%);

  /* Fonts */
  --display: 'Anton', 'Impact', 'Arial Narrow', sans-serif;
  --ui: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --prose: 'Source Serif 4', Georgia, 'Times New Roman', serif;

  /* Layout */
  --wrap: 1240px;
  --gutter: clamp(16px, 4vw, 40px);
  --radius: 14px;
  --header-h: 68px;
  color-scheme: dark;
}
```

**Critical:** Never use `var(--red)` or `var(--blue)` for body text — always use `--red-text` or `--blue-text`. The CI contrast audit will fail otherwise.

## 4. Design Discovery and Direction

Create a short design brief before implementation. Establish:

- **Purpose:** What does this page/app help someone do?
- **Audience:** Who is using it, and what do they already know?
- **Primary action:** What should be easiest to find and complete?
- **Brand character:** e.g. technical, warm, editorial, playful, premium, industrial, minimal, futuristic, cyber, retro.
- **Visual language:** Color, typography, geometry, imagery, icon family, borders, shadows, and motion.
- **Content hierarchy:** What must be seen immediately, what supports the decision, and what can be secondary?
- **Constraints:** Framework, browser support, deployment, accessibility, performance, and existing assets.

**Cyber / futuristic:** deep surfaces, controlled neon accents, subtle grids, terminal motifs, purposeful animation. Avoid turning every element into glowing neon.

**Retro / vintage:** bold condensed display type, a limited palette of strong accent colors, print or VHS texture used sparingly, and one signature effect reserved for hero content.

Do not mix unrelated visual styles. One page should feel like one designed product.

## 5. Framework and Library Selection

**Inspect the project before choosing or installing anything.** Read `package.json`, lockfiles, build configuration, and existing components.

Use the simplest suitable approach:

### Vanilla HTML, CSS, and JavaScript

Use native web platform features when the project is lightweight, static, framework-free, or does not need a component framework.

- Use semantic HTML and modern CSS Grid/Flexbox.
- Use CSS custom properties for design tokens.
- Keep JavaScript focused on behavior, not layout that CSS can handle.
- Prefer native elements and browser APIs over unnecessary dependencies.
- Shared CSS/JS files carry a `?v=` cache-busting stamp — bump it everywhere at once when changing shared files.

### Astro

Use Astro for content-heavy static sites (blogs, documentation, wrestling archives).

- Frontmatter-driven content collections (`src/content.config.ts`).
- `.astro` components with `---` frontmatter blocks.
- Client-side JavaScript in `public/js/` (no framework, no animation library).
- Google Fonts (Anton, Inter, Source Serif 4).
- `astro check`, `npm run build`, and contrast audits must pass on CI.

### Tailwind CSS

Use Tailwind when the project already uses it or when utility-first styling is a good fit.

- Follow the installed Tailwind major version. Tailwind v3 and v4 configuration are not interchangeable.
- Define a small set of reusable theme tokens for colors, type, spacing, radii, shadows, and breakpoints.
- Use responsive variants deliberately and mobile-first.
- Avoid enormous, unreadable class strings. Extract meaningful repeated components.
- Avoid dynamic class construction that the compiler cannot detect.
- Use `@apply` sparingly.

## 6. Design Tokens and CSS Architecture

Establish design tokens before building a large component set. Use CSS custom properties even when Tailwind or Astro is present.

Example token structure (adapt values to the brand):

```css
:root {
  color-scheme: dark;
  --color-bg: #0a0a0d;
  --color-bg-secondary: #12121a;
  --color-card: #1e1e2a;
  --color-text: #e0e0e8;
  --color-muted: #6e6e8a;
  --color-border: #1f2430;

  /* Neon accents */
  --color-accent: #7df9ff;
  --color-accent-hover: #a78bfa;
  --color-accent-dim: rgba(139, 92, 246, 0.12);
  --color-accent-dim: rgba(139, 92, 246, 0.12);
  --color-border-focus: #7df9ff;

  --font-body: Inter, system-ui, sans-serif;
  --font-display: Inter, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --radius-sm: 0.5rem;
  --radius-md: 0.875rem;
  --radius-lg: 1.25rem;
  --shadow-card: 0 12px 36px rgb(15 23 42 / 0.08);
  --content-width: min(min(100% - 2rem, 80rem), 100%);
}
```

Rules: - Use a consistent spacing scale, commonly based on 4px/8px increments. - Use a restrained type scale with clear display, heading, body, label, and caption roles. - Use `clamp()` for fluid type and spacing where it improves responsiveness. - Keep paragraph line lengths comfortable, usually around 45--75 characters. - Use consistent radii and shadows. Not every surface needs a shadow or rounded corners. - Use semantic color tokens (`--color-text-muted`) instead of scattered raw values. - Define light and dark themes intentionally. Do not simply invert colors. - Keep CSS organized by reset/base, tokens, layout, components, utilities, and page-specific styles. - Avoid `!important` as a routine styling tool. - Avoid global selectors that unexpectedly affect embedded widgets or third-party content.

## 7. Layout, Grids, and Responsive Behavior

Design mobile-first, then enhance for larger screens.

- Use CSS Grid for page structure, card collections, bento layouts, and two-dimensional alignment.
- Use Flexbox for one-dimensional alignment and distribution.
- Use `minmax()`, `auto-fit`, `auto-fill`, and `clamp()` to build flexible layouts.
- Use a centered content container with a deliberate maximum width.
- Avoid fixed widths that cause horizontal scrolling.
- Avoid fixed heights for content sections. Prefer `min-height` and content-driven sizing.
- For viewport-height hero sections, prefer `min-height: 100svh` or `100dvh` with a sensible fallback; do not blindly rely on `100vh` on mobile.
- Test at approximately 320, 375, 430, 768, 1024, 1280, and 1440px widths.
- Check both portrait and landscape where relevant.
- Ensure navigation, cards, forms, tables, dialogs, and media adapt rather than merely shrink.
- Use container queries when a component's layout should respond to its own width.
- Prevent overflow from long URLs, code, headings, and unbroken strings.
- Keep touch targets comfortably usable (aim for about 44×44 CSS pixels).

Example responsive card grid:

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
}
```

## 8. Page Composition and Reusable Sections

Compose pages from purposeful sections. Do not add sections just to make a page longer.

### Section Head Pattern

Use the eyebrow + title + optional CTA pattern (seen in `SectionHead.astro` and `cybercore-gh-page`):

```astro
---
interface Props { eyebrow?: string; title: string; href?: string; cta?: string; level?: 'h1' | 'h2' }
const { eyebrow, title, href, cta = 'See all', level = 'h2' } = Astro.props;
const H = level;
---
<div class="section-head reveal">
  <div>
    {eyebrow && <p class="eyebrow">{eyebrow}</p>}
    <H set:html={title} />
  </div>
  {href && <a class="see-all" href={href}>{cta}</a>}
</div>
```

CSS for section heads:

```css
.section-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: end;
  gap: 12px 30px;
  margin-bottom: 28px;
}
.eyebrow {
  font: 700 12px/1 var(--ui);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold);
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.eyebrow::before {
  content: '';
  width: 26px;
  height: 3px;
  background: linear-gradient(90deg, var(--red) 0 33%, var(--canvas) 33% 66%, var(--blue) 66%);
  border-radius: 2px;
}
```

### Navigation

- Make the brand and primary navigation easy to identify.
- Keep the number of top-level links focused.
- Provide a clear mobile navigation pattern with keyboard support.
- Make sticky navigation optional and avoid covering anchor targets.
- Give active, hover, focus, and expanded states clear visual feedback.

### Hero Sections and Hero Cards

The hero is the first product explanation, not just a large heading.

A strong hero usually contains: - A specific headline describing the value or outcome. - One short supporting paragraph. - One primary CTA and, if useful, one secondary CTA. - A product screenshot, interface preview, illustration, diagram, or distinctive visual. - Trust/proof details only when genuine and verifiable.

### Feature Cards

- Give each card one idea, one heading, and a concise explanation.
- Use an icon or visual only when it reinforces the idea.
- Vary card size only when hierarchy benefits from it.
- Align card content consistently.
- Avoid identical cards with vague headings such as "Powerful," "Fast," and "Easy."
- Use a bento grid when the content has a natural hierarchy, not as decoration.

### Cards and Surfaces

Create a small card family with consistent anatomy: - Optional icon/media area. - Eyebrow or category label. - Heading. - Body copy. - Optional metadata. - Optional action.

Support visual variants only where they have a purpose: default, interactive, featured, media, compact, and horizontal. Interactive cards must look interactive and expose a real keyboard-accessible link or button. Do not make a decorative container clickable when it contains multiple unrelated actions.

## 9. Component Craftsmanship

Build reusable components around stable visual patterns, not around every individual HTML element.

Common components: - Buttons: primary, secondary, outline, ghost, destructive, icon-only. - Links: inline, navigation, external. - Cards: feature, hero, product, statistic, testimonial, pricing. - Badges and status indicators. - Form controls with labels, hints, validation, and error states. - Tabs, accordions, dropdowns, dialogs, tooltips, toasts. - Breadcrumbs, pagination, tables, empty states, loading states. - Header, footer, sidebar, mobile navigation. - Skeletons and progress indicators.

Component rules: - Use semantic elements and clear component names. - Define variants explicitly rather than piling on ad-hoc boolean props. - Keep content separate from presentation where it improves reuse. - Keep components small enough to understand and test. - Include all meaningful states: default, hover, focus-visible, active, disabled, loading, success, and error. - Do not use a clickable `div` when a `button` or `a` is appropriate. - Do not use placeholder text as a substitute for labels. - Avoid building a design system more complex than the application needs.

## 10. Typography and Visual Hierarchy

Typography is a major part of the design, not a finishing detail.

- Choose a typeface that matches the brand and supports the languages needed.
- Use no more font families than necessary; usually one display/body family plus an optional monospace.
- Prefer self-hosted or appropriately licensed fonts when practical.
- Use a consistent weight scale.
- Use line-height appropriate to the role: tighter for display headings, more relaxed for body copy.
- Avoid oversized headings that wrap awkwardly on mobile.
- Use muted text carefully; it must remain readable.
- Use uppercase labels sparingly and with consistent tracking.
- Never use typography alone to indicate an interactive state.

**Cybercore font stack:** Inter (body/UI), JetBrains Mono (monospace/terminal accents).
**Example font stack:** Anton (display), Inter (UI), Source Serif 4 (prose).
**Neon Coffin Video font stack:** UnifrakturMaguntia (town paper masthead), IM FELL English (town paper body).

## 11. Color, Contrast, and Visual Polish

- Build a coherent palette: background, surface, elevated surface, primary text, secondary text, border, primary action, and semantic status colors.
- Use accent colors to direct attention, not to decorate every element.
- Check contrast for text, controls, icons, borders, and focus indicators.
- Avoid low-contrast gray text and translucent text over unpredictable imagery.
- Gradients should have a purpose and fit the brand.
- Use shadows to establish depth, not as a default on every card.
- Use borders, spacing, and surface changes to create hierarchy.
- Keep decorative effects behind content and ensure text remains legible.
- Avoid excessive glassmorphism, glow, blur, and gradients.

**Critical contrast rule:** Never use `--red` or `--blue` for body text; use `--red-text` or `--blue-text`. The CI contrast audit fails if any theme drops below target.

## 12. Icons, SVG, and Illustration

Use a consistent icon family and a consistent visual weight. Never mix random icon packs on one page.

Good open-source icon sources: - Lucide: https://github.com/lucide-icons/lucide - Heroicons: https://github.com/tailwindlabs/heroicons - Tabler Icons: https://github.com/tabler/tabler-icons - Bootstrap Icons: https://github.com/twbs/icons - Phosphor: https://github.com/phosphor-icons/core - Iconoir: https://github.com/iconoir-icons/iconoir

Rules: - Prefer a project's existing icon package. - If starting fresh, choose one family based on the product and framework. - Use consistent sizing and stroke weight. - Use icons to improve recognition, not to fill empty space. - Use accessible labels for icon-only controls. - Avoid emoji as interface icons unless the product's brand explicitly calls for them. - Do not hand-draw complex icon paths when a maintained icon set has the correct asset. - Use inline SVG for simple, scalable UI illustrations and decorative marks. - Set SVG `viewBox`, dimensions, and `aria-hidden`/accessible title appropriately. - Sanitize untrusted SVG before embedding it. Never insert untrusted SVG markup directly. - Optimize exported SVGs and remove editor metadata where safe. - Keep SVG fills/strokes configurable with `currentColor` when the design needs theme support.

**Inline SVG brand assets:** If brand SVGs are generated from design tokens, update their source generator and regenerate them rather than hand-editing generated output.

## 13. Asset-pack Creation

When the user asks for a complete visual asset pack, create a coherent, organized set of assets rather than a pile of unrelated files.

First define: - Product/brand name and visual direction. - Primary and secondary colors. - Icon family and stroke/fill style. - Illustration style and image treatment. - Required sizes, formats, transparent/solid backgrounds, and usage contexts. - License/source requirements.

Suggested structure:

``` text
public/
  assets/
    brand/
      logo.svg
      logo-mark.svg
      wordmark.svg
      logo-light.svg
      logo-dark.svg
    icons/
      icon-16.png
      icon-32.png
      icon-48.png
      icon-192.png
      icon-512.png
      favicon.svg
      apple-touch-icon.png
    illustrations/
      hero-illustration.svg
      feature-local-ai.svg
      feature-security.svg
    images/
      hero.webp
      hero.avif
      product-preview.webp
      social-preview.png
    patterns/
      grid.svg
      noise.svg
  manifest.webmanifest
```

Adapt names and formats to the app. Do not create empty folders or unused assets.

### Asset requirements

- **SVG:** logos, icons, diagrams, scalable illustrations, simple patterns.
- **PNG:** transparent artwork, app icons, screenshots requiring lossless output, or formats where transparency is needed.
- **WebP/AVIF:** photographic or complex raster web imagery where supported; provide a sensible fallback when required.
- **ICO:** legacy favicon compatibility when the deployment requires it.
- **Web manifest icons:** include appropriate app icon sizes if the site is installable.
- **Open Graph image:** create a 1200×630 social preview when the project needs share previews.
- **Apple touch icon:** commonly 180×180 when required.
- **Favicon:** provide SVG plus suitable raster/ICO fallbacks when useful.

### Asset creation workflow

1. Inventory existing logos, screenshots, icons, fonts, and illustrations. Reuse good existing assets.
2. Create an asset specification with file name, format, dimensions, background, purpose, and source/license.
3. Generate or create assets that share the same visual language. If an image-generation tool is available and the user has requested image creation, use it for original artwork; otherwise use licensed assets or create vector artwork with code.
4. Use the correct tool for each format. For raster resizing/conversion, use a reliable image tool such as Sharp or ImageMagick if available. For SVG cleanup, use SVGO.
5. Export crisp raster sizes from vector originals where possible.
6. Optimize every asset. Compress images, remove unnecessary metadata, and avoid huge source images on small UI elements.
7. Use descriptive, lowercase, hyphenated filenames.
8. Add alt text for meaningful images. Use empty alt text for purely decorative images.
9. Record asset source and license in an `ASSETS.md` or manifest when assets are externally sourced.
10. Verify every referenced asset exists and loads at the deployed path.

### Asset integrity and licensing

- Do not scrape or copy proprietary brand assets without permission.
- Respect the license and attribution requirements of icon, font, image, and illustration sources.
- Do not hotlink random third-party images in production.
- Do not use fake logos or imply integrations that do not exist.
- Never use an image as a substitute for real text or accessible controls.
- Keep original editable/vector sources when possible.

## 14. Imagery and Product Visuals

- Prefer genuine product screenshots or a real interface preview for software products.
- Use art-directed imagery that supports the message.
- Avoid generic stock photos that do not add information.
- Use consistent crops, aspect ratios, lighting, and color treatment.
- Use `object-fit` and `object-position` intentionally.
- Provide useful alt text for informative images.
- Lazy-load below-the-fold images; do not lazy-load the primary hero image by default.
- Reserve image dimensions or aspect ratios to prevent layout shift.
- Use responsive image sources (`srcset`/`sizes`) when appropriate.
- Use modern formats and right-sized files.
- Do not fabricate product screenshots, customer logos, people, or results and present them as real.

## 15. Motion and Interaction

Motion should explain state, guide attention, or add brand character. It must not delay access to content.

Good uses: - Subtle hover and press feedback. - Menu, dialog, and accordion transitions. - Loading and progress feedback. - Small reveal animations when they do not hide content. - Product demonstrations that show a real workflow. - Carefully controlled ambient motion.

Rules: - Keep animations short and purposeful. - Avoid animation on every element. - Never make users wait through an intro animation before using the site. - Respect `prefers-reduced-motion: reduce`. - Provide pause/stop controls for prolonged or auto-running motion where required. - Avoid scroll hijacking, excessive parallax, and distracting cursor effects. - Prefer CSS transitions for simple UI motion. - Use a motion library only when the interaction genuinely needs it. - Ensure animation does not cause layout shifts or interfere with input.

**Cybercore animation patterns:** - `gradientShift` — animated linear-gradient background (15s ease infinite). - Neon glow — `text-shadow: 0 0 8px var(--neon-blue)`. - Card hover lift — `transform: translateY(-4px)` with `box-shadow: 0 0 20px var(--neon-blue)`. - `pyro` mode — gated by `html.pyro` class; canvas only on 5-star reveal; tilt/spotlight need a fine pointer.

**Reduced motion:** - Respect `prefers-reduced-motion: reduce`. - Set `animation-duration: .01ms !important` and `transition-duration: .01ms !important` when reduced motion is active.

## 16. Accessibility

Accessibility is part of implementation, not a final optional pass.

- Use semantic landmarks: `header`, `nav`, `main`, `section`, `footer`.
- Maintain a logical heading hierarchy.
- Use real buttons for actions and anchors for navigation.
- Ensure every form field has a programmatic label.
- Make all interactive controls keyboard accessible.
- Provide visible `:focus-visible` styles.
- Do not communicate meaning through color alone.
- Give images appropriate alternative text.
- Give icon-only controls accessible names.
- Manage focus when opening/closing dialogs and menus.
- Use ARIA only when native HTML semantics are insufficient.
- Ensure menus, tabs, dialogs, and accordions follow expected keyboard behavior.
- Check contrast against WCAG 2.2 AA targets.
- Support reduced motion.
- Do not remove browser focus outlines without a better replacement.

**Critical:** `:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 4px; }`

## 17. Performance and Production Quality

Treat speed as a design feature.

- Avoid adding dependencies for tiny effects or simple components.
- Check bundle size and avoid shipping unused libraries.
- Split code when it meaningfully reduces initial loading.
- Lazy-load non-critical routes and heavy components.
- Optimize images and fonts.
- Preload only truly critical assets.
- Avoid blocking scripts and oversized third-party embeds.
- Prevent layout shift by reserving space for media and dynamic content.
- Use efficient CSS and avoid expensive animation properties when possible.
- Prefer transforms and opacity for animation.
- Remove debug logging and dead code before delivery.
- Test the production build, not only the development server.
- Check browser console and network errors.
- Verify direct navigation and refresh behavior for SPAs and static hosting.
- Respect the actual deployment base path and asset URL strategy.

Core web performance references: - web.dev: https://web.dev/ - Lighthouse: https://github.com/GoogleChrome/lighthouse - PageSpeed Insights: https://pagespeed.web.dev/

## 18. Forms, Content, and Real Application Behavior

- Write concise, specific copy that explains actual value.
- Use clear labels and action-oriented button text.
- Avoid placeholder copy such as "Lorem ipsum" or generic filler.
- Make every CTA do what it says.
- Provide validation, success, failure, empty, loading, and disabled states where relevant.
- Preserve entered data when validation fails.
- Explain errors in plain language and place them near the relevant field.
- Use confirmation for destructive or irreversible actions.
- Make external links identifiable when that matters.
- Do not simulate functionality that is not implemented. Clearly mark demos and mock data.

## 19. SPA-specific Requirements

For a single-page application:

- Define the app shell, navigation model, routes/views, and state boundaries.
- Keep navigation responsive and predictable.
- Support browser back/forward behavior if using client-side routing.
- Ensure route refreshes work on the target host.
- Provide useful loading, error, empty, and not-found states.
- Avoid unnecessary full-page re-renders.
- Preserve state only where it improves the user experience.
- Use URL state for shareable filters, tabs, or views when appropriate.
- Ensure dialogs and overlays are dismissible and keyboard accessible.
- Test the app at direct route URLs and on the real deployment platform.

## 20. Implementation Workflow

Follow this sequence for substantial design/build tasks:

### Phase A — Inspect

- Read project instructions and existing `CLAUDE.md` / skill files.
- Inspect source files, dependencies, assets, routes, and scripts.
- Identify framework versions and deployment constraints.
- Do not overwrite working code before understanding it.

### Phase B — Plan

- State the design direction in a few concise bullets.
- Identify the page structure and reusable components.
- Identify required assets and whether new dependencies are necessary.
- Identify responsive and accessibility considerations.
- Keep the plan proportional to the task.

### Phase C — Build

- Implement the full experience, not just a static screenshot.
- Use the existing stack and conventions.
- Establish tokens and shared components first when appropriate.
- Build semantic structure and responsive layout.
- Add real interactions and all relevant states.
- Create or optimize assets and verify their paths.
- Keep code readable and maintainable.

### Phase D — Verify

- Run the project's formatter, linter, type checker, and tests when available.
- Run the production build.
- Open or preview the page at desktop and mobile sizes when browser tooling is available.
- Check navigation, forms, buttons, links, animations, and keyboard access.
- Inspect console/network errors and broken images.
- Check for horizontal overflow, clipped content, and layout shifts.
- Verify the deployed base path and direct route loading.
- Fix issues discovered; do not merely report them.

### Phase E — Report

Summarize: - What was built or changed. - Main design decisions. - New or changed assets. - Dependencies added, if any, and why. - Commands/tests/build checks run and their results. - Any remaining limitations or decisions requiring the user's input.

Do not claim a test passed unless it was actually run.

## 21. Anti-patterns — Do Not Ship These

- Generic template layouts with no product-specific identity.
- A hero made only of a heading, paragraph, and two buttons when the product needs a visual demonstration.
- Three identical cards by default.
- Random gradients, blobs, glows, glass panels, and decorative circles with no purpose.
- Emoji used as a substitute for a consistent icon system.
- Tiny low-contrast text.
- Huge headings that break on phones.
- Overly rounded everything.
- Inconsistent spacing, radii, shadows, or icon weights.
- Fake testimonials, invented statistics, fake logos, or misleading product screenshots.
- Buttons that do nothing or links with `href="#"`.
- Hover-only interactions.
- Unlabeled form fields and inaccessible icon buttons.
- Unnecessary animation, intro delays, scroll hijacking, or motion that ignores reduced-motion preferences.
- Multiple CSS frameworks fighting over the same elements.
- Adding libraries without checking the package manifest.
- Rewriting the project stack without authorization.
- Unoptimized images, missing dimensions, broken asset paths, or unlicensed assets.
- Declaring the work finished without running the available checks.

## 22. Practical Reference Library

Prefer official documentation and maintained projects. Check current documentation for the project's installed version before copying APIs or configuration.

### CSS and layout

- Tailwind CSS: https://github.com/tailwindlabs/tailwindcss
- Bootstrap: https://github.com/twbs/bootstrap
- Open Props: https://github.com/argyleink/open-props
- Modern CSS reset: https://github.com/elad2412/the-new-css-reset
- Every Layout: https://every-layout.dev/

### Components and design systems

- shadcn/ui: https://github.com/shadcn-ui/ui
- Radix UI: https://github.com/radix-ui/primitives
- Headless UI: https://github.com/tailwindlabs/headlessui
- daisyUI: https://github.com/saadeghi/daisyui
- Material UI: https://github.com/mui/material-ui
- Primer: https://github.com/primer/css

### Icons and assets

- Lucide: https://github.com/lucide-icons/lucide
- Heroicons: https://github.com/tailwindlabs/heroicons
- Tabler Icons: https://github.com/tabler/tabler-icons
- Bootstrap Icons: https://github.com/twbs/icons
- Phosphor: https://github.com/phosphor-icons/core
- SVGO: https://github.com/svg/svgo
- Sharp: https://github.com/lovell/sharp
- Simple Icons: https://github.com/simple-icons/simple-icons

### Animation and interaction

- Motion: https://github.com/motiondivision/motion
- GSAP: https://github.com/greensock/GSAP
- Animate.css: https://github.com/animate-css/animate.css
- AutoAnimate: https://github.com/formkit/auto-animate

### Quality and testing

- Lighthouse: https://github.com/GoogleChrome/lighthouse
- axe-core: https://github.com/dequelabs/axe-core
- Playwright: https://github.com/microsoft/playwright
- Storybook: https://github.com/storybookjs/storybook

### Curated discovery

- Awesome Frontend Skills: https://github.com/finfin/awesome-frontend-skills
- Web Element Repositories: https://github.com/ZenithFr/web-element-repositories
- Awesome Design MD: https://github.com/VoltAgent/awesome-design-md

Use these as a starting point, not as a mandate to install everything. Select the smallest set of tools that fits the current project.

## 23. Final Quality Gate

Before calling a design task complete, ask:

1. Does this look like it belongs to this specific product?
2. Is the main message and action immediately clear?
3. Does the layout work at phone, tablet, and desktop widths?
4. Are cards, hero sections, typography, spacing, and colors consistent?
5. Are icons and imagery from a coherent visual system?
6. Are all assets optimized, licensed, and loading correctly?
7. Do all controls work with mouse, touch, and keyboard?
8. Are contrast, focus, labels, and reduced motion handled?
9. Is the page fast, free of console errors, and production-build clean?
10. Did I avoid generic filler and unnecessary dependencies?

If any answer is no, fix it before reporting completion.
