// Pure logic tests for website/lib.js (no browser). Run: node --test tests/site/lib.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  setupCommand, installSkillCommand, agentLocation, supportsSkill, statusInfo, folders,
  filterSkills, filterAgents, parseHash, firstSkillId, renderMarkdown, escapeHtml,
  createFavorites, stats, availabilityText, skillAgents,
} from '../../website/lib.js';

const ctx = { window: {} };
vm.runInNewContext(readFileSync(new URL('../../website/data.js', import.meta.url), 'utf8'), ctx);
// Copy into this realm: arrays from the vm context have a different prototype.
const data = JSON.parse(JSON.stringify(ctx.window.CC_DATA));

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
  assert.equal(statusInfo(ollama).tone, 'off');
  assert.equal(skillAgents(data.agents).length, data.agents.length - 1);
});

test('status tones follow the manifest statuses', () => {
  const tone = id => statusInfo(data.agents.find(a => a.id === id)).tone;
  assert.equal(tone('claude'), 'ok');
  assert.equal(tone('hermes'), 'warn');
  assert.equal(tone('ori'), 'bad');
});

test('folders follow group order and mark the opt-in pack', () => {
  const f = folders(data.skills, data.groups);
  assert.deepEqual(f.map(x => x.id), data.groups.map(g => g.id));
  assert.equal(f[0].id, 'core');
  assert.equal(f.find(x => x.id === 'core').optIn, false);
  assert.ok(f.filter(x => x.id !== 'core').every(x => x.optIn), 'every pack is opt-in');
  assert.equal(f.reduce((n, x) => n + x.skills.length, 0), data.skills.length);
  const core = f.find(x => x.id === 'core').skills.map(s => s.id);
  assert.deepEqual(core, [...core].sort());
});

test('search needs every term', () => {
  assert.ok(filterSkills(data.skills, 'clarify building').some(s => s.id === 'clarify-before-building'));
  assert.equal(filterSkills(data.skills, 'clarify zzz').length, 0);
  assert.equal(filterSkills(data.skills, '  ').length, data.skills.length);
  assert.deepEqual(filterAgents(data.agents, 'qwen').map(a => a.id), ['qwen']);
});

test('search ignores the pointers a description makes to other skills', () => {
  const skills = [
    { id: 'guard', name: 'guard', category: 'security', desc: 'Secure development. Use when code touches secrets. Not for auditing existing code (use audit-skill).' },
    { id: 'auditor', name: 'auditor', category: 'security', desc: 'Audit code for vulnerabilities. For building securely, use guard-skill.' },
  ];
  assert.deepEqual(filterSkills(skills, 'auditing').map(s => s.id), []);
  assert.deepEqual(filterSkills(skills, 'secrets').map(s => s.id), ['guard']);
  assert.deepEqual(filterSkills(skills, 'building securely').map(s => s.id), []);
  assert.deepEqual(filterSkills(skills, 'vulnerabilities').map(s => s.id), ['auditor']);
  assert.deepEqual(filterSkills(data.skills, 'security audit').map(s => s.id), ['security-audit']);
});

test('hash parsing and unknown deep links', () => {
  assert.deepEqual(parseHash('#skill/security-audit'), { type: 'skill', id: 'security-audit' });
  assert.deepEqual(parseHash('#agent/claude'), { type: 'agent', id: 'claude' });
  assert.equal(parseHash('#nonsense'), null);
  assert.equal(parseHash(''), null);
  assert.deepEqual(firstSkillId(data.skills, '#skill/does-not-exist'), { id: data.skills[0].id, missing: 'does-not-exist' });
  assert.deepEqual(firstSkillId(data.skills, '#skill/security-audit'), { id: 'security-audit', missing: null });
  assert.deepEqual(firstSkillId(data.skills, ''), { id: data.skills[0].id, missing: null });
});

test('markdown is escaped and headings start at h3', () => {
  assert.ok(!renderMarkdown('<script>alert(1)</script>').includes('<script>'));
  assert.match(renderMarkdown('# Title\n\n- **a**'), /<h3>Title<\/h3>[\s\S]*<strong>a<\/strong>/);
  assert.equal(escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('favourites persist and survive a throwing storage', () => {
  const store = new Map();
  const memory = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const favs = createFavorites(memory);
  assert.equal(favs.toggle('rust-testing'), true);
  assert.deepEqual(JSON.parse(store.get('cc-favs')), ['rust-testing']);
  assert.equal(createFavorites(memory).has('rust-testing'), true);
  assert.equal(favs.toggle('rust-testing'), false);

  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const safe = createFavorites(broken);
  assert.equal(safe.toggle('rust-testing'), true);
  assert.equal(safe.has('rust-testing'), true);
  assert.deepEqual(safe.list(), ['rust-testing']);
});

test('stats are computed', () => {
  const s = stats(data);
  assert.equal(s.skills, data.skills.length);
  assert.equal(s.agents, data.agents.length);
  assert.equal(s.rules, data.rules.length);
  assert.equal(s.optIn, data.skills.filter(x => x.group !== 'core').length);
  assert.equal(s.defaultSkills, s.skills - s.optIn);
});

test('availability text names default or pack', () => {
  const def = data.skills.find(s => s.group === 'core');
  const pack = data.skills.find(s => s.group === 'omarchy');
  assert.match(availabilityText(def, data.groups, data.agents), /^Installed by default for all 12 agents with skills support\./);
  assert.match(availabilityText(pack, data.groups, data.agents), /--with omarchy/);
});
