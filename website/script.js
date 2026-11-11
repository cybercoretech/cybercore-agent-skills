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
  return 'bash /path/to/cybercore-agent-skills/' + agent.id + '/agent-project-setup/' + agent.script;
}

function agentLocation(agent) {
  return agent.skillsDir ? agent.skillsDir + '/' : agent.rulesDir + '/ (rules only)';
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
    th.textContent = agent.name;
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
  Object.entries(targets).forEach(([id, target]) => {
    const el = document.getElementById(id);
    if (!el) return;
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
    const haystack = `${skill.id} ${skill.name} ${skill.desc} ${skill.category} ${skill.full}`.toLowerCase();
    if (searchQuery && !haystack.includes(searchQuery)) return;
    rendered++;
    const row = document.createElement('tr');
    row.dataset.id = skill.id;
    row.dataset.category = skill.category;
    row.className = 'skill-row';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Open ${skill.name} documentation`);
    row.onclick = () => openDetail('skill', skill.id);
    row.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetail('skill', skill.id); } };
    const isFavorite = favorites.has(skill.id);
    const skillHtml = '<div class="skill-cell"><span class="skill-icon">' + skill.icon + '</span><div class="skill-info"><div class="skill-name">' + escapeHtml(skill.name) + '</div><div class="skill-desc">' + escapeHtml(skill.desc) + '</div><div class="skill-cats"><span class="cat-chip">' + escapeHtml((groupById[skill.group] || {}).title || skill.group) + '</span><span class="cat-chip">' + escapeHtml(skill.category) + '</span></div></div><button class="favorite-btn ' + (isFavorite ? 'favorited' : '') + '" type="button" aria-label="' + (isFavorite ? 'Remove from' : 'Add to') + ' favorites" aria-pressed="' + isFavorite + '" onclick="event.stopPropagation(); toggleFavorite(\'' + skill.id + '\')">' + (isFavorite ? '★' : '☆') + '</button></div>';
    row.innerHTML = '<td>' + skillHtml + '</td>';
    agents.forEach(agent => {
      const td = document.createElement('td');
      td.className = 'status-cell';
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
  input.addEventListener('input', (e) => { searchQuery = e.target.value.trim().toLowerCase(); renderMatrix(); renderAgents(); renderDeploy(); });
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
  panel.focus();
}

function closeDetail() {
  const panel = document.getElementById('detailPanel'); if (!panel) return;
  panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); activeDetail = null;
  if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
}

function renderSkillDetail(skill) {
  document.getElementById('detailTitle').textContent = skill.name;
  const main = document.getElementById('detailMain');
  const sidebar = document.getElementById('detailSidebar');

  main.innerHTML = '<h3>Overview</h3><p>' + escapeHtml(skill.desc) +
    '</p><h3>Category</h3><p><span class="cat-chip" style="margin-right:8px;">' +
    escapeHtml(skill.category) +
    '</span></p><h3>Availability</h3><p>' + escapeHtml(availabilityText(skill)) + '</p><h3>Full Documentation</h3><pre>' +
    escapeMd(skill.full) + '</pre>';

  sidebar.innerHTML =
    '<h4>Skill ID</h4><p>' + escapeHtml(skill.id) +
    '</p><h4>Category</h4><p>' + escapeHtml(skill.category) +
    '</p><h4>Group</h4><p>' + escapeHtml((groupById[skill.group] || {}).title || skill.group) +
    '</p><h4>Version</h4><p>' + escapeHtml(String(skill.version || '1')) + '</p><h4>Install This Skill</h4>' +
    '<button class="copy-btn" onclick="openInstallPicker(\'' + skill.id +
    '\')">Choose Agent &amp; Copy Install Command</button>' +
    '<button class="copy-btn" style="margin-top:8px;" onclick="copyText(window.skillFullText)">Copy Full Documentation</button>';

  window.skillFullText = skill.full;
}

function renderAgentDetail(agent) {
  document.getElementById('detailTitle').textContent = agent.name;
  const main = document.getElementById('detailMain');
  const sidebar = document.getElementById('detailSidebar');
  const deployedSkills = skills.filter(s => skillMatrix[s.id][agent.id]);
  const notes = agent.notes.length ? '<h3>Setup Notes</h3><ul>' + agent.notes.map(n => '<li>' + escapeHtml(n) + '</li>').join('') + '</ul>' : '';
  main.innerHTML = '<h3>Overview</h3><p>' + statusChip(agent) + ' ' + escapeHtml(agent.statusText) + '</p>' + notes +
    '<h3>Installs</h3><p><code>' + escapeHtml(agent.instructions) + '</code>, <code>' + escapeHtml(agent.rulesDir) + '/</code>' +
    (agent.skillsDir ? ', <code>' + escapeHtml(agent.skillsDir) + '/</code>' : '') + '</p>' +
    '<h3>Setup Script</h3><p><code>' + escapeHtml(agent.script) + '</code></p>' +
    '<h3>Skills (' + escapeHtml(skillCountText(agent)) + ')</h3><div style="display:flex;flex-wrap:wrap;gap:6px;">' +
    deployedSkills.map(s => '<span class="skill-tag">' + escapeHtml(s.name) + (skillMatrix[s.id][agent.id] === 'pack' ? ' (opt-in)' : '') + '</span>').join('') + '</div>';
  sidebar.innerHTML = '<h4>Agent ID</h4><p>' + escapeHtml(agent.id) + '</p><h4>Skills Directory</h4><p>' + escapeHtml(agentLocation(agent)) +
    '</p><h4>Setup Script</h4><button class="copy-btn" onclick="copyAgentCommand(\'' + agent.id + '\')">Copy Setup Command</button>' +
    '<p style="margin-top:8px;font-size:12px;">Run it from your project root. Replace /path/to/cybercore-agent-skills with your clone.</p>';
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
  overlay.setAttribute('role', 'presentation');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;' +
    'justify-content:center;padding:20px;background:rgba(0,0,0,.78);' +
    'backdrop-filter:blur(5px);';

  const agentButtons = skillAgents.map(agent =>
    '<button type="button" data-agent-id="' + escapeHtml(agent.id) + '"' +
    ' style="display:flex;align-items:center;justify-content:space-between;' +
    'width:100%;padding:12px 14px;border:1px solid var(--cc-border);' +
    'border-radius:8px;background:var(--cc-card);color:var(--cc-fg);' +
    'cursor:pointer;text-align:left;font:inherit;">' +
    '<span>' + escapeHtml(agent.name) + '</span>' +
    (agent.status === 'verified'
      ? '<span style="color:var(--cc-neon-cyan);font-size:12px;">Copy ↗</span>'
      : statusChip(agent)) +
    '</button>'
  ).join('');

  overlay.innerHTML =
    '<section role="dialog" aria-modal="true" aria-labelledby="skillPickerTitle"' +
    ' style="width:min(440px,100%);max-height:85vh;overflow:auto;padding:22px;' +
    'border:1px solid var(--cc-border);border-radius:12px;' +
    'background:var(--cc-card);box-shadow:0 20px 70px rgba(0,0,0,.5);">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">' +
    '<h3 id="skillPickerTitle" style="margin:0;">Choose an agent</h3>' +
    '<button type="button" data-picker-close aria-label="Close"' +
    ' style="border:0;background:transparent;color:var(--cc-fg);font-size:22px;cursor:pointer;">×</button>' +
    '</div>' +
    '<p style="margin:10px 0 16px;color:var(--cc-fg-muted);font-size:13px;">' +
    'Choose one agent. The command will install only <strong>' +
    escapeHtml(skill.name) + '</strong> for that agent.</p>' +
'<div style="margin:0 0 16px;padding:11px;border:1px solid var(--cc-border);' +
    'border-radius:8px;color:var(--cc-fg);font-size:12px;line-height:1.5;">' +
    '<strong>Important:</strong> Open your terminal in the root directory ' +
    'of the project where you want the skill installed. Do not run the ' +
    'command from the CyberCore skills repository or a project subdirectory.' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
    agentButtons +
    '</div>' +
    '<p style="margin:14px 0 0;color:var(--cc-fg-muted);font-size:11px;">' +
    'Existing copies of this skill are backed up before replacement.</p>' +
    '</section>';

  const onKeyDown = event => {
    if (event.key === 'Escape') closePicker();
  };
  function closePicker() {
    document.removeEventListener('keydown', onKeyDown);
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
        '<h3 id="skillPickerTitle" style="margin:0 0 10px;">Copied for ' + escapeHtml(agent.name) + '</h3>' +
        '<p style="margin:0 0 10px;">' + statusChip(agent) + '</p>' +
        '<ul style="margin:0 0 16px;padding-left:18px;line-height:1.6;">' +
        agent.notes.map(n => '<li>' + escapeHtml(n) + '</li>').join('') + '</ul>' +
        '<button type="button" class="btn btn--primary" data-picker-close style="width:100%;">Done</button>';
      const done = section.querySelector('[data-picker-close]');
      if (done) done.focus();
    });
  });

  document.addEventListener('keydown', onKeyDown);
  document.body.appendChild(overlay);
}

function buildSingleSkillInstallCommand(skill, agent) {
  const validId = value => /^[a-zA-Z0-9._-]+$/.test(String(value));
  const validPath = value => /^[a-zA-Z0-9._-]+(\/[a-zA-Z0-9._-]+)*$/.test(String(value)) && !String(value).split("/").includes("..");
  if (!validId(skill.id) || !validId(agent.id) || !validPath(agent.skillsDir) || !validId(DATA.ref)) {
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
  const target = skillDir + "/SKILL.md";
  const sourceUrl =
    "https://raw.githubusercontent.com/" + DATA.repo + "/" + DATA.ref + "/" +
    agent.id + "/agent-project-setup/" + sourceDir + "/" + skill.id + "/SKILL.md";

  return [
    "__cybercore_install_skill() {",
    '  project_dir="$PWD"',
    '  if command -v git >/dev/null 2>&1 && git rev-parse --show-toplevel >/dev/null 2>&1; then',
    '    project_root="$(git rev-parse --show-toplevel 2>/dev/null)" || return 1',
    '    if [ "$project_root" != "$project_dir" ]; then',
    '      echo "ERROR: Run this command from the project root, not a subdirectory."',
    '      echo "Project root: $project_root"',
    "      return 1",
    "    fi",
    '    remote_url="$(git remote get-url origin 2>/dev/null || true)"',
    '    case "$remote_url" in',
    '      *cybercore-agent-skills*)',
    '        echo "ERROR: Run this from the project where you want the skill installed."',
    "        return 1",
    "        ;;",
    "    esac",
    "  fi",
    '  skill_dir=' + shellQuote(skillDir),
    '  target="$skill_dir/SKILL.md"',
    '  mkdir -p "$skill_dir" || return 1',
    '  if [ -f "$target" ]; then',
    '    backup="$target.bak.$(date +%Y%m%d-%H%M%S)"',
    '    cp -p "$target" "$backup" || return 1',
    '    printf "Backed up existing skill to %s\\n" "$backup"',
    "  fi",
    '  tmp="$target.tmp.$$"',
    '  if curl -fL --progress-bar ' + shellQuote(sourceUrl) + ' -o "$tmp"; then',
    '    if mv "$tmp" "$target"; then',
    '      printf "Installed ' + skill.id + ' for ' + agent.name.replace(/[\r\n]/g, "") + ' in %s\\n" "$target"',
    "    else",
    '      rm -f "$tmp"',
    '      echo "ERROR: Could not save the downloaded skill."',
    "      return 1",
    "    fi",
    "  else",
    '    rm -f "$tmp"',
    '    echo "ERROR: Download failed. Existing installation was preserved."',
    "    return 1",
    "  fi",
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
    card.innerHTML = '<div class="card-header">' + agentBadge(agent) + '<div><div class="card-name">' + escapeHtml(agent.name) + ' ' + statusChip(agent) + '</div><div class="card-subtitle">' + escapeHtml(agentLocation(agent)) + '</div></div></div><div class="card-stats"><div class="stat-item"><span class="value">' + escapeHtml(skillCountText(agent)) + '</span></div><div class="stat-item"><span class="value">' + escapeHtml(agent.script) + '</span></div></div><div style="margin-top:auto;"><button class="btn btn--ghost btn--icon" onclick="event.stopPropagation(); copyAgentCommand(\'' + agent.id + '\')">Copy Command</button></div>';
    grid.appendChild(card);
  });
}

function renderDeploy() {
  const grid = document.getElementById('deployGrid'); grid.innerHTML = '';
  agents.filter(agent => !searchQuery || `${agent.name} ${agentLocation(agent)} ${agent.script}`.toLowerCase().includes(searchQuery)).forEach(agent => {
    const card = document.createElement('div');
    card.className = 'card';
    const notes = agent.notes.length ? '<ul class="deploy-notes">' + agent.notes.map(n => '<li>' + escapeHtml(n) + '</li>').join('') + '</ul>' : '';
    card.innerHTML = '<div class="card-header">' + agentBadge(agent) + '<div><div class="card-name">' + escapeHtml(agent.name) + ' ' + statusChip(agent) + '</div><div class="card-subtitle">' + escapeHtml(agentLocation(agent)) + '</div></div></div><pre style="margin:12px 0; font-size:12px;">' + escapeHtml(setupCommand(agent)) + '</pre>' + notes + '<button class="btn btn--primary" style="width:100%;" onclick="event.stopPropagation(); copyAgentCommand(\'' + agent.id + '\')">Copy Command</button>';
    grid.appendChild(card);
  });
}

function renderRules() {
  const grid = document.getElementById('rulesGrid');
  grid.innerHTML = '';
  const rules = [
    {
      title: 'Zero Unapproved Actions',
      items: [
        'Never edit code, overwrite files, or run state-modifying commands without presenting a plan and obtaining explicit user confirmation.',
        'Always show the diff and intent before editing any file.',
        'Never make changes silently or "just to try something."'
      ]
    },
    {
      title: 'No Rogue Bug-Fixing Loops',
      items: [
        'If a build fails or a test errors out, STOP immediately.',
        'Explain the error directly to the user.',
        'Do not attempt recursive auto-fix attempts without permission.'
      ]
    },
    {
      title: 'Preserve Existing Architecture',
      items: [
        'Do not rewrite whole functions or refactor files unless explicitly instructed.',
        'Do not change library dependencies or public API signatures without request.',
        'Make the minimal change required to fulfill the user\'s explicit request.'
      ]
    }
  ];
  rules.forEach(rule => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<h3 style="font-family:var(--cc-font-mono);font-size:15px;color:var(--cc-neon-purple);margin-bottom:8px;">' + escapeHtml(rule.title) + '</h3><ul style="color:var(--cc-fg-muted);font-size:13px;line-height:1.7;padding-left:18px;">' + rule.items.map(i => '<li>' + escapeHtml(i) + '</li>').join('') + '</ul>';
    grid.appendChild(card);
  });
}

window.escapeHtml = escapeHtml;
function escapeMd(text) { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
window.escapeMd = escapeMd;

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
