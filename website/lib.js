// CyberCore Agent Skills Explorer: pure logic (no DOM), shared by the page
// and the Node tests. Data comes from data.js (window.CC_DATA).

const REPO_DIR = '~/cybercore-agent-skills';

export function setupCommand(agent) {
  return `bash ${REPO_DIR}/${agent.id}/agent-project-setup/${agent.script}`;
}

export function installSkillCommand(agent, skill) {
  return `bash ${REPO_DIR}/scripts/install-skill.sh ${agent.id} ${skill.id}`;
}

export function supportsSkill(agent) {
  return Boolean(agent.skillsDir);
}

export function skillAgents(agents) {
  return agents.filter(supportsSkill);
}

export function agentLocation(agent) {
  return agent.skillsDir ? `~/${agent.skillsDir}/` : `~/${agent.rulesDir}/ (rules only)`;
}

const TONES = { verified: 'ok', 'needs-setup': 'warn', unverified: 'bad', 'rules-only': 'off' };
const LABELS = { verified: 'verified', 'needs-setup': 'needs setup', unverified: 'unverified', 'rules-only': 'rules only' };

export function statusInfo(agent) {
  return { label: LABELS[agent.status] || agent.status, tone: TONES[agent.status] || 'off' };
}

export function availabilityText(skill, groups, agents) {
  const group = groups.find(g => g.id === skill.group) || {};
  if (group.default) {
    return `Installed by default for all ${skillAgents(agents).length} agents with skills support. Choose one agent to generate a single-skill install command.`;
  }
  return `Part of the optional "${group.pack}" pack: run the agent installer with --with ${group.pack}, or choose one agent to install just this skill.`;
}

export function folders(skills, groups) {
  return groups.map(g => ({
    id: g.id,
    title: g.title,
    optIn: !g.default,
    skills: skills.filter(s => s.group === g.id).sort((a, b) => a.id.localeCompare(b.id)),
  }));
}

export function matchesQuery(text, query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = text.toLowerCase();
  return terms.every(t => hay.includes(t));
}

// Sentences that only point elsewhere ("Not for X (use other-skill)." or
// "For X, use other-skill.") describe other skills, so search skips them.
const POINTER = /^not for\b|\buse [a-z0-9]+(?:-[a-z0-9]+)+\b/i;

export function searchableDesc(desc = '') {
  return desc.split(/(?<=[.!?])\s+/).filter(sentence => !POINTER.test(sentence)).join(' ');
}

export function filterSkills(skills, query) {
  return skills.filter(s => matchesQuery([s.id, s.name, searchableDesc(s.desc), s.category].join(' '), query));
}

export function filterAgents(agents, query) {
  return agents.filter(a => matchesQuery([a.id, a.name, a.statusText].join(' '), query));
}

export function parseHash(hash) {
  const m = /^#(skill|agent)\/(.+)$/.exec(hash || '');
  return m ? { type: m[1], id: decodeURIComponent(m[2]) } : null;
}

export function firstSkillId(skills, hash) {
  const route = parseHash(hash);
  if (route && route.type === 'skill') {
    if (skills.some(s => s.id === route.id)) return { id: route.id, missing: null };
    return { id: skills[0].id, missing: route.id };
  }
  return { id: skills[0].id, missing: null };
}

export function stats(data) {
  const optIn = data.skills.filter(s => !(data.groups.find(g => g.id === s.group) || {}).default).length;
  return {
    skills: data.skills.length,
    agents: data.agents.length,
    rules: data.rules.length,
    defaultSkills: data.skills.length - optIn,
    optIn,
  };
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => ESCAPES[ch]);
}

// Minimal Markdown renderer for SKILL.md bodies. Everything is escaped first,
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

export function renderMarkdown(md) {
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

const FAV_KEY = 'cc-favs';

export function createFavorites(storage) {
  let set = new Set();
  try {
    const parsed = JSON.parse(storage.getItem(FAV_KEY) || '[]');
    if (Array.isArray(parsed)) set = new Set(parsed);
  } catch {
    // Storage blocked or corrupt: keep favourites in memory for this session.
  }
  const save = () => {
    try { storage.setItem(FAV_KEY, JSON.stringify([...set])); } catch { /* in memory only */ }
  };
  return {
    has: id => set.has(id),
    list: () => [...set],
    toggle(id) {
      if (set.has(id)) set.delete(id); else set.add(id);
      save();
      return set.has(id);
    },
  };
}
