# Skills Explorer Cyber HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Skills Explorer (`website/`) as a circuit-editor Cyber HUD with an explorer tree and editor pane, keeping the data pipeline, the shared kit pieces and every current behaviour.

**Architecture:** Three ES modules replace today's single script. `lib.js` holds pure logic (no DOM) tested with Node's built-in runner. `script.js` renders the page from `window.CC_DATA` and handles routing, sheets and events. `effects.js` adds motion and respects reduced motion. Browser behaviour is tested through a small Chrome DevTools Protocol helper against a local static server. No new dependencies.

**Tech Stack:** HTML, CSS (custom properties, `color-mix()`), ES modules, inline SVG; tests with `node --test` (Node 22+) and headless Chromium or Chrome over CDP using Node's built-in `WebSocket`.

**Spec:** `docs/superpowers/specs/2026-11-19-skills-explorer-cyber-hud-design.md`

## Global Constraints

- Static files only, served from `website/` by `.github/workflows/pages.yml`; no framework, bundler, build step or external JavaScript library.
- `scripts/build_site_data.py`, `website/data.js` and `website/docs.js` are unchanged. `data.js` loads as a classic script before the modules; `docs.js` loads only when a skill's text is opened.
- Keep the `<head>` meta tags (title, description, canonical, Open Graph, Twitter, favicon), `kit/chooser.css`, `kit/chooser.js`, `kit/contact.js`, and `window.SITE = { dataRoot: 'https://cybercoretech.github.io/data', defaultTheme: 'cybercore-tech' }`.
- `<cybercore-theme-chooser default="cybercore-tech" adopt id="themeChooser">` lives in the title bar, square, never inside the phone drawer; its open menu is never covered.
- Footer is exactly `<footer><cybercore-contact repo="cybercore-agent-skills"></cybercore-contact></footer>`.
- All colours come from today's token names (`--cc-bg`, `--cc-bg-secondary`, `--cc-card`, `--cc-border`, `--cc-fg`, `--cc-fg-muted`, `--cc-fg-dim`, `--cc-neon-purple`, `--cc-neon-cyan`, `--cc-neon-green`, `--cc-neon-pink`, `--cc-warning`); derived colours use `color-mix()`. Add `--cc-amber: #f2d27a` for folder names.
- JetBrains Mono everywhere; body text at least 13 px on phones; tap targets at least 44 px on phones; no horizontal page overflow from 320 px up.
- Themed scrollbars on the page and every inner scroll area (`scrollbar-color` and `::-webkit-scrollbar*`).
- `prefers-reduced-motion: reduce` stops every animation and shows final states.
- No intro screen; effects never block input and pause when the tab is hidden.
- Commands: setup `bash ~/cybercore-agent-skills/<agent.id>/agent-project-setup/<agent.script>`; single skill `bash ~/cybercore-agent-skills/scripts/install-skill.sh <agent.id> <skill.id>`.
- Favourites live in `localStorage` key `cc-favs` (JSON array of skill IDs). Deep links: `#skill/<id>`, `#agent/<id>`.

## Review Focus

- **Theme switching:** choosing another chooser theme (a `cc:theme` event with a palette) must recolour the title bar, tree, pulses and status strip; nothing may stay in a hard-coded colour. Test in Task 6.
- **Narrow phones and long names:** at 320 px, the longest skill ID (`agent-evaluation-and-benchmarking`) and the 13 install tabs must not widen the page. Test in Task 2 (shell) and Task 3 (explorer).
- **`docs.js` failing to load** (offline, blocked): the pane shows "Could not load the skill text" with a Retry button, never a blank area or an uncaught error. Test in Task 4.
- **Unknown deep link** (`#skill/does-not-exist`): the page opens the first skill and shows the toast "No skill named does-not-exist"; no exception. Test in Task 3.
- **Storage unavailable** (private mode, `localStorage` throwing): favourites still toggle for the session without errors. Test in Task 1 and Task 3.

---

### Task 1: Pure logic module and Node test runner

**Files:**
- Create: `website/lib.js`
- Create: `tests/site/lib.test.mjs`
- Modify: `.github/workflows/validate.yml` (add a step: `node --test tests/site/lib.test.mjs`)

**Interfaces:**
- Consumes: the `CC_DATA` shape (`repo`, `ref`, `groups[{id,title,default,pack}]`, `skills[{id,name,group,category,icon,desc,version,files}]`, `agents[{id,name,icon,badge,instructions,rulesDir,skillsDir,script,status,statusText,notes}]`, `rules[{id,file,title,body}]`).
- Produces (all named exports of `website/lib.js`):
  - `setupCommand(agent) -> string`
  - `installSkillCommand(agent, skill) -> string`
  - `agentLocation(agent) -> string` (`'~/' + skillsDir + '/'`, or `'~/' + rulesDir + '/ (rules only)'`)
  - `skillAgents(agents) -> agent[]` (agents with a `skillsDir`)
  - `supportsSkill(agent) -> boolean`
  - `availabilityText(skill, groups, agents) -> string` (today's two sentences, unchanged wording)
  - `folders(skills, groups) -> Array<{id, title, optIn: boolean, skills: skill[]}>` (group order, skills sorted by ID)
  - `matchesQuery(text, query) -> boolean` (case-insensitive, every whitespace-separated term must match)
  - `filterSkills(skills, query) -> skill[]` (matches ID, name, description, category)
  - `filterAgents(agents, query) -> agent[]` (matches ID, name, status text)
  - `parseHash(hash) -> {type: 'skill'|'agent', id: string} | null`
  - `firstSkillId(skills, hash) -> {id: string, missing: string|null}` (deep-linked ID if it exists; else the first skill, with `missing` set to the unknown ID)
  - `stats(data) -> {skills, agents, rules, defaultSkills, optIn}`
  - `statusInfo(agent) -> {label: string, tone: 'ok'|'warn'|'bad'|'off'}` (`verified` ok, `needs-setup` warn, `unverified` bad, `rules-only` off)
  - `escapeHtml(text) -> string`
  - `renderMarkdown(md) -> string` (move today's renderer from `website/script.js` unchanged in behaviour)
  - `createFavorites(storage) -> {has(id), toggle(id) -> boolean, list() -> string[]}` (persists to `storage` under `cc-favs`; keeps working in memory if `storage` throws)

- [ ] **Step 1: Write the failing tests** in `tests/site/lib.test.mjs` using `node:test` and `node:assert/strict`, loading the real data with `vm.runInNewContext(readFileSync('website/data.js'), ctx)` to get `ctx.window.CC_DATA`:

```js
test('commands match the site contract', () => {
  const claude = data.agents.find(a => a.id === 'claude');
  assert.equal(setupCommand(claude), 'bash ~/cybercore-agent-skills/claude/agent-project-setup/' + claude.script);
  assert.equal(installSkillCommand(claude, { id: 'rust-testing' }),
    'bash ~/cybercore-agent-skills/scripts/install-skill.sh claude rust-testing');
});
test('ollama is rules only', () => {
  const ollama = data.agents.find(a => a.id === 'ollama');
  assert.equal(supportsSkill(ollama), false);
  assert.equal(agentLocation(ollama), '~/.ollama/rules/ (rules only)');
  assert.deepEqual(statusInfo(ollama).tone, 'off');
});
test('folders follow group order and mark the opt-in pack', () => {
  const f = folders(data.skills, data.groups);
  assert.deepEqual(f.map(x => x.id), ['core', 'general', 'rust', 'omarchy']);
  assert.equal(f.find(x => x.id === 'omarchy').optIn, true);
  assert.equal(f.reduce((n, x) => n + x.skills.length, 0), data.skills.length);
});
test('search needs every term', () => {
  assert.ok(filterSkills(data.skills, 'clarify building').some(s => s.id === 'clarify-before-building'));
  assert.equal(filterSkills(data.skills, 'clarify zzz').length, 0);
});
test('hash parsing and unknown deep links', () => {
  assert.deepEqual(parseHash('#skill/security-audit'), { type: 'skill', id: 'security-audit' });
  assert.equal(parseHash('#nonsense'), null);
  assert.deepEqual(firstSkillId(data.skills, '#skill/does-not-exist'),
    { id: data.skills[0].id, missing: 'does-not-exist' });
});
test('markdown is escaped', () => {
  assert.ok(!renderMarkdown('<script>alert(1)</script>').includes('<script>'));
  assert.match(renderMarkdown('# Title\n\n- **a**'), /<h1[^>]*>Title<\/h1>[\s\S]*<strong>a<\/strong>/);
});
test('favourites survive a throwing storage', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const favs = createFavorites(broken);
  assert.equal(favs.toggle('rust-testing'), true);
  assert.equal(favs.has('rust-testing'), true);
});
test('stats are computed', () => {
  const s = stats(data);
  assert.equal(s.skills, data.skills.length);
  assert.equal(s.optIn, data.skills.filter(x => x.group === 'omarchy').length);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `node --test tests/site/lib.test.mjs`
Expected: FAIL, cannot find module `website/lib.js`.

- [ ] **Step 3: Implement `website/lib.js`** with the exports above. Move `renderMarkdown`, `renderInline` and `escapeHtml` from `website/script.js` as they are.

- [ ] **Step 4: Run to confirm it passes**

Run: `node --test tests/site/lib.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Add the CI step** to `.github/workflows/validate.yml` after the existing validation steps: `- name: Site logic tests` / `run: node --test tests/site/lib.test.mjs`.

- [ ] **Step 6: Commit**

```bash
git add website/lib.js tests/site/lib.test.mjs .github/workflows/validate.yml
git commit -m "feat(site): pure logic module with node tests"
```

---

### Task 2: Browser test harness, page shell, title bar and tokens

**Files:**
- Create: `tests/site/harness.mjs`
- Create: `tests/site/shell.test.mjs`
- Rewrite: `website/index.html`
- Rewrite: `website/styles.css` (tokens, base, backdrop, title bar, section panels, phone drawer, footer spacing, scrollbars)
- Rewrite: `website/script.js` (entry module: imports `lib.js`, renders the title bar state, drawer and section shells)

**Interfaces:**
- Consumes: Task 1 exports.
- Produces:
  - `tests/site/harness.mjs`: `serveWebsite() -> Promise<{url: string, close(): Promise<void>}>` (static server on a free port for `website/`); `openPage(url, {width, height, dpr = 2, reducedMotion = false}) -> Promise<{evaluate(expr: string) -> Promise<any>, consoleErrors: string[], close(): Promise<void>}>` (launches the browser from `CHROME_BIN`, else `chromium`, `google-chrome-stable` or `google-chrome`, with `--headless=new --remote-debugging-port=0`; reads the DevTools URL from stderr; drives it with the built-in `WebSocket`; waits for `load` plus `document.fonts.ready`).
  - `index.html` landmarks used by later tasks: `header.titlebar` (with `nav.menu`, `#search` input, `#searchToggle`, `#menuButton`, `cybercore-theme-chooser#themeChooser`), `nav#drawer`, `main` with `section#hero`, `section#explorer`, `section#agents`, `section#install`, `section#rules`, `section#repo`, each holding a `.panel > .panel-tabs` strip, then `footer > cybercore-contact[repo="cybercore-agent-skills"]`, `#sheet` (dialog container), `#toast`.
  - `script.js` export-free entry; defines `showToast(message)` and `openDrawer(open: boolean)` used internally by later tasks in the same file.

- [ ] **Step 1: Write the failing browser tests** in `tests/site/shell.test.mjs` (skip with a clear message if no browser binary is found, unless `SITE_REQUIRE_BROWSER=1`). Every browser test file opens `site = await serveWebsite()` and a shared `page = await openPage(site.url + '?test=1', { width: 1440, height: 900 })` in `before`, and closes both in `after`; `data` comes from `page.evaluate('window.CC_DATA')`:

```js
test('chooser sits in the title bar, never in the drawer', async () => {
  assert.equal(await page.evaluate(`!!document.querySelector('header.titlebar cybercore-theme-chooser#themeChooser')`), true);
  assert.equal(await page.evaluate(`!!document.querySelector('#drawer cybercore-theme-chooser')`), false);
});
test('shared footer is untouched', async () => {
  assert.equal(await page.evaluate(`document.querySelector('footer').innerHTML.trim().startsWith('<cybercore-contact repo="cybercore-agent-skills"')`), true);
});
for (const width of [320, 390, 768, 1440]) {
  test(`no horizontal overflow at ${width}px`, async () => {
    const p = await openPage(site.url, { width, height: 900 });
    assert.equal(await p.evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
    await p.close();
  });
}
test('sections and kit tags exist', async () => {
  for (const id of ['hero', 'explorer', 'agents', 'install', 'rules', 'repo'])
    assert.equal(await page.evaluate(`!!document.getElementById('${id}')`), true, id);
  assert.equal(await page.evaluate(`!!document.querySelector('script[src="https://cybercoretech.github.io/kit/chooser.js"]')`), true);
});
test('scrollbars are themed', async () => {
  assert.notEqual(await page.evaluate(`getComputedStyle(document.documentElement).scrollbarColor`), 'auto');
});
test('no console errors', () => assert.deepEqual(page.consoleErrors, []));
```

- [ ] **Step 2: Run to confirm failure**

Run: `SITE_REQUIRE_BROWSER=1 node --test tests/site/shell.test.mjs`
Expected: FAIL (old page has no `section#hero`, no `#drawer`).

- [ ] **Step 3: Build the shell.** `index.html`: keep the head block and kit tags; load `data.js` as `<script src="data.js" defer>` and `script.js` as `<script type="module" src="script.js">`; drop the Inter font if nothing uses it. Title bar per spec section "Page structure" item 1. `styles.css`: tokens (keep today's names, add `--cc-amber`), backdrop (faint grid plus two token glows), fixed scan-line layer `.scanlines` (`pointer-events: none`), square panels with tab strips, title bar sticky, drawer for widths up to 900 px, scrollbars, focus rings in `--cc-neon-cyan`.

- [ ] **Step 4: Run to confirm it passes**

Run: `SITE_REQUIRE_BROWSER=1 node --test tests/site/shell.test.mjs`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/site/harness.mjs tests/site/shell.test.mjs website/index.html website/styles.css website/script.js
git commit -m "feat(site): editor shell, title bar, tokens and browser test harness"
```

---

### Task 3: Explorer tree, search, favourites, editor pane, matrix tab and deep links

**Files:**
- Modify: `website/script.js` (explorer rendering and routing)
- Modify: `website/styles.css` (tree, tabs, pane, agent tags, command box, matrix, phone sheet mode)
- Create: `tests/site/explorer.test.mjs`

**Interfaces:**
- Consumes: Task 1 `folders`, `filterSkills`, `filterAgents`, `parseHash`, `firstSkillId`, `availabilityText`, `installSkillCommand`, `createFavorites`, `supportsSkill`; Task 2 landmarks, `showToast`.
- Produces (in `script.js`): `openSkill(id: string, {push = true} = {})` (opens or focuses a pane tab, updates `#skill/<id>`), `applySearch(query: string)` (filters tree and agent cards, mirrors the query into `#treeSearch`); DOM: `#tree` with `.folder[data-folder]` and `button.file[data-skill]`, `#paneTabs` with `[data-tab]` (skill tabs plus `data-tab="matrix"`), `#pane`, `#installAgent` (agent selector), `#installCommand`.

- [ ] **Step 1: Write the failing browser tests:**

```js
test('tree lists every skill in folders, plus favourites', async () => {
  assert.equal(await page.evaluate(`document.querySelectorAll('#tree button.file').length`), data.skills.length);
  assert.deepEqual(await page.evaluate(`[...document.querySelectorAll('#tree .folder')].map(f => f.dataset.folder)`),
    ['favourites', 'core', 'general', 'rust', 'omarchy']);
});
test('opening a skill shows support, command and deep link', async () => {
  await page.evaluate(`document.querySelector('[data-skill="clarify-before-building"]').click()`);
  assert.equal(await page.evaluate(`location.hash`), '#skill/clarify-before-building');
  assert.equal(await page.evaluate(`document.getElementById('installCommand').textContent.trim()`),
    'bash ~/cybercore-agent-skills/scripts/install-skill.sh claude clarify-before-building');
  assert.equal(await page.evaluate(`document.querySelectorAll('#pane .agent-tag.supported').length`), 12);
});
test('search filters and "/" focuses the title-bar search', async () => {
  await page.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))`);
  assert.equal(await page.evaluate(`document.activeElement.id`), 'search');
  await page.evaluate(`applySearchForTest('security audit')`); // exposed only when ?test=1
  assert.equal(await page.evaluate(`document.querySelectorAll('#tree button.file:not([hidden])').length`), 1);
});
test('unknown deep link falls back with a toast', async () => {
  const p = await openPage(site.url + '#skill/does-not-exist', { width: 1440, height: 900 });
  assert.equal(await p.evaluate(`document.querySelector('#paneTabs [aria-selected="true"]').dataset.tab`), data.skills[0].id);
  assert.match(await p.evaluate(`document.getElementById('toast').textContent`), /No skill named does-not-exist/);
  assert.deepEqual(p.consoleErrors, []);
});
test('favourite toggles even when storage throws', async () => {
  const p = await openPage(site.url + '?test=1&nostorage=1', { width: 1440, height: 900 });
  await p.evaluate(`document.querySelector('#pane [data-action="favourite"]').click()`);
  assert.equal(await p.evaluate(`document.querySelectorAll('[data-folder="favourites"] button.file').length`), 1);
  assert.deepEqual(p.consoleErrors, []);
});
test('phone: long names and 13 install tabs do not widen the page', async () => {
  const p = await openPage(site.url + '#skill/agent-evaluation-and-benchmarking', { width: 320, height: 800 });
  assert.equal(await p.evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
});
test('matrix tab scrolls inside its container', async () => {
  await page.evaluate(`document.querySelector('[data-tab="matrix"]').click()`);
  assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('#pane .matrix-scroll')).overflowX`), 'auto');
});
```

`?test=1` exposes `window.applySearchForTest = applySearch`; `?nostorage=1` passes a throwing storage to `createFavorites`. Both flags are ignored otherwise.

- [ ] **Step 2: Run to confirm failure**

Run: `SITE_REQUIRE_BROWSER=1 node --test tests/site/explorer.test.mjs`
Expected: FAIL (no `#tree`).

- [ ] **Step 3: Implement the explorer** per spec section "Page structure" item 3 and "Calls I made": skills-only tree, `★ favourites` folder first, first skill from `firstSkillId`, install agent defaulting to Claude and remembered in `sessionStorage` (`cc-install-agent`), pane tabs closable except `matrix`, `hashchange` and back and forward handled through `parseHash`, phone widths (up to 900 px) opening the skill as a full-screen sheet with a back button.

- [ ] **Step 4: Run to confirm it passes**

Run: `SITE_REQUIRE_BROWSER=1 node --test tests/site/explorer.test.mjs tests/site/shell.test.mjs`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add website/script.js website/styles.css tests/site/explorer.test.mjs
git commit -m "feat(site): explorer tree, editor pane, search, favourites and deep links"
```

---

### Task 4: Sheets: full SKILL.md and agent detail

**Files:**
- Modify: `website/script.js` (sheet open and close, focus trap, lazy `docs.js`)
- Modify: `website/styles.css` (sheet)
- Create: `tests/site/sheets.test.mjs`

**Interfaces:**
- Consumes: Task 1 `renderMarkdown`, `agentLocation`, `statusInfo`, `setupCommand`; Task 2 `#sheet`; Task 3 `openSkill`.
- Produces: `openSheet(kind: 'skill-doc'|'agent', id: string)`, `closeSheet()`; `loadDocs() -> Promise<object>` (inserts `docs.js` once; on failure rejects and allows retry).

- [ ] **Step 1: Write the failing browser tests:**

```js
test('docs.js loads only when skill text is opened', async () => {
  assert.equal(await page.evaluate(`!!document.querySelector('script[src="docs.js"]')`), false);
  await page.evaluate(`document.querySelector('#pane [data-action="open-doc"]').click()`);
  await page.evaluate(`new Promise(r => setTimeout(r, 500))`);
  assert.equal(await page.evaluate(`!!document.querySelector('#sheet h1')`), true);
});
test('Escape closes the sheet and returns focus', async () => {
  await page.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
  assert.equal(await page.evaluate(`document.getElementById('sheet').hidden`), true);
  assert.equal(await page.evaluate(`document.activeElement.dataset.action`), 'open-doc');
});
test('agent deep link opens the agent sheet', async () => {
  const p = await openPage(site.url + '#agent/claude', { width: 1440, height: 900 });
  assert.match(await p.evaluate(`document.getElementById('sheet').textContent`), /~\/\.claude\/skills\//);
});
test('docs.js failure shows a retry, not a blank pane', async () => {
  const p = await openPage(site.url + '?test=1&nodocs=1', { width: 1440, height: 900 });
  await p.evaluate(`document.querySelector('#pane [data-action="open-doc"]').click()`);
  await p.evaluate(`new Promise(r => setTimeout(r, 500))`);
  assert.match(await p.evaluate(`document.getElementById('sheet').textContent`), /Could not load the skill text/);
  assert.equal(await p.evaluate(`!!document.querySelector('#sheet [data-action="retry"]')`), true);
});
```

`?nodocs=1` makes `loadDocs` request `docs-missing.js` so the load fails.

- [ ] **Step 2: Run to confirm failure**

Run: `SITE_REQUIRE_BROWSER=1 node --test tests/site/sheets.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement the sheets.** Skill doc: rendered SKILL.md, `copy SKILL.md`, `source on GitHub` (`https://github.com/<repo>/blob/<ref>/skills/<id>/SKILL.md`). Agent: name, status light and label, skills and rules folders, instructions file, notes, setup command with copy. Focus trap, Escape, focus return, `aria-modal="true"`, deep links kept in sync (closing clears the hash with `history.replaceState`).

- [ ] **Step 4: Run to confirm it passes**

Run: `SITE_REQUIRE_BROWSER=1 node --test tests/site/`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add website/script.js website/styles.css tests/site/sheets.test.mjs
git commit -m "feat(site): skill text and agent sheets with lazy docs and retry"
```

---

### Task 5: Hero, agents grid, install terminal, rules tabs and repo log

**Files:**
- Modify: `website/script.js`, `website/styles.css`
- Create: `tests/site/sections.test.mjs`

**Interfaces:**
- Consumes: Task 1 `stats`, `statusInfo`, `agentLocation`, `setupCommand`, `renderMarkdown`; Task 4 `openSheet`.
- Produces: DOM `#heroStats [data-stat]`, `#agentGrid .agent-card[data-agent]` with `.led[data-tone]`, `#installTabs [data-agent]` and `#installTerminal`, `#ruleTabs [data-rule]` and `#ruleBody`, `#statusStrip [data-status="theme"]`.

- [ ] **Step 1: Write the failing browser tests:**

```js
test('hero stats come from data', async () => {
  assert.equal(await page.evaluate(`document.querySelector('#heroStats [data-stat="skills"]').textContent`), String(data.skills.length));
});
test('agent cards show tones', async () => {
  assert.equal(await page.evaluate(`document.querySelectorAll('#agentGrid .agent-card').length`), data.agents.length);
  assert.equal(await page.evaluate(`document.querySelector('[data-agent="ollama"] .led').dataset.tone`), 'off');
  assert.equal(await page.evaluate(`document.querySelector('[data-agent="hermes"] .led').dataset.tone`), 'warn');
});
test('install tabs switch commands', async () => {
  await page.evaluate(`document.querySelector('#installTabs [data-agent="codex"]').click()`);
  assert.match(await page.evaluate(`document.getElementById('installTerminal').textContent`), /codex\/agent-project-setup\//);
});
test('rules render each file', async () => {
  assert.deepEqual(await page.evaluate(`[...document.querySelectorAll('#ruleTabs [data-rule]')].map(t => t.dataset.rule)`),
    data.rules.map(r => r.id));
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `SITE_REQUIRE_BROWSER=1 node --test tests/site/sections.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement the sections** per spec "Page structure" items 2, 4, 5 and 6: hero gutter, heading, description, terminal and stats; responsive agent grid (4, 2, then 1 or 2 columns); install terminal with clone, `cd` and setup lines plus copy (tabs scroll horizontally inside the panel on phones); rule tabs with `renderMarkdown`; repo links as git-log lines (repository, README, setup guide, MIT licence, issues, same URLs as today) and the status strip (branch `main`, counts, theme name).

- [ ] **Step 4: Run to confirm it passes**

Run: `SITE_REQUIRE_BROWSER=1 node --test tests/site/`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add website/script.js website/styles.css tests/site/sections.test.mjs
git commit -m "feat(site): hero, agents, install terminal, rules and repo log"
```

---

### Task 6: Effects, theme recolouring and reduced motion

**Files:**
- Create: `website/effects.js`
- Modify: `website/script.js` (call effects after first render; `cc:theme` handler), `website/styles.css` (pulse keyframes, glows, scan lines, LEDs, reduced-motion block)
- Create: `tests/site/effects.test.mjs`

**Interfaces:**
- Consumes: Task 2 to 5 DOM.
- Produces (exports of `website/effects.js`): `prefersReducedMotion() -> boolean`; `scramble(el: HTMLElement, {duration = 550} = {}) -> Promise<void>` (keeps the final text in an `aria-label`); `typeLines(el: HTMLElement, lines: string[], {cps = 40} = {}) -> Promise<void>`; `onFirstView(el: Element, fn: () => void) -> void`; `startEffects(root: Document) -> void` (wires scramble on headings, typing in hero and install terminals, adds `.fx-paused` on `<html>` while `document.hidden`).

- [ ] **Step 1: Write the failing browser tests:**

```js
test('reduced motion: nothing animates and text is final', async () => {
  const p = await openPage(site.url, { width: 1440, height: 900, reducedMotion: true });
  assert.equal(await p.evaluate(`document.getAnimations().filter(a => a.playState === 'running').length`), 0);
  assert.match(await p.evaluate(`document.querySelector('#hero h1').textContent`), /Agent × Skill Matrix/);
});
test('effects run normally', async () => {
  assert.ok(await page.evaluate(`document.getAnimations().length`) > 0);
  assert.ok(await page.evaluate(`document.querySelectorAll('#hero svg .pulse').length`) >= 3);
});
test('theme palette recolours the page', async () => {
  const before = await page.evaluate(`getComputedStyle(document.querySelector('header.titlebar')).backgroundColor`);
  await page.evaluate(`document.dispatchEvent(new CustomEvent('cc:theme', { detail: { id: 'test', palette: { bg: '112233', panel: '223344', cyan: '00ff88', purple: 'ff00aa' } } }))`);
  assert.notEqual(await page.evaluate(`getComputedStyle(document.querySelector('header.titlebar')).backgroundColor`), before);
  assert.match(await page.evaluate(`document.querySelector('#statusStrip [data-status="theme"]').textContent`), /test/);
});
test('effects pause when hidden', async () => {
  await page.evaluate(`Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))`);
  assert.equal(await page.evaluate(`document.documentElement.classList.contains('fx-paused')`), true);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `SITE_REQUIRE_BROWSER=1 node --test tests/site/effects.test.mjs`
Expected: FAIL (no `effects.js`).

- [ ] **Step 3: Implement the effects** per the spec's effects table: SVG pulses in the hero and thin traces linking the section tab strips down the page (3 to 4 s loops, staggered cyan, purple and green, never under text), heading scramble once per heading on first view, typed terminals, scan lines, hover and focus glows, slow LED blink, `.fx-paused *{animation-play-state:paused}`, and a `@media (prefers-reduced-motion: reduce)` block disabling every animation. Keep today's `cc:theme` palette mapping onto the token names and update the status strip theme name.

- [ ] **Step 4: Run to confirm it passes**

Run: `SITE_REQUIRE_BROWSER=1 node --test tests/site/`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add website/effects.js website/script.js website/styles.css tests/site/effects.test.mjs
git commit -m "feat(site): circuit pulses, scramble, typing, theme recolouring and reduced motion"
```

---

### Task 7: Visual verification, keyboard walk-through, clean-up and CI

**Files:**
- Modify: `.github/workflows/validate.yml` (run `node --test tests/site/` with `SITE_REQUIRE_BROWSER=1`, using the runner's preinstalled Chrome via `CHROME_BIN=$(which google-chrome)`)
- Modify: `website/styles.css`, `website/script.js` (remove anything unused from the old site)
- Create: `tests/site/screenshots.mjs` (writes PNGs to a directory given by `OUT_DIR`, outside the repository)

**Interfaces:**
- Consumes: `openPage` from Task 2.
- Produces: screenshots at 390, 768, 1280 and 1440 px, 2× density, default theme plus two chooser themes, and reduced motion.

- [ ] **Step 1: Capture and inspect.** Run `OUT_DIR=<scratch dir> node tests/site/screenshots.mjs`, open every image, and check against the spec's Verification list: readable text, nothing clipped, the chooser menu on top when open, the shared footer intact, traces never under text, and no single-colour (blank) captures.

- [ ] **Step 2: Keyboard walk-through** with the browser: Tab through the title bar, `/` search, tree, pane tabs, copy buttons, sheets (Escape, focus return), agent cards, install tabs and rule tabs. Fix any trap or missing focus ring.

- [ ] **Step 3: Remove dead code and unused selectors**, including the old matrix-page CSS and the Inter font link if unused.

- [ ] **Step 4: Run every check**

Run: `node --test tests/site/ && python3 scripts/build_site_data.py --check && python3 scripts/validate_templates.py && bash tests/smoke_installers.sh`
Expected: all pass. Run `python3 scripts/check_public_sanitization.py` after stopping the brainstorm companion server and moving its local `.superpowers/` folder out of the working tree (that folder contains local paths and is excluded from git); expected: passes.

- [ ] **Step 5: Update CI and commit**

```bash
git add .github/workflows/validate.yml website/ tests/site/screenshots.mjs
git commit -m "test(site): browser tests in CI, visual checks and clean-up"
```

- [ ] **Step 6: Push and open the pull request** with before and after screenshots described, then wait for CI.
