// Sheets: full SKILL.md (lazy docs.js, retry on failure) and agent details.
// Run: SITE_REQUIRE_BROWSER=1 node --test tests/site/sheets.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveWebsite, openPage, browserAvailable } from './harness.mjs';

const skip = !browserAvailable() && 'no Chromium/Chrome binary found (set CHROME_BIN or SITE_REQUIRE_BROWSER=1)';
let site, page;
const settle = ms => `new Promise(r => setTimeout(r, ${ms}))`;

before(async () => {
  if (skip) return;
  site = await serveWebsite();
  page = await openPage(site.url + '?test=1#skill/security-audit', { width: 1440, height: 900 });
});
after(async () => { await page?.close(); await site?.close(); });

test('docs.js loads only when the skill text is opened', { skip }, async () => {
  assert.equal(await page.evaluate(`!!document.querySelector('script[src="docs.js"]')`), false);
  await page.evaluate(`document.querySelector('#pane [data-action="open-doc"]').click()`);
  await page.evaluate(settle(600));
  assert.equal(await page.evaluate(`document.getElementById('sheet').hidden`), false);
  assert.equal(await page.evaluate(`document.getElementById('sheetTitle').textContent.includes('security-audit')`), true);
  assert.equal(await page.evaluate(`!!document.querySelector('#sheet .md h3')`), true);
  assert.equal(await page.evaluate(`document.querySelector('main').inert`), true);
});

test('Escape closes the sheet and returns focus to the opener', { skip }, async () => {
  await page.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  assert.equal(await page.evaluate(`document.getElementById('sheet').hidden`), true);
  assert.equal(await page.evaluate(`document.querySelector('main').inert`), false);
  assert.equal(await page.evaluate(`document.activeElement.dataset.action`), 'open-doc');
});

test('Tab stays inside an open sheet', { skip }, async () => {
  await page.evaluate(`document.querySelector('#pane [data-action="open-doc"]').click()`);
  await page.evaluate(settle(200));
  const inside = await page.evaluate(`(() => {
    const sheet = document.getElementById('sheet');
    const items = [...sheet.querySelectorAll('button, a[href]')];
    items.at(-1).focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    return sheet.contains(document.activeElement);
  })()`);
  assert.equal(inside, true);
  await page.evaluate(`document.querySelector('#sheet [data-action="close-sheet"]').click()`);
});

test('agent deep link opens the agent sheet', { skip }, async () => {
  const p = await openPage(site.url + '#agent/hermes', { width: 1440, height: 900 });
  try {
    const text = await p.evaluate(`document.getElementById('sheet').textContent`);
    assert.match(text, /~\/\.hermes\/skills\//);
    assert.match(text, /needs setup/);
    assert.match(text, /hermes skills trust ~/);
    assert.match(text, /bash ~\/cybercore-agent-skills\/hermes\/agent-project-setup\/setup-hermes\.sh/);
    await p.evaluate(`document.querySelector('#sheet [data-action="close-sheet"]').click()`);
    assert.equal(await p.evaluate(`location.hash`), '');
    assert.deepEqual(p.consoleErrors, []);
  } finally { await p.close(); }
});

test('unknown agent deep link shows a toast', { skip }, async () => {
  const p = await openPage(site.url + '#agent/nobody', { width: 1440, height: 900 });
  try {
    assert.equal(await p.evaluate(`document.getElementById('sheet').hidden`), true);
    assert.match(await p.evaluate(`document.getElementById('toast').textContent`), /No agent named nobody/);
  } finally { await p.close(); }
});

test('docs.js failure shows a retry, not a blank sheet', { skip }, async () => {
  const p = await openPage(site.url + '?test=1&nodocs=1', { width: 1440, height: 900 });
  try {
    await p.evaluate(`document.querySelector('#pane [data-action="open-doc"]').click()`);
    await p.evaluate(settle(600));
    assert.match(await p.evaluate(`document.getElementById('sheet').textContent`), /Could not load the skill text/);
    assert.equal(await p.evaluate(`!!document.querySelector('#sheet [data-action="retry"]')`), true);
  } finally { await p.close(); }
});
