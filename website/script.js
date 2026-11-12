/* app.js */
/* ===== Cybercore Agent Skills — App Logic =====
   All skill and agent data comes from data.js, which scripts/build_site_data.py
   generates from manifest.yaml and the canonical skills/ folder. */

const DATA = window.CC_DATA || { repo: '', ref: 'main', groups: [], skills: [], agents: [] };
const skills = DATA.skills;
const agents = DATA.agents;
const groups = DATA.groups;
const groupById = Object.fromEntries(groups.map(g => [g.id, g]));

// 'default' = installed by the agent's installer, 'pack' = opt-in via --with <pack>, '' = unavailable.
const skillMatrix = {};
skills.forEach(s => {
  skillMatrix[s.id] = {};
  const group = groupById[s.group] || {};
  agents.forEach(a => {
    skillMatrix[s.id][a.id] = !a.skillsDir ? '' : (group.default ? 'default' : 'pack');
  });
});

const defaultSkillCount = skills.filter(s => (groupById[s.group] || {}).default).length;
const skillAgents = agents.filter(a => a.skillsDir);

function setupCommand(agent) {
  return 'bash ~/cybercore-agent-skills/' + agent.id + '/agent-project-setup/' + agent.script;
}

function agentLocation(agent) {
  return agent.skillsDir ? '~/' + agent.skillsDir + '/' : '~/' + agent.rulesDir + '/ (rules only)';
}

const STATUS = {
  'verified': { label: 'Verified', cls: 'status-ok', flag: '' },
  'needs-setup': { label: 'Setup needed', cls: 'status-warn', flag: '⚙' },
  'unverified': { label: 'Unverified', cls: 'status-warn', flag: '?' },
  'rules-only': { label: 'Rules only', cls: 'status-muted', flag: '–' }
};

function statusInfo(agent) {
  return STATUS[agent.status] || { label: agent.status, cls: 'status-muted', flag: '' };
}

function statusChip(agent) {
  const info = statusInfo(agent);
  return '<span class="status-chip ' + info.cls + '">' + escapeHtml(info.label) + '</span>';
}

function skillCountText(agent) {
  if (!agent.skillsDir) return 'Rules only';
  const optional = skills.length - defaultSkillCount;
  return defaultSkillCount + ' skills' + (optional ? ' + ' + optional + ' opt-in' : '');
}

function copyToClipboard(text, message) {
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    showToast('Clipboard is not available here. Copy the text manually.');
    return Promise.resolve(false);
  }
  return navigator.clipboard.writeText(text)
    .then(() => { showToast(message || 'Copied to clipboard'); return true; })
    .catch(() => { showToast('Clipboard access failed. Check browser permissions.'); return false; });
}

// Skill documentation lives in docs.js and is loaded on first need
// (opening a skill, searching, or copying its documentation).
let docsPromise = null;
function loadDocs() {
  if (window.CC_DOCS) return Promise.resolve(window.CC_DOCS);
  if (!docsPromise) {
    docsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'docs.js';
      script.async = true;
      script.onload = () => (window.CC_DOCS ? resolve(window.CC_DOCS) : reject(new Error('docs.js has no data')));
      script.onerror = () => { docsPromise = null; script.remove(); reject(new Error('Could not load docs.js')); };
      document.head.appendChild(script);
    });
  }
  return docsPromise;
}

function skillDoc(id) {
  return (window.CC_DOCS && window.CC_DOCS[id]) || '';
}

function skillSourceUrl(skill) {
  return 'https://github.com/' + DATA.repo + '/blob/' + DATA.ref + '/skills/' + encodeURIComponent(skill.id) + '/SKILL.md';
}

function readFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem('cc-favs') || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    return new Set();
  }
}

let activeFilter = 'all';
let favorites = readFavorites();
let searchQuery = '';
let activeDetail = null;

// ----- Modal focus management: background goes inert, Tab stays inside, focus returns on close.
const modalStack = [];

function focusableIn(container) {
  return [...container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(el => el.getClientRects().length > 0);
}

function openModal(el, initialFocus) {
  if (modalStack.some(m => m.el === el)) return;
  const entry = { el, returnFocus: document.activeElement, inerted: [] };
  [...document.body.children].forEach(child => {
    if (child !== el && !child.contains(el) && child.tagName !== 'SCRIPT' && !child.inert) {
      child.inert = true;
      entry.inerted.push(child);
    }
  });
  modalStack.push(entry);
  const target = initialFocus || focusableIn(el)[0] || el;
  if (target) target.focus();
}

function closeModal(el) {
  const index = modalStack.findIndex(m => m.el === el);
  if (index < 0) return;
  const [entry] = modalStack.splice(index, 1);
  entry.inerted.forEach(child => { child.inert = false; });
  if (entry.returnFocus && document.contains(entry.returnFocus) && typeof entry.returnFocus.focus === 'function') {
    entry.returnFocus.focus();
  }
}

document.addEventListener('keydown', event => {
  const top = modalStack[modalStack.length - 1];
  if (!top || event.key !== 'Tab') return;
  const items = focusableIn(top.el);
  if (!items.length) { event.preventDefault(); return; }
  const first = items[0], last = items[items.length - 1];
  if (event.shiftKey && (document.activeElement === first || !top.el.contains(document.activeElement))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !top.el.contains(document.activeElement))) {
    event.preventDefault(); first.focus();
  }
});

// ----- Minimal Markdown renderer for SKILL.md bodies. Everything is escaped first,
// so skill text can never inject markup. Supports headings, paragraphs, nested
// lists, fenced code, tables, rules, bold, italic, and inline code.
function renderInline(text) {
  const codes = [];
  let out = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => { codes.push(code); return '\u0000' + (codes.length - 1) + '\u0000'; });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,:;!?]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\s][^_]*)_(?=[\s).,:;!?]|$)/g, '$1<em>$2</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + codes[Number(i)] + '</code>');
}

function renderMarkdown(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  const listStack = [];
  const flushParagraph = () => { if (paragraph.length) { html.push('<p>' + renderInline(paragraph.join(' ')) + '</p>'); paragraph = []; } };
  const closeLists = (depth = 0) => {
    while (listStack.length > depth) { html.push('</li></' + listStack.pop().type + '>'); }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
    if (fence) {
      flushParagraph(); closeLists();
      const body = [];
      while (++i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i]);
      html.push('<pre class="md-code"><code>' + escapeHtml(body.join('\n')) + '</code></pre>');
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      flushParagraph(); closeLists();
      const cells = row => row.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(line);
      i++;
      const rows = [];
      while (i + 1 < lines.length && /^\s*\|.*\|\s*$/.test(lines[i + 1])) rows.push(cells(lines[++i]));
      html.push('<div class="md-table"><table><thead><tr>' + head.map(c => '<th>' + renderInline(c) + '</th>').join('') +
        '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + renderInline(c) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph(); closeLists();
      const level = Math.min(heading[1].length + 2, 6); // page owns h1/h2; skill headings start at h3
      html.push('<h' + level + '>' + renderInline(heading[2]) + '</h' + level + '>');
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flushParagraph(); closeLists(); html.push('<hr>'); continue; }
    const item = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (item) {
      flushParagraph();
      const depth = Math.floor(item[1].replace(/\t/g, '  ').length / 2) + 1;
      const type = /\d/.test(item[2]) ? 'ol' : 'ul';
      if (depth > listStack.length) {
        while (listStack.length < depth) { html.push('<' + type + '><li>'); listStack.push({ type }); }
      } else {
        closeLists(depth);
        if (listStack[depth - 1].type !== type) { closeLists(depth - 1); html.push('<' + type + '><li>'); listStack.push({ type }); }
        else html.push('</li><li>');
      }
      html.push(renderInline(item[3]));
      continue;
    }
    if (!line.trim()) { flushParagraph(); closeLists(); continue; }
    if (listStack.length && /^\s+\S/.test(line)) { html.push(' ' + renderInline(line.trim())); continue; }
    closeLists();
    paragraph.push(line.trim());
  }
  flushParagraph(); closeLists();
  return html.join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMatrixHead() {
  const head = document.getElementById('matrixHead');
  if (!head) return;
  const actions = head.querySelector('.actions-cell');
  agents.forEach(agent => {
    const th = document.createElement('th');
    th.className = 'agent-col';
    th.dataset.agent = agent.id;
    const info = statusInfo(agent);
    th.innerHTML = '<span class="th-name">' + escapeHtml(agent.name) + '</span><span class="th-badge" aria-hidden="true">' + escapeHtml(agent.badge || agent.name.slice(0, 2)) + '</span>';
    if (info.flag) {
      th.title = agent.name + ': ' + info.label;
      th.insertAdjacentHTML('beforeend', '<span class="th-flag ' + info.cls + '" aria-hidden="true">' + info.flag + '</span><span class="sr-only"> (' + escapeHtml(info.label) + ')</span>');
    }
    head.insertBefore(th, actions);
  });
}

function renderFilters() {
  const wrap = document.getElementById('filterChips');
  if (!wrap) return;
  const favorites = wrap.querySelector('.favorites-filter');
  groups.forEach(group => {
    const btn = document.createElement('button');
    btn.className = 'chip filter-chip';
    btn.type = 'button';
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = group.title + (group.default ? '' : ' (opt-in)');
    btn.addEventListener('click', () => filterCategory(group.id, btn));
    wrap.insertBefore(btn, favorites);
  });
}

function init() {
  renderMatrixHead();
  renderFilters();
  renderMatrix();
  renderAgents();
  renderDeploy();
  renderRules();
  animateStats();
  setupSearch();
  setupDeepLink();
  window.addEventListener('hashchange', setupDeepLink);
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      const nav = document.getElementById('mobileNav');
      const button = document.getElementById('mobileMenuBtn');
      if (nav && nav.classList.contains('open')) {
        nav.classList.remove('open');
        if (button) button.setAttribute('aria-expanded', 'false');
      }
    }
  });
  document.addEventListener('cc:theme', e => {
    const { id, palette } = e.detail || {};
    if (id) {
      document.documentElement.dataset.theme = id;
      if (palette) {
        const root = document.documentElement;
        if (palette.acid_green) root.style.setProperty('--cc-neon-green', `#${palette.acid_green}`);
        if (palette.hot_pink) root.style.setProperty('--cc-neon-pink', `#${palette.hot_pink}`);
        if (palette.cyan) root.style.setProperty('--cc-neon-cyan', `#${palette.cyan}`);
        if (palette.purple) root.style.setProperty('--cc-neon-purple', `#${palette.purple}`);
        if (palette.bg) root.style.setProperty('--cc-bg', `#${palette.bg}`);
        if (palette.panel) root.style.setProperty('--cc-card', `#${palette.panel}`);
        if (palette.line) root.style.setProperty('--cc-border', `#${palette.line}`);
        if (palette.muted) root.style.setProperty('--cc-fg-muted', `#${palette.muted}`);
        if (palette.white) root.style.setProperty('--cc-fg', `#${palette.white}`);
      }
    }
  });
}

function animateStats() {
  const targets = {
    statAgents: agents.length,
    statSkills: skills.length,
    statDefault: defaultSkillCount,
    statOptional: skills.length - defaultSkillCount
  };
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Object.entries(targets).forEach(([id, target]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (reduceMotion) { el.textContent = target; return; }
    let current = 0;
    const steps = 20;
    const increment = target / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      current += increment;
      el.textContent = Math.floor(current);
      if (step >= steps) { el.textContent = target; el.classList.remove('animating'); clearInterval(interval); }
    }, 20);
  });
}

function renderMatrix() {
  const tbody = document.getElementById('matrixBody');
  tbody.innerHTML = '';
  let rendered = 0;
  skills.forEach(skill => {
    if (activeFilter !== 'all' && activeFilter !== 'favorites' && skill.group !== activeFilter) return;
    if (activeFilter === 'favorites' && !favorites.has(skill.id)) return;
    const haystack = `${skill.id} ${skill.name} ${skill.desc} ${skill.category} ${skillDoc(skill.id)}`.toLowerCase();
    if (searchQuery && !haystack.includes(searchQuery)) return;
    rendered++;
    const row = document.createElement('tr');
    row.dataset.id = skill.id;
    row.dataset.category = skill.category;
    row.className = 'skill-row';
    // Mouse convenience only; keyboard and screen-reader users use the skill name button.
    row.onclick = event => { if (!event.target.closest('button, a')) openDetail('skill', skill.id); };
    const isFavorite = favorites.has(skill.id);
    const skillHtml = '<div class="skill-cell"><span class="skill-icon">' + skill.icon + '</span><div class="skill-info"><button type="button" class="skill-name skill-link" onclick="openDetail(\'skill\', \'' + skill.id + '\')">' + escapeHtml(skill.name) + '</button><div class="skill-desc">' + escapeHtml(skill.desc) + '</div><div class="skill-cats"><span class="cat-chip">' + escapeHtml((groupById[skill.group] || {}).title || skill.group) + '</span><span class="cat-chip">' + escapeHtml(skill.category) + '</span></div></div><button class="favorite-btn ' + (isFavorite ? 'favorited' : '') + '" type="button" aria-label="' + (isFavorite ? 'Remove from' : 'Add to') + ' favorites" aria-pressed="' + isFavorite + '" onclick="event.stopPropagation(); toggleFavorite(\'' + skill.id + '\')">' + (isFavorite ? '★' : '☆') + '</button></div>';
    row.innerHTML = '<td>' + skillHtml + '</td>';
    agents.forEach(agent => {
      const td = document.createElement('td');
      td.className = 'status-cell';
      td.dataset.badge = agent.badge || agent.name.slice(0, 2);
      const state = skillMatrix[skill.id][agent.id];
      if (state === 'default') {
        td.className += ' is-installed';
        td.setAttribute('aria-label', agent.name + ': installed by default');
        td.innerHTML = '<span class="status-mark" aria-hidden="true">✓</span>';
      } else if (state === 'pack') {
        td.className += ' is-optional';
        td.setAttribute('aria-label', agent.name + ': optional pack, install with --with ' + (groupById[skill.group] || {}).pack);
        td.title = 'Optional: --with ' + (groupById[skill.group] || {}).pack;
        td.innerHTML = '<span class="status-mark" aria-hidden="true">+</span>';
      } else {
        td.textContent = '–';
        td.setAttribute('aria-label', agent.name + ': not available (rules only)');
      }
      row.appendChild(td);
    });
    const cmdCell = document.createElement('td');
    cmdCell.className = 'actions-cell';
    cmdCell.innerHTML = '<button class="copy-btn" aria-label="Choose an agent to install ' + escapeHtml(skill.name) + '" onclick="event.stopPropagation(); openInstallPicker(\'' + skill.id + '\')">Install</button>';
    row.appendChild(cmdCell);
    tbody.appendChild(row);
  });
  const status = document.getElementById('matrixStatus');
  if (status) status.textContent = rendered === skills.length ? 'Showing all ' + skills.length + ' skills.' : 'Showing ' + rendered + ' of ' + skills.length + ' skills.';
  const empty = document.getElementById('matrixEmpty');
  if (empty) empty.remove();
  if (rendered === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="' + (agents.length + 2) + '"><div class="empty-state"><h3>No skills match</h3><p>Try a different filter or clear the search.</p></div></td>';
    tbody.appendChild(tr);
  }
}

function filterCategory(category, btn) {
  activeFilter = category;
  document.querySelectorAll('.filter-chip').forEach(c => { c.classList.remove('chip--active'); c.setAttribute('aria-pressed', 'false'); });
  btn.classList.add('chip--active'); btn.setAttribute('aria-pressed', 'true'); renderMatrix();
}

function setupSearch() {
  const input = document.getElementById('skillSearch');
  const wrap = document.getElementById('searchWrap');
  input.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderMatrix(); renderAgents(); renderDeploy();
    // Search starts on names and descriptions, then widens to full documentation once loaded.
    if (searchQuery && !window.CC_DOCS) loadDocs().then(() => { if (searchQuery) renderMatrix(); }).catch(() => {});
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.matches('input, textarea, [contenteditable=true]')) { e.preventDefault(); wrap.classList.add('open'); input.focus(); }
    if (e.key === 'Escape') { if (document.getElementById('skillInstallPicker')) return; if (document.getElementById('detailPanel').classList.contains('open')) closeDetail(); else { input.value = ''; searchQuery = ''; renderMatrix(); renderAgents(); renderDeploy(); } }
  });
}

function setupDeepLink() {
  const hash = window.location.hash;
  if (activeDetail && hash === '#' + activeDetail.replace(':', '/')) return;
  if (hash.startsWith('#skill/')) { const skillId = hash.slice(7); openDetail('skill', skillId); }
  else if (hash.startsWith('#agent/')) { const agentId = hash.slice(7); openDetail('agent', agentId); }
  else if (hash === '') { closeDetail(); }
}

function openDetail(type, id) {
  if (type === 'skill') { const skill = skills.find(s => s.id === id); if (!skill) return; renderSkillDetail(skill); }
  else if (type === 'agent') { const agent = agents.find(a => a.id === id); if (!agent) return; renderAgentDetail(agent); }
  activeDetail = type + ':' + id;
  window.location.hash = type + '/' + id;
  const panel = document.getElementById('detailPanel');
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  panel.querySelector('.detail-main').scrollTop = 0;
  openModal(panel, panel.querySelector('.detail-close'));
}

function closeDetail() {
  const panel = document.getElementById('detailPanel'); if (!panel) return;
  const wasOpen = panel.classList.contains('open');
  panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); activeDetail = null;
  if (wasOpen) closeModal(panel);
  if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
}

function renderSkillDetail(skill) {
  document.getElementById('detailTitle').textContent = skill.name;
  const main = document.getElementById('detailMain');
  const sidebar = document.getElementById('detailSidebar');

  main.innerHTML = '<h3>Overview</h3><p>' + escapeHtml(skill.desc) +
    '</p><h3>Category</h3><p><span class="cat-chip">' +
    escapeHtml(skill.category) +
    '</span></p><h3>Availability</h3><p>' + escapeHtml(availabilityText(skill)) + '</p><h3>Full Documentation</h3><div class="md" id="skillDoc">' +
    (window.CC_DOCS ? renderSkillDoc(skill) : '<p class="doc-status">Loading documentation…</p>') + '</div>';

  sidebar.innerHTML =
    '<h4>Skill ID</h4><p>' + escapeHtml(skill.id) +
    '</p><h4>Category</h4><p>' + escapeHtml(skill.category) +
    '</p><h4>Group</h4><p>' + escapeHtml((groupById[skill.group] || {}).title || skill.group) +
    '</p><h4>Version</h4><p>' + escapeHtml(String(skill.version || '1')) + '</p><h4>Install This Skill</h4>' +
    '<button class="copy-btn" onclick="openInstallPicker(\'' + skill.id +
    '\')">Choose Agent &amp; Copy Install Command</button>' +
    '<button class="copy-btn" onclick="copySkillDoc(\'' + skill.id + '\')">Copy Full Documentation</button>' +
    '<a class="copy-btn sidebar-link" href="' + escapeHtml(skillSourceUrl(skill)) + '" target="_blank" rel="noopener">View on GitHub ↗</a>';

  if (!window.CC_DOCS) {
    loadDocs().then(() => {
      const target = document.getElementById('skillDoc');
      if (target && activeDetail === 'skill:' + skill.id) target.innerHTML = renderSkillDoc(skill);
    }).catch(() => {
      const target = document.getElementById('skillDoc');
      if (target && activeDetail === 'skill:' + skill.id) {
        target.innerHTML = '<p class="doc-status">Documentation could not be loaded. <a href="' + escapeHtml(skillSourceUrl(skill)) + '" target="_blank" rel="noopener">Read it on GitHub ↗</a></p>';
      }
    });
  }
}

function renderSkillDoc(skill) {
  return renderMarkdown(skillDoc(skill.id).replace(/^#\s+[^\n]*\n+/, ''));
}

function copySkillDoc(skillId) {
  loadDocs()
    .then(() => copyToClipboard(skillDoc(skillId), 'Copied documentation'))
    .catch(() => showToast('Documentation could not be loaded.'));
}

function renderAgentDetail(agent) {
  document.getElementById('detailTitle').textContent = agent.name;
  const main = document.getElementById('detailMain');
  const sidebar = document.getElementById('detailSidebar');
  const deployedSkills = skills.filter(s => skillMatrix[s.id][agent.id]);
  const notes = agent.notes.length ? '<h3>Setup Notes</h3><ul>' + agent.notes.map(n => '<li>' + escapeHtml(n) + '</li>').join('') + '</ul>' : '';
  main.innerHTML = '<h3>Overview</h3><p>' + statusChip(agent) + ' ' + escapeHtml(agent.statusText) + '</p>' + notes +
    '<h3>Installs</h3><p><code>~/' + escapeHtml(agent.instructions) + '</code>, <code>~/' + escapeHtml(agent.rulesDir) + '/</code>' +
    (agent.skillsDir ? ', <code>~/' + escapeHtml(agent.skillsDir) + '/</code>' : '') + '</p>' +
    '<h3>Setup Script</h3><p><code>' + escapeHtml(agent.script) + '</code></p>' +
    '<h3>Skills (' + escapeHtml(skillCountText(agent)) + ')</h3><div class="tag-list">' +
    deployedSkills.map(s => '<span class="skill-tag">' + escapeHtml(s.name) + (skillMatrix[s.id][agent.id] === 'pack' ? ' (opt-in)' : '') + '</span>').join('') + '</div>';
  sidebar.innerHTML = '<h4>Agent ID</h4><p>' + escapeHtml(agent.id) + '</p><h4>Skills Directory</h4><p>' + escapeHtml(agentLocation(agent)) +
    '</p><h4>Setup Script</h4><button class="copy-btn" onclick="copyAgentCommand(\'' + agent.id + '\')">Copy Setup Command</button>' +
    '<p class="sidebar-note">Run it from any directory; it installs into your home directory. If your clone is not at ~/cybercore-agent-skills, adjust the path.</p>';
}

function toggleFavorite(skillId) {
  if (favorites.has(skillId)) favorites.delete(skillId); else favorites.add(skillId);
  try { localStorage.setItem('cc-favs', JSON.stringify([...favorites])); } catch (error) { console.warn('Favorites could not be saved in this browser.', error); }
  showToast(favorites.has(skillId) ? 'Added to favorites' : 'Removed from favorites'); renderMatrix();
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toastText');
  if (text) text.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function openInstallPicker(skillId) {
  const skill = skills.find(item => item.id === skillId);
  if (!skill) {
    showToast('Could not find that skill');
    return;
  }

  const existing = document.getElementById('skillInstallPicker');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'skillInstallPicker';
  overlay.className = 'picker-overlay';
  overlay.setAttribute('role', 'presentation');

  const agentButtons = skillAgents.map(agent =>
    '<button type="button" class="picker-agent" data-agent-id="' + escapeHtml(agent.id) + '">' +
    '<span>' + escapeHtml(agent.name) + '</span>' +
    (agent.status === 'verified'
      ? '<span class="picker-copy">Copy ↗</span>'
      : statusChip(agent)) +
    '</button>'
  ).join('');

  overlay.innerHTML =
    '<section class="picker" role="dialog" aria-modal="true" aria-labelledby="skillPickerTitle">' +
    '<div class="picker-head">' +
    '<h3 id="skillPickerTitle" class="picker-title">Choose an agent</h3>' +
    '<button type="button" class="picker-close" data-picker-close aria-label="Close">×</button>' +
    '</div>' +
    '<p class="picker-intro">' +
    'Choose one agent. The command will install only <strong>' +
    escapeHtml(skill.name) + '</strong> for that agent.</p>' +
'<div class="picker-warning">' +
    '<strong>Installs to your home directory:</strong> the skill goes into ' +
    'the agent\'s skills folder under ~, so it is available in every ' +
    'project. You can run the command from any directory.' +
    '</div>' +
    '<div class="picker-grid">' +
    agentButtons +
    '</div>' +
    '<p class="picker-foot">' +
    'Existing copies of this skill are backed up before replacement.</p>' +
    '</section>';

  const onKeyDown = event => {
    if (event.key === 'Escape') closePicker();
  };
  function closePicker() {
    document.removeEventListener('keydown', onKeyDown);
    closeModal(overlay);
    overlay.remove();
  }

  overlay.addEventListener('click', event => {
    if (event.target === overlay || event.target.closest('[data-picker-close]')) {
      closePicker();
      return;
    }

    const choice = event.target.closest('[data-agent-id]');
    if (!choice) return;

    const agent = agents.find(item => item.id === choice.dataset.agentId);
    if (!agent) return;

    const command = buildSingleSkillInstallCommand(skill, agent);
    copyToClipboard(command, 'Copied ' + skill.name + ' install command for ' + agent.name).then(copied => {
      if (!copied || !agent.notes.length) { closePicker(); return; }
      // Agents that need a setup step (or are unverified) explain it before closing.
      const section = overlay.querySelector('section');
      section.innerHTML =
        '<h3 id="skillPickerTitle" class="picker-title picker-title--done">Copied for ' + escapeHtml(agent.name) + '</h3>' +
        '<p class="picker-status">' + statusChip(agent) + '</p>' +
        '<ul class="picker-notes">' +
        agent.notes.map(n => '<li>' + escapeHtml(n) + '</li>').join('') + '</ul>' +
        '<button type="button" class="btn btn--primary btn--block" data-picker-close>Done</button>';
      const done = section.querySelector('[data-picker-close]');
      if (done) done.focus();
    });
  });

  document.addEventListener('keydown', onKeyDown);
  document.body.appendChild(overlay);
  openModal(overlay, overlay.querySelector('[data-agent-id]'));
}

function buildSingleSkillInstallCommand(skill, agent) {
  const validId = value => /^[a-zA-Z0-9._-]+$/.test(String(value));
  const validPath = value => /^[a-zA-Z0-9._-]+(\/[a-zA-Z0-9._-]+)*$/.test(String(value)) && !String(value).split("/").includes("..");
  const files = skill.files && skill.files.length ? skill.files : ["SKILL.md"];
  if (!validId(skill.id) || !validId(agent.id) || !validPath(agent.skillsDir) || !validId(DATA.ref) || !files.every(validPath)) {
    throw new Error("Invalid skill, agent, or path.");
  }

  const shellQuote = value =>
    "'" + String(value).replace(/'/g, "'\\''") + "'";

  // Default skills live in the agent's skills dir; pack skills in packs/<pack>/.
  const group = groupById[skill.group] || {};
  const sourceDir = group.default ? agent.skillsDir : "packs/" + group.pack;
  if (!validPath(sourceDir)) {
    throw new Error("Invalid skill source path.");
  }
  const skillDir = agent.skillsDir + "/" + skill.id;
  const baseUrl =
    "https://raw.githubusercontent.com/" + DATA.repo + "/" + DATA.ref + "/" +
    agent.id + "/agent-project-setup/" + sourceDir + "/" + skill.id;
  const label = skill.id + " for " + agent.name.replace(/[\r\n'"\\$`%]/g, "");

  return [
    "__cybercore_install_skill() {",
    // Same target as the agent installers: the home directory, whatever the working directory is.
    '  target_dir="$HOME"',
    "  skill_rel=" + shellQuote(skillDir),
    '  skill_dir="$target_dir/$skill_rel"',
    "  base_url=" + shellQuote(baseUrl),
    // Same backup location as the agent installers.
    '  backup_root="${XDG_STATE_HOME:-$HOME/.local/state}/cybercore-agent-skills/backups/${target_dir##*/}-$(printf \'%s\' "$target_dir" | cksum | awk \'{print $1}\')/' + agent.id + '"',
    '  staging="$(mktemp -d "${TMPDIR:-/tmp}/cybercore-skill.XXXXXX")" || return 1',
    '  package="$staging/skill"',
    "  for file in " + files.map(shellQuote).join(" ") + "; do",
    '    mkdir -p "$package/$(dirname "$file")" || { rm -rf -- "$staging"; return 1; }',
    '    if ! curl -fsSL "$base_url/$file" -o "$package/$file"; then',
    '      echo "ERROR: Could not download $file. Nothing was changed."',
    '      rm -rf -- "$staging"',
    "      return 1",
    "    fi",
    "  done",
    '  if [ -d "$skill_dir" ]; then',
    '    backup_dir="$backup_root/$(date +%Y%m%d-%H%M%S)-$$/$skill_rel"',
    '    if ! { mkdir -p "$backup_dir" && cp -a "$skill_dir/." "$backup_dir/"; }; then',
    '      echo "ERROR: Could not back up $skill_dir. Nothing was changed."',
    '      rm -rf -- "$staging"',
    "      return 1",
    "    fi",
    '    printf "BACKUP: Existing skill saved to %s\\n" "$backup_dir"',
    "  fi",
    '  if ! { mkdir -p "$skill_dir" && cp -a "$package/." "$skill_dir/"; }; then',
    '    echo "ERROR: Could not write $skill_dir."',
    '    rm -rf -- "$staging"',
    "    return 1",
    "  fi",
    '  rm -rf -- "$staging"',
    '  printf "Installed ' + label + ' in %s\\n" "$skill_dir"',
    "}",
    "__cybercore_install_skill && __cybercore_install_status=0 || __cybercore_install_status=$?",
    "unset -f __cybercore_install_skill",
    // Expand the status before unsetting it so the command's exit code is the real result.
    'eval "unset __cybercore_install_status; (exit $__cybercore_install_status)"'
  ].join("\n");
}

function copyText(text) {
  return copyToClipboard(text);
}

function copyAgentCommand(agentId) {
  const agent = agents.find(a => a.id === agentId);
  if (agent) copyToClipboard(setupCommand(agent), 'Copied ' + agent.name + ' setup command');
}

function availabilityText(skill) {
  const group = groupById[skill.group] || {};
  if (group.default) {
    return 'Installed by default for all ' + skillAgents.length + ' agents with skills support. Choose one agent to generate a single-skill install command.';
  }
  return 'Part of the optional "' + group.pack + '" pack: run the agent installer with --with ' + group.pack + ', or choose one agent to install just this skill.';
}

function agentBadge(agent) {
  return '<span class="card-icon agent-badge" title="' + escapeHtml(agent.name) + '" aria-hidden="true">' + escapeHtml(agent.badge || agent.name.slice(0, 2)) + '</span>';
}

function renderAgents() {
  const grid = document.getElementById('agentGrid'); grid.innerHTML = '';
  agents.filter(agent => !searchQuery || `${agent.name} ${agentLocation(agent)} ${agent.script}`.toLowerCase().includes(searchQuery)).forEach(agent => {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = (e) => { if (!e.target.closest('.copy-btn')) openDetail('agent', agent.id); };
    card.innerHTML = '<div class="card-header">' + agentBadge(agent) + '<div><div class="card-name">' + escapeHtml(agent.name) + ' ' + statusChip(agent) + '</div><div class="card-subtitle">' + escapeHtml(agentLocation(agent)) + '</div></div></div><div class="card-stats"><div class="stat-item"><span class="value">' + escapeHtml(skillCountText(agent)) + '</span></div><div class="stat-item"><span class="value">' + escapeHtml(agent.script) + '</span></div></div><div class="card-actions"><button class="btn btn--ghost btn--icon" onclick="event.stopPropagation(); copyAgentCommand(\'' + agent.id + '\')">Copy Command</button></div>';
    grid.appendChild(card);
  });
}

function renderDeploy() {
  const grid = document.getElementById('deployGrid'); grid.innerHTML = '';
  agents.filter(agent => !searchQuery || `${agent.name} ${agentLocation(agent)} ${agent.script}`.toLowerCase().includes(searchQuery)).forEach(agent => {
    const card = document.createElement('div');
    card.className = 'card';
    const notes = agent.notes.length ? '<ul class="deploy-notes">' + agent.notes.map(n => '<li>' + escapeHtml(n) + '</li>').join('') + '</ul>' : '';
    card.innerHTML = '<div class="card-header">' + agentBadge(agent) + '<div><div class="card-name">' + escapeHtml(agent.name) + ' ' + statusChip(agent) + '</div><div class="card-subtitle">' + escapeHtml(agentLocation(agent)) + '</div></div></div><pre class="card-command">' + escapeHtml(setupCommand(agent)) + '</pre>' + notes + '<button class="btn btn--primary btn--block" onclick="event.stopPropagation(); copyAgentCommand(\'' + agent.id + '\')">Copy Command</button>';
    grid.appendChild(card);
  });
}

function renderRules() {
  const grid = document.getElementById('rulesGrid');
  grid.innerHTML = '';
  (DATA.rules || []).forEach(rule => {
    const card = document.createElement('div');
    card.className = 'card rule-card';
    card.innerHTML = '<h3 class="rule-title">' + escapeHtml(rule.title) + '</h3>' +
      '<div class="md rule-body">' + renderMarkdown(rule.body) + '</div>' +
      '<p class="rule-file"><code>rules/' + escapeHtml(rule.file) + '</code></p>';
    grid.appendChild(card);
  });
}

window.escapeHtml = escapeHtml;

function toggleMobileNav() {
  const nav = document.getElementById('mobileNav'), button = document.getElementById('mobileMenuBtn');
  const isOpen = nav.classList.toggle('open'); button.setAttribute('aria-expanded', String(isOpen));
}
function toggleSearch() {
  const wrap = document.getElementById('searchWrap'), input = document.getElementById('skillSearch');
  wrap.classList.toggle('open'); if (wrap.classList.contains('open')) input.focus();
}

document.addEventListener('click', event => {
  const panel = document.getElementById('detailPanel'); if (event.target === panel) closeDetail();
  if (event.target.closest('.mobile-nav a')) toggleMobileNav();
});
init();
