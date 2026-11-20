// Explorer: tree, search, favourites, editor pane, matrix tab, deep links.
// Run: SITE_REQUIRE_BROWSER=1 node --test tests/site/explorer.test.mjs
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

test('tree lists every skill in folders, favourites first', { skip }, async () => {
  assert.equal(await page.evaluate(`document.querySelectorAll('#tree button.file').length`), data.skills.length);
  assert.deepEqual(await page.evaluate(`[...document.querySelectorAll('#tree .folder')].map(f => f.dataset.folder)`),
    ['favourites', 'core', 'general', 'rust', 'omarchy']);
});

test('the first skill opens on load', { skip }, async () => {
  assert.equal(await page.evaluate(`document.querySelector('#paneTabs [aria-selected="true"]').dataset.tab`), data.skills[0].id);
});

test('opening a skill shows support, command and deep link', { skip }, async () => {
  await page.evaluate(`document.querySelector('#tree [data-skill="clarify-before-building"]').click()`);
  assert.equal(await page.evaluate(`location.hash`), '#skill/clarify-before-building');
  assert.equal(await page.evaluate(`document.getElementById('installCommand').textContent.trim()`),
    'bash ~/cybercore-agent-skills/scripts/install-skill.sh claude clarify-before-building');
  assert.equal(await page.evaluate(`document.querySelectorAll('#pane .agent-tag.supported').length`), 12);
  assert.equal(await page.evaluate(`document.querySelectorAll('#pane .agent-tag').length`), 13);
  assert.equal(await page.evaluate(`!!document.querySelector('script[src="docs.js"]')`), false);
});

test('choosing another agent changes the install command', { skip }, async () => {
  await page.evaluate(`(() => { const s = document.getElementById('installAgent'); s.value = 'codex'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  assert.equal(await page.evaluate(`document.getElementById('installCommand').textContent.trim()`),
    'bash ~/cybercore-agent-skills/scripts/install-skill.sh codex clarify-before-building');
});

test('search filters and "/" focuses the title-bar search', { skip }, async () => {
  await page.evaluate(`document.body.focus(); document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))`);
  assert.equal(await page.evaluate(`document.activeElement.id`), 'search');
  await page.evaluate(`applySearchForTest('security audit')`);
  assert.equal(await page.evaluate(`document.querySelectorAll('#tree button.file:not([hidden])').length`), 1);
  assert.equal(await page.evaluate(`document.getElementById('treeSearch').value`), 'security audit');
  await page.evaluate(`applySearchForTest('')`);
  assert.equal(await page.evaluate(`document.querySelectorAll('#tree button.file:not([hidden])').length`), data.skills.length);
});

test('back and forward follow skill deep links', { skip }, async () => {
  await page.evaluate(`document.querySelector('#tree [data-skill="security-audit"]').click()`);
  await page.evaluate(`history.back()`);
  await page.evaluate(`new Promise(r => setTimeout(r, 300))`);
  assert.equal(await page.evaluate(`document.querySelector('#paneTabs [aria-selected="true"]').dataset.tab`), 'clarify-before-building');
});

test('matrix tab scrolls inside its container', { skip }, async () => {
  await page.evaluate(`document.querySelector('#paneTabs [data-tab="matrix"]').click()`);
  assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('#pane .matrix-scroll')).overflowX`), 'auto');
  assert.equal(await page.evaluate(`document.querySelectorAll('#pane .matrix-scroll tbody tr').length`), data.skills.length);
});

test('unknown deep link falls back with a toast', { skip }, async () => {
  const p = await openPage(site.url + '#skill/does-not-exist', { width: 1440, height: 900 });
  try {
    assert.equal(await p.evaluate(`document.querySelector('#paneTabs [aria-selected="true"]').dataset.tab`), data.skills[0].id);
    assert.match(await p.evaluate(`document.getElementById('toast').textContent`), /No skill named does-not-exist/);
    assert.deepEqual(p.consoleErrors, []);
  } finally { await p.close(); }
});

test('favourite toggles even when storage throws', { skip }, async () => {
  const p = await openPage(site.url + '?test=1&nostorage=1', { width: 1440, height: 900 });
  try {
    await p.evaluate(`document.querySelector('#pane [data-action="favourite"]').click()`);
    assert.equal(await p.evaluate(`document.querySelectorAll('[data-folder="favourites"] button.file').length`), 1);
    assert.equal(await p.evaluate(`document.querySelector('#pane [data-action="favourite"]').getAttribute('aria-pressed')`), 'true');
    assert.deepEqual(p.consoleErrors, []);
  } finally { await p.close(); }
});

test('phone: a deep-linked long name opens as a sheet without widening the page', { skip }, async () => {
  const p = await openPage(site.url + '#skill/agent-evaluation-and-benchmarking', { width: 320, height: 800 });
  try {
    assert.equal(await p.evaluate(`document.querySelector('.explorer').classList.contains('viewing')`), true);
    assert.equal(await p.evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
    await p.evaluate(`document.querySelector('#pane [data-action="back"]').click()`);
    assert.equal(await p.evaluate(`document.querySelector('.explorer').classList.contains('viewing')`), false);
  } finally { await p.close(); }
});
