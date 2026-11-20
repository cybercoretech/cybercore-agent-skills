# Skills Explorer redesign: Cyber HUD circuit editor

**Date:** 2026-11-19 · **Site:** https://cybercoretech.github.io/cybercore-agent-skills/ · **Source:** `website/`

## Intent

The owner wants the Skills Explorer to look more cyber and futuristic, with real visual effects, built from the repository's design skills and the owner's Cybercore style. The owner's proven taste is the dwcode.pages.dev redesign ("You wowed me finally"): a site that feels like a real code editor, with JetBrains Mono at code-like sizes, `// 01 · section` labels, a dim editor backdrop, an explorer tree and detail sheets. Earlier attempts with big display fonts and flat grids missed; today's hero ("AGENT × SKILL MATRIX" in a huge sans-serif) is that kind of miss.

Decided with the owner, in order:

1. **Direction: Cyber HUD**, over a low-key editor or a heavy WebGL spectacle.
2. **Style: circuit editor.** The dwcode editor look brought to life with signal pulses on circuit traces, over a command-deck panel style or a synthwave holo grid.
3. **Catalog: explorer tree plus editor pane**, over a restyled matrix table or a chip board.
4. **Whole-page layout** as shown in the visual companion (the full-page v3 mockup), with one correction from the owner: **the footer stays the shared `<cybercore-contact>` block, unchanged.**
5. **Build approach A:** a hand-written rewrite with no libraries.

## Goals

- A page that reads as a living code editor: title bar, file tabs, line numbers, explorer tree, terminal, status strip.
- Effects that feel alive but stay calm enough to read: signal pulses, heading scramble, typed terminal lines, a faint scan-line overlay, glows on hover, blinking status lights.
- Browsing 57 skills by folder and search, with each skill opening like a file: agent support, the one-line install command, the skill's text, and the full SKILL.md.
- Every current behaviour kept (see Constraints).
- Excellent on phones, laptops and HiDPI screens.

## Non-goals

- No change to the data pipeline: `scripts/build_site_data.py`, `website/data.js` and `website/docs.js` keep their shape.
- No change to the shared footer, the shared contact data, or the org theme chooser kit.
- No framework, bundler or build step; no change to how GitHub Pages deploys.
- No new content (marketing copy, blog, analytics).

## Anti-goals (failure even if it "works")

- Big display-font hero headlines, or a flat grid of identical cards.
- Effects that hurt reading: constant flashing, heavy glitching, motion that cannot be turned off, or text over busy animation.
- An intro or boot screen that blocks the page or covers the theme chooser.
- A page that is slow or janky on a phone, or that phones zoom out because something is wider than the screen.
- Hard-coded colours that ignore the theme chooser.

## Constraints

**Platform**
- Static files on GitHub Pages: `website/index.html`, `styles.css`, `script.js`, `favicon.svg`, `og.png`, plus the generated `data.js` (loaded with the page) and `docs.js` (loaded on demand when a skill's text is opened).
- No external JavaScript libraries. Keep the existing Google Fonts link (JetBrains Mono; Inter may be dropped if unused).

**Shared Cybercore pieces (unchanged, referenced as today)**
- `https://cybercoretech.github.io/kit/chooser.css`, `kit/chooser.js` and `kit/contact.js`, with `window.SITE = { dataRoot: 'https://cybercoretech.github.io/data', defaultTheme: 'cybercore-tech' }`.
- `<cybercore-theme-chooser default="cybercore-tech" adopt id="themeChooser">` sits in the top bar, square (never rounded), and **never inside a hamburger menu**. On phones it sits beside the menu button. Its open menu must never be covered.
- `<footer><cybercore-contact repo="cybercore-agent-skills"></cybercore-contact></footer>` stays exactly as is.

**Theming**
- All colours come from CSS custom properties. Keep today's token names (`--cc-bg`, `--cc-card`, `--cc-border`, `--cc-fg`, `--cc-fg-muted`, `--cc-neon-purple`, `--cc-neon-cyan`, `--cc-neon-green`, `--cc-neon-pink`, and the rest), so the existing `cc:theme` handler and the kit's recolouring keep working. Derived colours (glows, pulse colours, dims) are built from those tokens with `color-mix()` or `rgb(from …)` rather than new literals.
- Default palette: background `#0a0a0d`, purple `#bc13fe`, cyan `#7df9ff`, green `#39ff14`, pink `#fd3e6a`, amber `#f2d27a` for folder names.

**Behaviours to keep**
- Search (with the `/` shortcut and a phone search toggle) over skills and agents.
- Group filtering (core, general, rust, omarchy opt-in), now expressed as folders.
- Favourites stored in `localStorage` key `cc-favs`, with a favourites view.
- Deep links `#skill/<id>` and `#agent/<id>`, back and forward, and `hashchange`.
- The skill detail with the rendered SKILL.md (the existing small Markdown renderer), "copy SKILL.md", and the source link on GitHub.
- The single-skill install picker and command: `bash ~/cybercore-agent-skills/scripts/install-skill.sh <agent> <skill>`. Agent setup command: `bash ~/cybercore-agent-skills/<agent>/agent-project-setup/<script>`. Availability text for default versus opt-in pack skills.
- Agent details: name, status (`verified`, `needs-setup`, `unverified`, `rules-only`), skills and rules folders, instructions file, notes.
- The rules section, showing each rule's title and body from `data.js`.
- The `cc:theme` event handler, focus-trapped modals with Escape to close, the copy toast, and the mobile nav.

**Quality**
- Mobile-first, from 320 px wide to large desktops. No horizontal page overflow at any width; wide content scrolls inside its own container.
- Readable sizes: body text at least 13 px and tap targets at least 44 px on phones (the org's mobile floor is 11 px text and 24 px taps; this page aims higher).
- Themed scrollbars on the page and every inner scroll area (`scrollbar-color` plus `::-webkit-scrollbar*`).
- `prefers-reduced-motion: reduce` stops every animation and shows final states (fully typed text, unscrambled headings, static traces).
- WCAG AA contrast in the default theme, visible focus rings, semantic landmarks and headings, real buttons and links.
- Checked at 2× device pixel ratio (the owner's screen is HiDPI).

## Approaches considered

| Approach | Trade-off | Outcome |
|---|---|---|
| **A. Hand-written rewrite, no libraries** | More hand-written code; no dependencies, fastest, deploys as today, every effect tunable | **Chosen by the owner** |
| B. Rewrite plus anime.js | Smoother sequencing with less code; an outside dependency loaded from a CDN | Not chosen |
| C. Restyle the current markup | Smallest change; today's table-centred structure fights the explorer, tabs and terminals | Not chosen |
| Framework with a build step (Astro or similar) | Changes deployment and data generation for no gain | Ruled out |

## Design

### Page structure (top to bottom)

1. **Title bar** (sticky): three window dots; `CYBERCORE / agent-skills` brand; a menu (`explorer`, `agents`, `install`, `rules`, `repo`) that jumps to sections and shows the active one with a cyan underline; a search field (`/ search skills, agents…`); the theme chooser at the right. On phones: brand, search toggle, menu button, chooser. The menu opens as a drawer that never contains the chooser.
2. **Hero: `README.md` tab** with a line-number gutter. Contents: a kicker `// 00 · agent-skill-catalog`; the heading `Agent × Skill Matrix` in JetBrains Mono (about 30 px desktop and 21 px phone, the × in neon purple) that scrambles in on load; a one-line description; a small terminal window that types the setup line (`$ ./setup-claude.sh` then `✓ 53 skills · 5 rules`); stats (skills, agents, rules, opt-in) computed from `data.js`, never hard-coded; and circuit traces with travelling signal pulses (cyan, purple, green) behind the right side, never under the text.
3. **Explorer: `explorer` tab** (the catalog).
   - **Left: tree.** A search box, then folders: `core/`, `general/`, `rust/`, `omarchy/` (marked opt-in), and a `★ favourites` folder. Folder names come from group IDs with counts; files are `<skill-id>.md`, with the skill icon as a prefix. Folders collapse and expand; the selected file has a cyan bar and tint. The `rules/` folder from the mockup lives in the Rules section instead, so the tree only lists skills.
   - **Right: editor pane** with tabs for open skills (most recent active, closable) and a fixed `⊞ matrix` tab. A skill shows: a `// category · group · vN` comment; the icon and name; the description; one tag per agent (green glow if supported, struck through if not); the availability text; the install command with copy and an agent selector (default Claude); the first section of the skill's text (loaded from `docs.js` on open); and actions for `open full SKILL.md`, `copy SKILL.md`, `source on GitHub` and favourite.
   - **The matrix tab** shows the compact skill-by-agent grid with node dots, scrolling inside its own container.
   - **Phones:** the tree becomes a collapsible folder list, and tapping a skill opens it as a full-screen sheet with the same content and a back button.
   - **First load:** the deep-linked skill opens, otherwise the first skill in `data.js` order, so the pane is never empty. (`data.js` has no dates, so "most recent" cannot be computed.)
4. **Agents: `agents.json` tab.** All 13 agents as cards in a responsive grid (4 columns desktop, 2 tablet, 1 or 2 phone). Each card shows the name, the skills folder (or "rules only"), and a status light: green verified, amber needs setup, pink unverified, dim rules only. Lights blink slowly. Opening a card shows the agent detail in the same sheet component used for skills (deep link `#agent/<id>`).
5. **Install and Rules**, side by side on desktop and stacked on phones.
   - **Install:** a terminal window with one tab per agent that has an installer. The clone and setup commands type in when the section first appears, with a copy button; switching tabs swaps the command instantly.
   - **Rules:** an editor window with one tab per rule file (`safety.md`, `workflow.md`, `concise-output.md`, `rust.md`, `gleam.md`, from `data.js`), rendering the rule body with the Markdown renderer.
6. **Repo: `repo.log` tab.** Links to the repository, README, setup guide, MIT licence and issues, styled as git-log lines. It ends with a thin editor status strip: branch `main`, skill, agent and rule counts, and the current theme name (updated on `cc:theme`).
7. **Footer:** the shared `<cybercore-contact repo="cybercore-agent-skills">`, unchanged.

### Visual language

- JetBrains Mono everywhere. Sizes stay code-like: about 12–14 px body on desktop, at least 13 px on phones, headings 17–30 px.
- Each section is a panel with a tab strip (file name tab with a cyan top bar, plus a `// NN · description` comment).
- **Backdrop:** near-black with a very faint dot or line grid and two low glows (purple top-left, cyan bottom-right) built from tokens. A fixed scan-line overlay at very low opacity, ignoring pointer events.
- Folder names in amber, comments in the dim colour, success and terminal text in green, links and focus in cyan, and accents (×, active heading parts) in purple.
- Panel corners are square. Borders are 1 px in the border token. Hover adds a soft glow in the accent token.

### Effects

| Effect | Where | Notes |
|---|---|---|
| Signal pulses on circuit traces | Hero; thin traces linking section tabs down the page | Inline SVG paths with an animated dash; 3 to 4 s loops, staggered colours |
| Heading scramble | Section headings as they first enter view; the hero on load | Short (under about 600 ms), once per heading, final text set immediately for assistive technology (`aria-label` or visually hidden text) |
| Typed terminal lines | Hero terminal; Install terminal on first view | Character steps, a blinking caret, then still |
| Scan lines | Whole page, fixed | Very low opacity |
| Glow on hover and focus | Tree files, cards, tabs, buttons | Uses the accent tokens |
| Status lights | Agent cards | Slow opacity blink |

Every effect runs only after the page is interactive, never blocks input, pauses when the tab is hidden, and is fully disabled for reduced motion.

### Files

- `website/index.html`: the new structure, keeping the existing `<head>` meta tags (title, description, canonical, Open Graph, favicon) and the kit links.
- `website/styles.css`: rewritten, ordered tokens, base, layout, components, effects, then responsive overrides.
- `website/script.js`: rewritten around the explorer, reusing and adapting the current helpers (data access, Markdown renderer, modal focus trap, favourites, deep links, install picker, `cc:theme` handling, copy and toast).
- `scripts/build_site_data.py`, `data.js` and `docs.js`: unchanged.

### Verification

- `scripts/validate_templates.py` and the installer smoke tests still pass (the site data is untouched).
- Render with headless Chromium at 390, 768, 1280 and 1440 px, at 2× pixel density, in the default theme and at least two chooser themes. Check for no horizontal overflow, readable text, nothing clipped, the chooser menu on top, and the footer intact.
- Keyboard-only walk-through: menu, search with `/`, tree, tabs, copy, sheets with Escape, focus return.
- Reduced motion: no animation anywhere.
- Deep links `#skill/clarify-before-building` and `#agent/claude` open the right views on load and with back and forward.
- The console has no errors; `docs.js` loads only when a skill's text is opened.

## Left to the builder

- Exact spacing, the trace paths and the pulse timing, within the visual language above.
- Whether the matrix tab shows all agents or groups Ollama separately (it supports no skills).
- How the agent selector for the install command looks (tabs, menu or chips).
- Internal organisation of `script.js`, as long as behaviours and deep links match.

## Calls I made (the owner can override)

- The tree lists skills only; rules live in their own section rather than a `rules/` folder.
- A `★ favourites` folder in the tree replaces today's favourites filter button.
- The first skill shown is the deep-linked one, otherwise the first skill in `data.js` order.
- Search: the title-bar field is the main search. It filters the explorer tree and the agent cards together, and the tree's own search box mirrors the same query; `/` focuses the title-bar field (or opens it on phones).
- `og.png` (the share image) stays as it is in this change; a refreshed image can follow separately.
- Inter is dropped if nothing uses it after the rewrite.
- The install command's agent defaults to Claude, and the choice is remembered for the session.
