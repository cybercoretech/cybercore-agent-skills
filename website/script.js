// CyberCore Agent Skills Explorer: page entry (ES module).
// Renders the page from window.CC_DATA (data.js) using the pure helpers in
// lib.js. docs.js (full SKILL.md text) loads only when a skill's text is opened.
import * as lib from './lib.js';

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
    const toggle = el('button', { class: 'folder-toggle', type: 'button', 'aria-expanded': 'true' },
      el('span', { class: 'caret', 'aria-hidden': 'true' }, '▾'),
      el('span', { class: 'folder-name' }, folder.id === 'favourites' ? '★ favourites/' : `${folder.id}/`),
      el('span', { class: 'count' }, String(folder.skills.length)),
      folder.optIn && el('span', { class: 'opt-in' }, 'opt-in'));
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      files.hidden = !open;
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
  if (view && PHONE.matches) $('.explorer').classList.add('viewing');
  return true;
}

function closeTab(id) {
  state.openTabs = state.openTabs.filter(t => t !== id);
  if (state.active === id) activate(state.openTabs.at(-1) || 'matrix'); else renderTabs();
}

function leaveViewing() {
  $('.explorer').classList.remove('viewing');
  if (lib.parseHash(location.hash)) history.replaceState(null, '', location.pathname + location.search);
}

function applySearch(query, { mirror = true } = {}) {
  state.query = query;
  const skills = new Set(lib.filterSkills(DATA.skills, query).map(s => s.id));
  $$('#tree button.file').forEach(b => { b.hidden = !skills.has(b.dataset.skill); });
  $$('#tree .folder').forEach(f => { f.hidden = Boolean(query.trim()) && !f.querySelector('button.file:not([hidden])'); });
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
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t instanceof Element && (t.closest('input, textarea, select') || t.isContentEditable)) return;
    e.preventDefault();
    if (getComputedStyle($('#searchToggle')).display !== 'none') openSearchBox(true);
    $('#search').focus();
  });
}

// ===== Routing =====
function route() {
  const target = lib.parseHash(location.hash);
  if (!target) { if (PHONE.matches) $('.explorer').classList.remove('viewing'); return; }
  if (target.type === 'skill') {
    if (!openSkill(target.id, { push: false, view: true })) showToast(`No skill named ${target.id}`);
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
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);
}

function init() {
  renderGutter();
  setupTitlebar();
  setupExplorer();
  startRoute();
  if (TEST) {
    window.applySearchForTest = applySearch;
    window.__cc = { lib, DATA, showToast, openDrawer, openSkill };
  }
}

init();
