// Page shell: title bar, chooser placement, sections, footer, overflow, scrollbars.
// Run: SITE_REQUIRE_BROWSER=1 node --test tests/site/shell.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveWebsite, openPage, browserAvailable } from './harness.mjs';

const skip = !browserAvailable() && 'no Chromium/Chrome binary found (set CHROME_BIN or SITE_REQUIRE_BROWSER=1)';
let site, page;

before(async () => {
  if (skip) return;
  site = await serveWebsite();
  page = await openPage(site.url + '?test=1', { width: 1440, height: 900 });
});
after(async () => { await page?.close(); await site?.close(); });

test('chooser sits in the title bar, never in the drawer', { skip }, async () => {
  assert.equal(await page.evaluate(`!!document.querySelector('header.titlebar cybercore-theme-chooser#themeChooser')`), true);
  assert.equal(await page.evaluate(`!!document.querySelector('#drawer cybercore-theme-chooser')`), false);
});

test('shared footer is untouched', { skip }, async () => {
  assert.equal(await page.evaluate(`document.querySelector('footer').innerHTML.trim().startsWith('<cybercore-contact repo="cybercore-agent-skills"')`), true);
});

for (const width of [320, 390, 768, 1440]) {
  test(`no horizontal overflow at ${width}px`, { skip }, async () => {
    const p = await openPage(site.url, { width, height: 900 });
    try {
      assert.equal(await p.evaluate(`document.documentElement.scrollWidth <= innerWidth`), true);
    } finally { await p.close(); }
  });
}

test('sections and kit tags exist', { skip }, async () => {
  for (const id of ['hero', 'explorer', 'agents', 'install', 'rules', 'repo']) {
    assert.equal(await page.evaluate(`!!document.querySelector('main section#${id} .panel .panel-tabs')`), true, id);
  }
  assert.equal(await page.evaluate(`!!document.querySelector('script[src="https://cybercoretech.github.io/kit/chooser.js"]')`), true);
  assert.equal(await page.evaluate(`!!document.querySelector('script[src="https://cybercoretech.github.io/kit/contact.js"]')`), true);
});

test('phone drawer holds the menu, and the chooser stays beside the menu button', { skip }, async () => {
  const p = await openPage(site.url, { width: 390, height: 844 });
  try {
    assert.equal(await p.evaluate(`getComputedStyle(document.getElementById('menuButton')).display !== 'none'`), true);
    assert.equal(await p.evaluate(`getComputedStyle(document.getElementById('themeChooser')).display !== 'none'`), true);
    await p.evaluate(`document.getElementById('menuButton').click()`);
    assert.equal(await p.evaluate(`document.getElementById('drawer').hidden`), false);
    assert.equal(await p.evaluate(`document.getElementById('menuButton').getAttribute('aria-expanded')`), 'true');
  } finally { await p.close(); }
});

test('scrollbars are themed', { skip }, async () => {
  assert.notEqual(await page.evaluate(`getComputedStyle(document.documentElement).scrollbarColor`), 'auto');
});

test('no console errors', { skip }, () => {
  assert.deepEqual(page.consoleErrors, []);
});
