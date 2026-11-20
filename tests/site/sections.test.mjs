// Sections: hero stats and terminal, agent grid, install terminal, rules, repo log.
// Run: SITE_REQUIRE_BROWSER=1 node --test tests/site/sections.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveWebsite, openPage, browserAvailable } from './harness.mjs';

const skip = !browserAvailable() && 'no Chromium/Chrome binary found (set CHROME_BIN or SITE_REQUIRE_BROWSER=1)';
let site, page, data;

before(async () => {
  if (skip) return;
  site = await serveWebsite();
  page = await openPage(site.url + '?test=1', { width: 1440, height: 900 });
  data = await page.evaluate('window.CC_DATA');
});
after(async () => { await page?.close(); await site?.close(); });

test('hero stats come from data', { skip }, async () => {
  assert.equal(await page.evaluate(`document.querySelector('#heroStats [data-stat="skills"]').textContent`), String(data.skills.length));
  assert.equal(await page.evaluate(`document.querySelector('#heroStats [data-stat="agents"]').textContent`), String(data.agents.length));
  assert.equal(await page.evaluate(`document.querySelector('#heroStats [data-stat="rules"]').textContent`), String(data.rules.length));
  // The hero terminal types itself in; wait for it to finish (or for 5 s).
  await page.evaluate(`new Promise(r => { const t0 = Date.now(); (function poll() {
    if (!document.querySelector('#heroTerminal .typing') || Date.now() - t0 > 5000) r(); else setTimeout(poll, 100); })(); })`);
  assert.match(await page.evaluate(`document.getElementById('heroTerminal').textContent`),
    new RegExp(`${data.skills.length} skills · ${data.rules.length} rules`));
});

test('agent cards show tones', { skip }, async () => {
  assert.equal(await page.evaluate(`document.querySelectorAll('#agentGrid .agent-card').length`), data.agents.length);
  assert.equal(await page.evaluate(`document.querySelector('[data-agent="ollama"] .led').dataset.tone`), 'off');
  assert.equal(await page.evaluate(`document.querySelector('[data-agent="hermes"] .led').dataset.tone`), 'warn');
  assert.equal(await page.evaluate(`document.querySelector('[data-agent="claude"] .led').dataset.tone`), 'ok');
});

test('an agent card opens its sheet', { skip }, async () => {
  await page.evaluate(`document.querySelector('#agentGrid [data-agent="codex"]').click()`);
  assert.equal(await page.evaluate(`document.getElementById('sheetTitle').textContent`), 'Codex');
  assert.equal(await page.evaluate(`location.hash`), '#agent/codex');
  await page.evaluate(`document.querySelector('#sheet [data-action="close-sheet"]').click()`);
  assert.equal(await page.evaluate(`document.activeElement.dataset.agent`), 'codex');
});

test('install tabs switch commands', { skip }, async () => {
  assert.match(await page.evaluate(`document.getElementById('installTerminal').textContent`),
    /git clone https:\/\/github\.com\/cybercoretech\/cybercore-agent-skills\.git ~\/cybercore-agent-skills/);
  assert.doesNotMatch(await page.evaluate(`document.getElementById('installTerminal').textContent`), /null|undefined/);
  await page.evaluate(`document.querySelector('#installTabs [data-agent="codex"]').click()`);
  assert.match(await page.evaluate(`document.getElementById('installTerminal').textContent`), /codex\/agent-project-setup\//);
  assert.equal(await page.evaluate(`document.querySelector('#installTabs [data-agent="codex"]').getAttribute('aria-selected')`), 'true');
  assert.equal(await page.evaluate(`!!document.querySelector('#installTabs [data-agent="ollama"]')`),
    Boolean(data.agents.find(a => a.id === 'ollama').script));
});

test('rules render each file', { skip }, async () => {
  assert.deepEqual(await page.evaluate(`[...document.querySelectorAll('#ruleTabs [data-rule]')].map(t => t.dataset.rule)`),
    data.rules.map(r => r.id));
  await page.evaluate(`document.querySelector('#ruleTabs [data-rule="workflow"]').click()`);
  assert.equal(await page.evaluate(`document.querySelector('#ruleTabs [aria-selected="true"]').dataset.rule`), 'workflow');
  assert.ok((await page.evaluate(`document.getElementById('ruleBody').textContent.length`)) > 40);
});

test('repo log links and status strip', { skip }, async () => {
  const hrefs = await page.evaluate(`[...document.querySelectorAll('#repoBody a')].map(a => a.href)`);
  for (const url of [
    'https://github.com/cybercoretech/cybercore-agent-skills',
    'https://github.com/cybercoretech/cybercore-agent-skills#readme',
    'https://github.com/cybercoretech/cybercore-agent-skills/blob/main/SETUP.md',
    'https://github.com/cybercoretech/cybercore-agent-skills/blob/main/LICENSE',
    'https://github.com/cybercoretech/cybercore-agent-skills/issues',
  ]) assert.ok(hrefs.includes(url), url);
  assert.match(await page.evaluate(`document.getElementById('statusStrip').textContent`), /main/);
  await page.evaluate(`document.dispatchEvent(new CustomEvent('cc:theme', { detail: { id: 'test-theme', label: 'Test Theme', palette: {} } }))`);
  assert.equal(await page.evaluate(`document.querySelector('#statusStrip [data-status="theme"]').textContent`), 'Test Theme');
});

test('phone: skill folders start collapsed so later sections stay reachable', { skip }, async () => {
  const p = await openPage(site.url, { width: 390, height: 844 });
  try {
    assert.deepEqual(await p.evaluate(`[...document.querySelectorAll('#tree .folder-toggle')].map(t => t.getAttribute('aria-expanded'))`),
      ['true', 'false', 'false', 'false', 'false']);
    await p.evaluate(`document.querySelector('[data-folder="core"] .folder-toggle').click()`);
    assert.equal(await p.evaluate(`document.querySelector('[data-folder="core"] .folder-files').hidden`), false);
  } finally { await p.close(); }
});

test('menu jumps land below the sticky title bar', { skip }, async () => {
  const p = await openPage(site.url, { width: 390, height: 844, reducedMotion: true });
  try {
    await p.evaluate(`document.getElementById('install').scrollIntoView({ block: 'start' })`);
    const gap = await p.evaluate(`document.getElementById('install').getBoundingClientRect().top - document.querySelector('header.titlebar').getBoundingClientRect().bottom`);
    assert.ok(gap >= 0, `section top is ${gap}px under the title bar`);
  } finally { await p.close(); }
});

test('phone: the install copy button does not cover the commands', { skip }, async () => {
  const p = await openPage(site.url, { width: 390, height: 844 });
  try {
    const overlap = await p.evaluate(`(() => {
      const b = document.querySelector('.term-copy').getBoundingClientRect();
      return [...document.querySelectorAll('#installTerminal .term-line')].some(line =>
        [...line.getClientRects()].some(r => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top));
    })()`);
    assert.equal(overlap, false);
  } finally { await p.close(); }
});
