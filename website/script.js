// CyberCore Agent Skills Explorer: page entry (ES module).
// Renders the page from window.CC_DATA (data.js) using the pure helpers in
// lib.js. docs.js (full SKILL.md text) loads only when a skill's text is opened.
import * as lib from './lib.js';
import { startEffects } from './effects.js';

const DATA = window.CC_DATA || { repo: '', ref: 'main', groups: [], skills: [], agents: [], rules: [] };
const params = new URLSearchParams(location.search);
const TEST = params.has('test');
const PHONE = window.matchMedia('(max-width: 900px)');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const skillById = Object.fromEntries(DATA.skills.map(s => [s.id, s]));
const agentById = Object.fromEntries(DATA.agents.map(a => [a.id, a]));

/** Small element builder: attributes as an object, children as nodes or text. */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// ----- Storage (blocked storage must never break the page) -----
const blockedStorage = { getItem() { throw new Error('storage blocked'); }, setItem() { throw new Error('storage blocked'); } };
function storage(kind) {
  if (TEST && params.has('nostorage')) return blockedStorage;
  try { return window[kind] || blockedStorage; } catch { return blockedStorage; }
}
const favorites = lib.createFavorites(storage('localStorage'));
function sessionGet(key) { try { return storage('sessionStorage').getItem(key); } catch { return null; } }
function sessionSet(key, value) { try { storage('sessionStorage').setItem(key, value); } catch { /* session only */ } }

// ----- Toast and copy -----
let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = el('textarea', { 'aria-hidden': 'true', style: 'position:fixed;opacity:0' });
    area.value = text;
    document.body.append(area);
    area.select();
    try { document.execCommand('copy'); } catch { /* best effort */ }
    area.remove();
  }
  showToast(message);
}

// ----- Title bar: drawer, search toggle, active section -----
function openDrawer(open) {
  const drawer = $('#drawer');
  const button = $('#menuButton');
  drawer.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

function openSearchBox(open) {
  $('.search').classList.toggle('open', open);
  $('#searchToggle').setAttribute('aria-expanded', String(open));
}

function setupTitlebar() {
  $('#menuButton').addEventListener('click', () => openDrawer($('#drawer').hidden));
  $$('#drawer a').forEach(a => a.addEventListener('click', () => openDrawer(false)));
  $('#searchToggle').addEventListener('click', () => {
    const open = !$('.search').classList.contains('open');
    openSearchBox(open);
    if (open) $('#search').focus();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#drawer').hidden) openDrawer(false);
  });

  const links = $$('.menu a, #drawer a');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const id = entry.target.id;
      links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + id)));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['explorer', 'agents', 'install', 'rules', 'repo'].forEach(id => observer.observe(document.getElementById(id)));
}

function renderGutter() {
  const gutter = $('#hero .gutter');
  gutter.textContent = '';
  for (let i = 1; i <= 14; i++) gutter.append(String(i), document.createElement('br'));
}

// ===== Explorer =====
const state = {
  openTabs: [],
  active: null,
  query: '',
  installAgent: agentById[sessionGet('cc-install-agent')] ? sessionGet('cc-install-agent') : 'claude',
};
const MAX_TABS = 6;
// Phones start with skill folders collapsed (favourites open) so later sections stay reachable.
const collapsed = new Set(PHONE.matches ? DATA.groups.map(g => g.id) : []);

function renderExplorerShell() {
  $('#explorerBody').replaceChildren(
    el('div', { class: 'explorer' },
      el('aside', { class: 'tree-panel', 'aria-label': 'Skill folders' },
        el('div', { class: 'tree-head' }, el('span', { class: 'tree-title' }, 'EXPLORER'),
          el('span', { class: 'tree-total' }, `${DATA.skills.length} skills`)),
        el('label', { class: 'tree-search' },
          el('span', { 'aria-hidden': 'true' }, '/'),
          el('input', { id: 'treeSearch', type: 'search', placeholder: 'filter skills…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Filter skills' })),
        el('div', { id: 'tree', class: 'tree' })),
      el('div', { class: 'editor' },
        el('div', { id: 'paneTabs', class: 'pane-tabs', role: 'tablist', 'aria-label': 'Open skills' }),
        el('div', { id: 'pane', class: 'pane', role: 'tabpanel', tabindex: '-1' }))));
}

function renderTree() {
  const tree = $('#tree');
  const favouriteSkills = favorites.list().map(id => skillById[id]).filter(Boolean);
  const all = [{ id: 'favourites', optIn: false, skills: favouriteSkills }, ...lib.folders(DATA.skills, DATA.groups)];
  tree.replaceChildren(...all.map(folder => {
    const files = el('div', { class: 'folder-files' }, folder.skills.map(skill =>
      el('button', { class: 'file', type: 'button', 'data-skill': skill.id, title: skill.desc },
        el('span', { class: 'file-icon', 'aria-hidden': 'true' }, skill.icon || '#'),
        el('span', { class: 'file-name' }, `${skill.id}.md`))));
    if (folder.id === 'favourites' && !folder.skills.length) files.append(el('p', { class: 'folder-empty' }, '// star a skill to pin it here'));
    files.hidden = collapsed.has(folder.id);
    const toggle = el('button', { class: 'folder-toggle', type: 'button', 'aria-expanded': String(!files.hidden) },
      el('span', { class: 'caret', 'aria-hidden': 'true' }, '▾'),
      el('span', { class: 'folder-name' }, folder.id === 'favourites' ? '★ favourites/' : `${folder.id}/`),
      el('span', { class: 'count' }, String(folder.skills.length)),
      folder.optIn && el('span', { class: 'opt-in' }, 'opt-in'));
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      files.hidden = !open;
      if (open) collapsed.delete(folder.id); else collapsed.add(folder.id);
    });
    return el('div', { class: 'folder', 'data-folder': folder.id }, toggle, files);
  }));
  markActiveFile();
  applySearch(state.query, { mirror: false });
}

function markActiveFile() {
  $$('#tree button.file').forEach(b => {
    const on = b.dataset.skill === state.active;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
}

function renderTabs() {
  const tabs = $('#paneTabs');
  tabs.replaceChildren(
    ...state.openTabs.map(id => el('div', { class: 'pane-tab' + (id === state.active ? ' active' : '') },
      el('button', { class: 'tab-open', type: 'button', role: 'tab', 'data-tab': id, 'aria-selected': String(id === state.active), tabindex: id === state.active ? '0' : '-1' }, `${id}.md`),
      el('button', { class: 'tab-close', type: 'button', 'data-close': id, 'aria-label': `Close ${id}` }, '×'))),
    el('div', { class: 'pane-tab matrix' + (state.active === 'matrix' ? ' active' : '') },
      el('button', { class: 'tab-open', type: 'button', role: 'tab', 'data-tab': 'matrix', 'aria-selected': String(state.active === 'matrix'), tabindex: state.active === 'matrix' ? '0' : '-1' }, '⊞ matrix')));
}

function agentOptions() {
  return lib.skillAgents(DATA.agents).map(a => el('option', { value: a.id, selected: a.id === state.installAgent }, a.name));
}

function renderSkillPane(skill) {
  const group = DATA.groups.find(g => g.id === skill.group) || {};
  const fav = favorites.has(skill.id);
  const command = lib.installSkillCommand(agentById[state.installAgent], skill);
  $('#pane').replaceChildren(
    el('button', { class: 'pane-back', type: 'button', 'data-action': 'back' }, '← explorer'),
    el('p', { class: 'comment' }, `// ${skill.category} · ${group.id || skill.group} · v${skill.version}`),
    el('h3', { class: 'pane-title' }, el('span', { class: 'pane-icon', 'aria-hidden': 'true' }, skill.icon || '#'), skill.id),
    el('p', { class: 'pane-desc' }, skill.desc),
    el('p', { class: 'pane-avail' }, lib.availabilityText(skill, DATA.groups, DATA.agents)),
    el('ul', { class: 'agent-tags', 'aria-label': 'Agent support' }, DATA.agents.map(a => {
      const ok = lib.supportsSkill(a);
      return el('li', { class: 'agent-tag' + (ok ? ' supported' : ''), title: ok ? `${a.name}: installed with ${lib.agentLocation(a)}` : `${a.name}: rules only, no skills` },
        a.id, !ok && el('span', { class: 'visually-hidden' }, ' (not supported)'));
    })),
    el('div', { class: 'install-box' },
      el('label', { class: 'install-label', for: 'installAgent' }, 'install for'),
      el('select', { id: 'installAgent', class: 'install-agent' }, agentOptions()),
      el('code', { id: 'installCommand', class: 'install-command' }, command),
      el('button', { class: 'btn-copy', type: 'button', 'data-action': 'copy-command' }, '⧉ copy')),
    el('div', { class: 'pane-actions' },
      el('button', { class: 'btn', type: 'button', 'data-action': 'open-doc' }, 'open full SKILL.md →'),
      el('a', { class: 'btn', href: `https://github.com/${DATA.repo}/blob/${DATA.ref}/skills/${encodeURIComponent(skill.id)}/SKILL.md`, target: '_blank', rel: 'noopener' }, 'source on GitHub ↗'),
      el('button', { class: 'btn btn-fav', type: 'button', 'data-action': 'favourite', 'aria-pressed': String(fav) }, fav ? '★ favourited' : '☆ favourite')));
}

function renderMatrix() {
  const agents = DATA.agents;
  const cell = (skill, agent) => el('td', {}, lib.supportsSkill(agent)
    ? el('span', { class: 'node', title: `${skill.id} · ${agent.name}` }, el('span', { class: 'visually-hidden' }, 'yes'))
    : el('span', { class: 'node off', title: `${agent.name}: rules only` }, el('span', { class: 'visually-hidden' }, 'no')));
  const head = el('tr', {},
    el('th', { scope: 'col', class: 'm-skill' }, 'skill'),
    agents.map(a => el('th', { scope: 'col' }, el('span', {}, a.id))));
  const rows = DATA.skills.map(s => el('tr', {},
    el('th', { scope: 'row', class: 'm-skill' }, el('button', { type: 'button', class: 'm-open', 'data-skill': s.id }, s.id)),
    agents.map(a => cell(s, a))));
  const table = el('table', { class: 'matrix' }, el('thead', {}, head), el('tbody', {}, rows));
  $('#pane').replaceChildren(
    el('p', { class: 'comment' }, `// ${DATA.skills.length} skills × ${agents.length} agents · ● installed · ○ rules only`),
    el('div', { class: 'matrix-scroll', tabindex: '0', role: 'region', 'aria-label': 'Skill by agent matrix' }, table));
}

function activate(id) {
  state.active = id;
  renderTabs();
  if (id === 'matrix') renderMatrix(); else renderSkillPane(skillById[id]);
  markActiveFile();
}

function openSkill(id, { push = true, view = false } = {}) {
  if (!skillById[id]) return false;
  if (!state.openTabs.includes(id)) {
    state.openTabs.push(id);
    while (state.openTabs.length > MAX_TABS) state.openTabs.splice(state.openTabs.findIndex(t => t !== id), 1);
  }
  activate(id);
  if (push && location.hash !== '#skill/' + id) history.pushState(null, '', '#skill/' + id);
  if (view && PHONE.matches) {
    const explorer = $('.explorer');
    if (!explorer.classList.contains('viewing')) viewOpener = document.activeElement;
    explorer.classList.add('viewing');
    $('#pane [data-action="back"]').focus(); // the pane covers the page on phones: move focus into it
  }
  return true;
}

function closeTab(id) {
  state.openTabs = state.openTabs.filter(t => t !== id);
  if (state.active === id) activate(state.openTabs.at(-1) || 'matrix'); else renderTabs();
}

let viewOpener = null;
/** Closes the phone pane and returns focus to the tree item that opened it. */
function closeViewing() {
  const explorer = $('.explorer');
  if (!explorer.classList.contains('viewing')) return;
  explorer.classList.remove('viewing');
  const opener = viewOpener;
  viewOpener = null;
  if (opener && opener.isConnected && opener.offsetParent) opener.focus();
}

function leaveViewing() {
  closeViewing();
  if (lib.parseHash(location.hash)) history.replaceState(null, '', location.pathname + location.search);
}

function applySearch(query, { mirror = true } = {}) {
  state.query = query;
  const skills = new Set(lib.filterSkills(DATA.skills, query).map(s => s.id));
  $$('#tree button.file').forEach(b => { b.hidden = !skills.has(b.dataset.skill); });
  $$('#tree .folder').forEach(f => { f.hidden = Boolean(query.trim()) && !f.querySelector('button.file:not([hidden])'); });
  $('#tree').classList.toggle('searching', Boolean(query.trim())); // matches show even inside collapsed folders
  const agents = new Set(lib.filterAgents(DATA.agents, query).map(a => a.id));
  $$('#agentGrid .agent-card').forEach(c => { c.hidden = !agents.has(c.dataset.agent); });
  if (mirror) {
    for (const input of [$('#search'), $('#treeSearch')]) if (input && input.value !== query) input.value = query;
  }
}

const actions = {
  'copy-command': () => copyText($('#installCommand').textContent, 'Copied install command'),
  favourite: () => {
    const id = state.active;
    if (!skillById[id]) return;
    const on = favorites.toggle(id);
    renderTree();
    renderSkillPane(skillById[id]);
    showToast(on ? `Pinned ${id} to favourites` : `Removed ${id} from favourites`);
    $('#pane [data-action="favourite"]').focus();
  },
  back: () => leaveViewing(),
  'open-doc': button => openSheet('skill-doc', state.active, button),
};

function setupExplorer() {
  renderExplorerShell();
  renderTree();
  $('#tree').addEventListener('click', e => {
    const file = e.target.closest('button.file');
    if (file) openSkill(file.dataset.skill, { view: true });
  });
  $('#paneTabs').addEventListener('click', e => {
    const close = e.target.closest('[data-close]');
    if (close) { closeTab(close.dataset.close); return; }
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    if (tab.dataset.tab === 'matrix') activate('matrix'); else openSkill(tab.dataset.tab);
  });
  $('#paneTabs').addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const tabs = $$('#paneTabs [role="tab"]');
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next.click();
    $(`#paneTabs [data-tab="${next.dataset.tab}"]`).focus();
  });
  $('#pane').addEventListener('click', e => {
    const open = e.target.closest('button.m-open');
    if (open) { openSkill(open.dataset.skill, { view: true }); return; }
    const action = e.target.closest('[data-action]');
    if (action && actions[action.dataset.action]) actions[action.dataset.action](action);
  });
  $('#pane').addEventListener('change', e => {
    if (e.target.id !== 'installAgent') return;
    state.installAgent = e.target.value;
    sessionSet('cc-install-agent', state.installAgent);
    $('#installCommand').textContent = lib.installSkillCommand(agentById[state.installAgent], skillById[state.active]);
  });
  for (const input of [$('#search'), $('#treeSearch')]) {
    input.addEventListener('input', () => applySearch(input.value));
  }
  $('#search').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('explorer').scrollIntoView({ block: 'start' });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#sheet').hidden && $('.explorer').classList.contains('viewing')) leaveViewing();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t instanceof Element && (t.closest('input, textarea, select') || t.isContentEditable)) return;
    e.preventDefault();
    if (getComputedStyle($('#searchToggle')).display !== 'none') openSearchBox(true);
    $('#search').focus();
  });
}


// ===== Sheets: full SKILL.md and agent details =====
let docsPromise = null;
function loadDocs() {
  if (window.CC_DOCS) return Promise.resolve(window.CC_DOCS);
  if (!docsPromise) {
    docsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = TEST && params.has('nodocs') ? 'docs-missing.js' : 'docs.js';
      script.async = true;
      script.onload = () => (window.CC_DOCS ? resolve(window.CC_DOCS) : reject(new Error('docs.js has no data')));
      script.onerror = () => { docsPromise = null; script.remove(); reject(new Error('Could not load docs.js')); };
      document.head.append(script);
    });
  }
  return docsPromise;
}

const sheetState = { kind: null, id: null, opener: null };
const BACKGROUND = ['header.titlebar', '#drawer', 'main', 'footer'];

function setBackgroundInert(on) {
  BACKGROUND.forEach(sel => { const node = $(sel); if (node) node.inert = on; });
  document.body.classList.toggle('sheet-open', on);
}

function sheetHeader(title) {
  return el('div', { class: 'sheet-head' },
    el('h2', { id: 'sheetTitle', class: 'sheet-title' }, title),
    el('button', { class: 'sheet-close', type: 'button', 'data-action': 'close-sheet', 'aria-label': 'Close' }, '✕'));
}

async function renderSkillDoc(skill) {
  const sheet = $('#sheet');
  const body = el('div', { class: 'sheet-body' }, el('p', { class: 'comment' }, '// loading SKILL.md…'));
  sheet.replaceChildren(el('div', { class: 'sheet-card' }, sheetHeader(`${skill.id} · SKILL.md`), body));
  try {
    const docs = await loadDocs();
    if (sheetState.id !== skill.id) return;
    const md = el('div', { class: 'md' });
    md.innerHTML = lib.renderMarkdown(docs[skill.id] || ''); // renderMarkdown escapes all skill text
    body.replaceChildren(
      el('div', { class: 'sheet-actions' },
        el('button', { class: 'btn', type: 'button', 'data-action': 'copy-doc' }, '⧉ copy SKILL.md'),
        el('a', { class: 'btn', href: `https://github.com/${DATA.repo}/blob/${DATA.ref}/skills/${encodeURIComponent(skill.id)}/SKILL.md`, target: '_blank', rel: 'noopener' }, 'source on GitHub ↗')),
      md);
  } catch {
    body.replaceChildren(
      el('p', { class: 'sheet-error' }, 'Could not load the skill text. Check your connection and try again.'),
      el('button', { class: 'btn', type: 'button', 'data-action': 'retry' }, '↻ retry'));
  }
}

function renderAgentSheet(agent) {
  const status = lib.statusInfo(agent);
  const rows = [
    ['skills', agent.skillsDir ? `~/${agent.skillsDir}/` : 'none (rules only)'],
    ['rules', `~/${agent.rulesDir}/`],
    ['instructions', agent.instructions],
  ];
  $('#sheet').replaceChildren(el('div', { class: 'sheet-card' },
    sheetHeader(agent.name),
    el('div', { class: 'sheet-body' },
      el('p', { class: 'agent-status' }, el('span', { class: 'led', 'data-tone': status.tone, 'aria-hidden': 'true' }), status.label, ' · ', agent.statusText),
      el('dl', { class: 'agent-facts' }, rows.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, el('code', {}, v))])),
      el('div', { class: 'install-box agent-setup' },
        el('span', { class: 'install-label' }, 'setup'),
        el('code', { id: 'agentCommand', class: 'install-command' }, lib.setupCommand(agent)),
        el('button', { class: 'btn-copy', type: 'button', 'data-action': 'copy-agent' }, '⧉ copy')),
      agent.notes && agent.notes.length ? el('ul', { class: 'agent-notes' }, agent.notes.map(n => el('li', {}, n))) : null)));
}

function openSheet(kind, id, opener = null) {
  const item = kind === 'agent' ? agentById[id] : skillById[id];
  if (!item) return false;
  sheetState.kind = kind;
  sheetState.id = id;
  if ($('#sheet').hidden) sheetState.opener = opener || document.activeElement; // keep the first opener when switching sheets
  const sheet = $('#sheet');
  sheet.hidden = false;
  setBackgroundInert(true);
  if (kind === 'agent') {
    renderAgentSheet(item);
    if (location.hash !== '#agent/' + id) history.pushState(null, '', '#agent/' + id);
  } else {
    renderSkillDoc(item);
  }
  $('#sheet [data-action="close-sheet"]').focus();
  return true;
}

function closeSheet() {
  const sheet = $('#sheet');
  if (sheet.hidden) return;
  const wasAgent = sheetState.kind === 'agent';
  sheet.hidden = true;
  sheet.replaceChildren();
  setBackgroundInert(false);
  sheetState.kind = sheetState.id = null;
  if (wasAgent && location.hash.startsWith('#agent/')) history.replaceState(null, '', location.pathname + location.search);
  const opener = sheetState.opener;
  sheetState.opener = null;
  if (opener && opener.isConnected) opener.focus();
}

function setupSheet() {
  const sheet = $('#sheet');
  sheet.addEventListener('click', e => {
    if (e.target === sheet) { closeSheet(); return; }
    const action = e.target.closest('[data-action]');
    if (!action) return;
    const name = action.dataset.action;
    if (name === 'close-sheet') closeSheet();
    else if (name === 'retry') renderSkillDoc(skillById[sheetState.id]);
    else if (name === 'copy-doc') copyText((window.CC_DOCS || {})[sheetState.id] || '', 'Copied SKILL.md');
    else if (name === 'copy-agent') copyText($('#agentCommand').textContent, 'Copied setup command');
  });
  document.addEventListener('keydown', e => {
    if (sheet.hidden) return;
    if (e.key === 'Escape') { e.stopImmediatePropagation(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    const items = [...sheet.querySelectorAll('button, a[href], select, input, [tabindex]:not([tabindex="-1"])')].filter(n => !n.disabled);
    if (!items.length) return;
    const first = items[0];
    const last = items.at(-1);
    if (!sheet.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, true);
}


// ===== Sections: hero, agents, install, rules, repo =====
const REPO_URL = `https://github.com/${DATA.repo}`;
const CLONE = `git clone ${REPO_URL}.git ~/cybercore-agent-skills`;

function renderHero() {
  const counts = lib.stats(DATA);
  const claude = agentById.claude;
  $('#heroBody').append(
    el('div', { class: 'hero-terminal', id: 'heroTerminal', 'aria-label': 'Example setup run' },
      el('div', { class: 'term-bar', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'), el('span', {}, 'zsh')),
      el('pre', { class: 'term-lines' },
        el('span', { class: 'term-line', 'data-type': '' }, el('span', { class: 'prompt' }, '$ '), claude ? `./${claude.script}` : './setup.sh'),
        '\n',
        el('span', { class: 'term-line ok', 'data-type': '' }, `✓ ${counts.skills} skills · ${counts.rules} rules`))),
    el('dl', { id: 'heroStats', class: 'hero-stats' },
      [['skills', counts.skills], ['agents', counts.agents], ['rules', counts.rules], ['opt-in', counts.optIn]].map(([label, value]) =>
        el('div', { class: 'stat' }, el('dt', {}, label), el('dd', { 'data-stat': label }, String(value))))));
}

function renderAgents() {
  $('#agentsBody').replaceChildren(el('div', { id: 'agentGrid', class: 'agent-grid' }, DATA.agents.map(agent => {
    const status = lib.statusInfo(agent);
    return el('button', { class: 'agent-card', type: 'button', 'data-agent': agent.id, 'aria-label': `${agent.name}, ${status.label}. Show details` },
      el('span', { class: 'agent-top' },
        el('span', { class: 'agent-badge', 'aria-hidden': 'true' }, agent.icon || agent.badge),
        el('span', { class: 'agent-name' }, agent.name),
        el('span', { class: 'led', 'data-tone': status.tone, 'aria-hidden': 'true' })),
      el('span', { class: 'agent-path' }, agent.skillsDir ? `~/${agent.skillsDir}/` : `~/${agent.rulesDir}/`),
      el('span', { class: 'agent-state', 'data-tone': status.tone }, status.label));
  })));
  $('#agentGrid').addEventListener('click', e => {
    const card = e.target.closest('.agent-card');
    if (card) openSheet('agent', card.dataset.agent, card);
  });
  applySearch(state.query, { mirror: false });
}

const installers = DATA.agents.filter(a => a.script);
let installAgentId = installers.some(a => a.id === 'claude') ? 'claude' : (installers[0] || {}).id;

function installLines() {
  const agent = agentById[installAgentId];
  return [`${CLONE}`, `cd ~/cybercore-agent-skills`, agent ? lib.setupCommand(agent) : ''];
}

function renderInstallTerminal() {
  $('#installTerminal').replaceChildren(...installLines().flatMap((line, i) => [
    ...(i ? ['\n'] : []),
    el('span', { class: 'term-line', 'data-type': '' }, el('span', { class: 'prompt' }, '$ '), line)]));
  $$('#installTabs [data-agent]').forEach(t => {
    const on = t.dataset.agent === installAgentId;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
}

function renderInstall() {
  $('#installBody').replaceChildren(
    el('p', { class: 'section-note' }, 'Clone once, then run your agent\'s installer. It installs into your home directory, so the rules and skills apply in every project.'),
    el('div', { class: 'terminal' },
      el('div', { id: 'installTabs', class: 'term-tabs', role: 'tablist', 'aria-label': 'Installer per agent' },
        installers.map(a => el('button', { type: 'button', role: 'tab', class: 'term-tab', 'data-agent': a.id, 'aria-controls': 'installTerminal' }, a.id))),
      el('pre', { id: 'installTerminal', class: 'term-lines', role: 'tabpanel', tabindex: '0' }),
      el('button', { class: 'btn-copy term-copy', type: 'button', 'data-action': 'copy-install' }, '⧉ copy')),
    el('p', { class: 'section-note dim' }, 'Cloned somewhere else? Replace ~/cybercore-agent-skills with your clone.'));
  renderInstallTerminal();
  $('#installTabs').addEventListener('click', e => {
    const tab = e.target.closest('[data-agent]');
    if (!tab) return;
    installAgentId = tab.dataset.agent;
    renderInstallTerminal();
  });
  tabArrows($('#installTabs'));
  $('#installBody [data-action="copy-install"]').addEventListener('click', () => copyText(installLines().join('\n'), 'Copied install commands'));
}

let activeRule = (DATA.rules[0] || {}).id;
function renderRuleBody() {
  const rule = DATA.rules.find(r => r.id === activeRule);
  const body = $('#ruleBody');
  body.innerHTML = rule ? lib.renderMarkdown(rule.body) : ''; // renderMarkdown escapes all rule text
  $$('#ruleTabs [data-rule]').forEach(t => {
    const on = t.dataset.rule === activeRule;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
}

function renderRules() {
  $('#rulesBody').replaceChildren(
    el('p', { class: 'section-note' }, 'Shared guardrails every installer writes into the agent\'s rules folder.'),
    el('div', { class: 'rule-window' },
      el('div', { id: 'ruleTabs', class: 'term-tabs', role: 'tablist', 'aria-label': 'Rule files' },
        DATA.rules.map(r => el('button', { type: 'button', role: 'tab', class: 'term-tab', 'data-rule': r.id, 'aria-controls': 'ruleBody' }, r.file || `${r.id}.md`))),
      el('div', { id: 'ruleBody', class: 'rule-body md', role: 'tabpanel', tabindex: '0' })));
  renderRuleBody();
  $('#ruleTabs').addEventListener('click', e => {
    const tab = e.target.closest('[data-rule]');
    if (!tab) return;
    activeRule = tab.dataset.rule;
    renderRuleBody();
  });
  tabArrows($('#ruleTabs'));
}

/** Left/right arrows move between tabs in a tablist (and activate them). */
function tabArrows(list) {
  list.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const tabs = $$('[role="tab"]', list);
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next.click();
    next.focus();
  });
}

function renderRepo() {
  const counts = lib.stats(DATA);
  const links = [
    ['a1f0c3e', 'repository', REPO_URL],
    ['7be21d4', 'README', `${REPO_URL}#readme`],
    ['3c9e8f2', 'setup guide (SETUP.md)', `${REPO_URL}/blob/${DATA.ref}/SETUP.md`],
    ['e45d0a7', 'MIT licence', `${REPO_URL}/blob/${DATA.ref}/LICENSE`],
    ['0d6b9c1', 'issues', `${REPO_URL}/issues`],
  ];
  $('#repoBody').replaceChildren(
    el('ol', { class: 'git-log' }, links.map(([hash, label, href]) => el('li', {},
      el('span', { class: 'log-hash', 'aria-hidden': 'true' }, hash),
      el('span', { class: 'log-ref', 'aria-hidden': 'true' }, '(HEAD → main)'),
      el('a', { href, target: '_blank', rel: 'noopener' }, label, el('span', { class: 'visually-hidden' }, ' (opens in a new tab)'))))),
    el('div', { id: 'statusStrip', class: 'status-strip' },
      el('span', { 'data-status': 'branch' }, `⎇ ${DATA.ref}`),
      el('span', {}, `${counts.skills} skills`),
      el('span', {}, `${counts.agents} agents`),
      el('span', {}, `${counts.rules} rules`),
      el('span', { class: 'status-theme' }, 'theme ', el('span', { 'data-status': 'theme' }, 'CyberCore Tech'))));
  document.addEventListener('cc:theme', e => {
    const { id, label } = e.detail || {};
    if (id || label) $('#statusStrip [data-status="theme"]').textContent = label || id;
  });
}


// ===== Theme: map the org chooser palette onto the page tokens =====
const PALETTE_TOKENS = {
  acid_green: '--cc-neon-green', hot_pink: '--cc-neon-pink', cyan: '--cc-neon-cyan', purple: '--cc-neon-purple',
  bg: '--cc-bg', panel: '--cc-card', line: '--cc-border', muted: '--cc-fg-muted', white: '--cc-fg',
};
function setupTheme() {
  document.addEventListener('cc:theme', e => {
    const { id, palette } = e.detail || {};
    if (!id) return;
    const root = document.documentElement;
    root.dataset.theme = id;
    for (const [key, token] of Object.entries(PALETTE_TOKENS)) {
      if (palette && /^[0-9a-f]{3,8}$/i.test(palette[key] || '')) root.style.setProperty(token, `#${palette[key]}`);
    }
    if (palette && /^[0-9a-f]{3,8}$/i.test(palette.panel || '')) root.style.setProperty('--cc-bg-secondary', `#${palette.panel}`);
  });
}

// ===== Routing =====
function route() {
  const target = lib.parseHash(location.hash);
  if (!target) { closeSheet(); closeViewing(); return; }
  if (target.type === 'skill') {
    if (sheetState.kind === 'agent') closeSheet();
    if (!openSkill(target.id, { push: false, view: true })) showToast(`No skill named ${target.id}`);
  } else if (target.type === 'agent') {
    if (!openSheet('agent', target.id)) showToast(`No agent named ${target.id}`);
  }
}

function startRoute() {
  const first = lib.firstSkillId(DATA.skills, location.hash);
  const target = lib.parseHash(location.hash);
  openSkill(first.id, { push: false, view: Boolean(target && target.type === 'skill' && !first.missing) });
  if (first.missing) {
    showToast(`No skill named ${first.missing}`);
    history.replaceState(null, '', location.pathname + location.search);
  }
  if (target && target.type === 'agent' && !openSheet('agent', target.id)) {
    showToast(`No agent named ${target.id}`);
    history.replaceState(null, '', location.pathname + location.search);
  }
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);
}

function init() {
  renderGutter();
  renderHero();
  setupTitlebar();
  setupExplorer();
  renderAgents();
  renderInstall();
  renderRules();
  renderRepo();
  setupTheme();
  setupSheet();
  startRoute();
  requestAnimationFrame(() => startEffects(document));
  if (TEST) {
    window.applySearchForTest = applySearch;
    window.__cc = { lib, DATA, showToast, openDrawer, openSkill, openSheet, closeSheet };
  }
}

init();
