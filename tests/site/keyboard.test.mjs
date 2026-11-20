// Keyboard walk-through with real key presses: Tab order, no traps, sheets.
// Run: SITE_REQUIRE_BROWSER=1 node --test tests/site/keyboard.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveWebsite, openPage, browserAvailable } from './harness.mjs';

const skip = !browserAvailable() && 'no Chromium/Chrome binary found (set CHROME_BIN or SITE_REQUIRE_BROWSER=1)';
let site;
before(async () => { if (!skip) site = await serveWebsite(); });
after(async () => { await site?.close(); });

const describeFocus = `(() => {
  let a = document.activeElement;
  while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; // follow focus into web components
  if (!a || a === document.body) return { id: 'body', visible: true };
  if (a.closest('cybercore-theme-chooser') || (a.getRootNode().host && a.getRootNode().host.matches('cybercore-theme-chooser'))) return { id: 'themeChooser', visible: true };
  const r = a.getBoundingClientRect();
  const label = a.id || a.dataset.skill || a.dataset.agent || a.dataset.tab || a.dataset.rule || a.dataset.action || a.tagName.toLowerCase() + ':' + (a.getAttribute('href') || (a.textContent || '').trim().slice(0, 20));
  return { id: label, visible: r.width > 0 && r.height > 0 && getComputedStyle(a).visibility !== 'hidden' };
})()`;

test('Tab walks the whole page without traps or invisible stops', { skip }, async () => {
  const p = await openPage(site.url, { width: 1440, height: 900, reducedMotion: true });
  try {
    const seen = [];
    for (let i = 0; i < 140; i++) {
      await p.press('Tab');
      const f = await p.evaluate(describeFocus);
      assert.ok(f.visible, `Tab stop ${i} (${f.id}) is invisible`);
      seen.push(f.id);
    }
    assert.equal(seen[0], 'a:#explorer', 'first stop is the skip link');
    for (const stop of ['search', 'themeChooser', 'treeSearch', 'android-development', 'installAgent', 'copy-command', 'claude']) {
      assert.ok(seen.includes(stop), `Tab reaches ${stop}`);
    }
    for (let i = 3; i < seen.length; i++) {
      assert.ok(!(seen[i] === seen[i - 1] && seen[i] === seen[i - 2] && seen[i] === seen[i - 3]), `focus stuck on ${seen[i]}`);
    }
  } finally { await p.close(); }
});

test('"/" focuses search; Enter on an agent card opens its sheet; Escape returns focus', { skip }, async () => {
  const p = await openPage(site.url, { width: 1440, height: 900, reducedMotion: true });
  try {
    await p.press('/');
    assert.equal(await p.evaluate('document.activeElement.id'), 'search');
    await p.evaluate(`document.querySelector('#agentGrid [data-agent="hermes"]').focus()`);
    await p.press('Enter');
    assert.equal(await p.evaluate(`document.getElementById('sheet').hidden`), false);
    assert.equal(await p.evaluate(`document.getElementById('sheet').contains(document.activeElement)`), true);
    for (let i = 0; i < 6; i++) {
      await p.press('Tab');
      assert.equal(await p.evaluate(`document.getElementById('sheet').contains(document.activeElement)`), true, `Tab ${i} left the sheet`);
    }
    await p.press('Escape');
    assert.equal(await p.evaluate(`document.getElementById('sheet').hidden`), true);
    assert.equal(await p.evaluate('document.activeElement.dataset.agent'), 'hermes');
  } finally { await p.close(); }
});

test('phone: opening a skill moves focus into the pane; Escape returns to the tree', { skip }, async () => {
  const p = await openPage(site.url, { width: 390, height: 844, reducedMotion: true });
  try {
    await p.evaluate(`document.querySelector('[data-folder="core"] .folder-toggle').click()`);
    await p.evaluate(`document.querySelector('#tree [data-skill="api-backend"]').focus()`);
    await p.press('Enter');
    assert.equal(await p.evaluate(`document.querySelector('.explorer').classList.contains('viewing')`), true);
    assert.equal(await p.evaluate(`document.querySelector('.editor').contains(document.activeElement)`), true, 'focus moved into the pane');
    await p.press('Escape');
    assert.equal(await p.evaluate(`document.querySelector('.explorer').classList.contains('viewing')`), false);
    assert.equal(await p.evaluate('document.activeElement.dataset.skill'), 'api-backend');
  } finally { await p.close(); }
});
