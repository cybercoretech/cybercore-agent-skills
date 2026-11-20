// Effects: pulses, scramble, typing, theme recolouring, pause when hidden, reduced motion.
// Run: SITE_REQUIRE_BROWSER=1 node --test tests/site/effects.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serveWebsite, openPage, browserAvailable } from './harness.mjs';

const skip = !browserAvailable() && 'no Chromium/Chrome binary found (set CHROME_BIN or SITE_REQUIRE_BROWSER=1)';
let site, page;
const settle = ms => `new Promise(r => setTimeout(r, ${ms}))`;

before(async () => {
  if (skip) return;
  site = await serveWebsite();
  page = await openPage(site.url, { width: 1440, height: 900 });
});
after(async () => { await page?.close(); await site?.close(); });

test('reduced motion: nothing animates and text is final', { skip }, async () => {
  const p = await openPage(site.url, { width: 1440, height: 900, reducedMotion: true });
  try {
    assert.equal(await p.evaluate(`document.getAnimations().filter(a => a.playState === 'running').length`), 0);
    assert.match(await p.evaluate(`document.querySelector('#hero h1').textContent`), /Agent × Skill Matrix/);
    assert.match(await p.evaluate(`document.getElementById('installTerminal').textContent`), /git clone/);
    assert.deepEqual(p.consoleErrors, []);
  } finally { await p.close(); }
});

test('effects run normally', { skip }, async () => {
  assert.ok(await page.evaluate(`document.getAnimations().length`) > 0);
  assert.ok(await page.evaluate(`document.querySelectorAll('#hero svg .pulse').length`) >= 3);
  assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('#hero svg')).pointerEvents`), 'none');
});

test('the hero heading settles on its final text, labelled for screen readers', { skip }, async () => {
  await page.evaluate(settle(900));
  assert.equal(await page.evaluate(`document.querySelector('#hero h1').textContent`), 'Agent × Skill Matrix');
  assert.equal(await page.evaluate(`document.querySelector('#hero h1').getAttribute('aria-label')`), 'Agent × Skill Matrix');
  assert.equal(await page.evaluate(`!!document.querySelector('#hero h1 .accent')`), true);
});

test('the install terminal types its lines when it first appears', { skip }, async () => {
  await page.evaluate(`document.getElementById('install').scrollIntoView({ block: 'start', behavior: 'instant' })`);
  // Wait for typing to start and then finish (up to 10 s) rather than a fixed sleep.
  await page.evaluate(`new Promise(r => { const t0 = Date.now(); let started = false; (function poll() {
    const typing = document.getElementById('installTerminal').classList.contains('typing');
    started = started || typing;
    if ((started && !typing) || Date.now() - t0 > 10000) r(); else setTimeout(poll, 100); })(); })`);
  assert.match(await page.evaluate(`document.getElementById('installTerminal').textContent`),
    /git clone https:\/\/github\.com\/cybercoretech\/cybercore-agent-skills\.git ~\/cybercore-agent-skills/);
  assert.match(await page.evaluate(`document.getElementById('installTerminal').textContent`), /setup-claude\.sh/);
});

test('theme palette recolours the page', { skip }, async () => {
  const before = await page.evaluate(`getComputedStyle(document.querySelector('header.titlebar')).backgroundColor`);
  await page.evaluate(`document.dispatchEvent(new CustomEvent('cc:theme', { detail: { id: 'test', palette: { bg: '112233', panel: '223344', cyan: '00ff88', purple: 'ff00aa' } } }))`);
  assert.notEqual(await page.evaluate(`getComputedStyle(document.querySelector('header.titlebar')).backgroundColor`), before);
  assert.match(await page.evaluate(`document.querySelector('#statusStrip [data-status="theme"]').textContent`), /test/);
});

test('effects pause when hidden', { skip }, async () => {
  await page.evaluate(`Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))`);
  assert.equal(await page.evaluate(`document.documentElement.classList.contains('fx-paused')`), true);
  await page.evaluate(`Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange'))`);
  assert.equal(await page.evaluate(`document.documentElement.classList.contains('fx-paused')`), false);
});
