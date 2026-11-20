// Follow-up polish: history after agent sheets, single routing, hero terminal label, pane tab semantics.
// Run: SITE_REQUIRE_BROWSER=1 node --test tests/site/polish.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveWebsite, openPage, browserAvailable } from './harness.mjs';

const skip = !browserAvailable() && 'no Chromium/Chrome binary found (set CHROME_BIN or SITE_REQUIRE_BROWSER=1)';
let site;
const settle = ms => `new Promise(r => setTimeout(r, ${ms}))`;
before(async () => { if (!skip) site = await serveWebsite(); });
after(async () => { await site?.close(); });

test('closing an agent sheet steps back instead of leaving a duplicate history entry', { skip }, async () => {
  const p = await openPage(site.url + '?test=1', { width: 1440, height: 900, reducedMotion: true });
  try {
    await p.evaluate(`document.querySelector('#tree [data-skill="security-audit"]').click()`);
    await p.evaluate(`document.querySelector('#agentGrid [data-agent="codex"]').click()`);
    await p.evaluate(`document.querySelector('#sheet [data-action="close-sheet"]').click()`);
    await p.evaluate(settle(300));
    assert.equal(await p.evaluate('location.hash'), '#skill/security-audit');
    assert.equal(await p.evaluate(`document.getElementById('sheet').hidden`), true);
    assert.equal(await p.evaluate('document.activeElement.dataset.agent'), 'codex');
  } finally { await p.close(); }
});

test('back and forward run the router once', { skip }, async () => {
  const p = await openPage(site.url + '?test=1', { width: 1440, height: 900, reducedMotion: true });
  try {
    await p.evaluate(`document.querySelector('#tree [data-skill="security-audit"]').click()`);
    const runs = await p.evaluate('window.__cc.routeRuns()');
    await p.evaluate('history.back()');
    await p.evaluate(settle(300));
    assert.equal(await p.evaluate('window.__cc.routeRuns()'), runs + 1);
  } finally { await p.close(); }
});

test('the hero terminal is one labelled image for screen readers', { skip }, async () => {
  const p = await openPage(site.url, { width: 1440, height: 900, reducedMotion: true });
  try {
    const data = await p.evaluate('window.CC_DATA');
    const t = await p.evaluate(`(() => { const t = document.getElementById('heroTerminal'); return { role: t.getAttribute('role'), label: t.getAttribute('aria-label') }; })()`);
    assert.equal(t.role, 'img');
    assert.match(t.label, /setup-claude\.sh/);
    assert.match(t.label, new RegExp(`${data.skills.length} skills`));
  } finally { await p.close(); }
});

test('the open-skill strip holds only buttons, with the active one marked current', { skip }, async () => {
  const p = await openPage(site.url, { width: 1440, height: 900, reducedMotion: true });
  try {
    assert.equal(await p.evaluate(`document.querySelectorAll('#paneTabs [role="tab"], #paneTabs[role="tablist"]').length`), 0);
    assert.equal(await p.evaluate(`document.getElementById('paneTabs').getAttribute('aria-label')`), 'Open skills');
    assert.equal(await p.evaluate(`document.querySelectorAll('#paneTabs [aria-current="true"]').length`), 1);
    assert.equal(await p.evaluate(`document.getElementById('pane').getAttribute('role')`), 'region');
  } finally { await p.close(); }
});
