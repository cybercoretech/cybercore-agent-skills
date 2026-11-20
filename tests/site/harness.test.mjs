// Harness: a browser that never starts must fail fast, once, and not hang the run.
// Run: node --test tests/site/harness.test.mjs (no real browser needed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const harness = new URL('./harness.mjs', import.meta.url).href;

test('a browser that never starts fails fast, then every later page fails at once, and the run exits', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cc-fake-browser-'));
  const fake = join(dir, 'fake-chrome');
  writeFileSync(fake, '#!/bin/sh\nsleep 60\n');
  chmodSync(fake, 0o755);
  const script = `
    import { openPage } from ${JSON.stringify(harness)};
    const times = [];
    for (let i = 0; i < 3; i++) {
      const t0 = Date.now();
      try { await openPage('about:blank', { width: 400, height: 300 }); times.push('opened'); }
      catch (e) { times.push({ ms: Date.now() - t0, msg: e.message }); }
    }
    console.log(JSON.stringify(times));`;
  const t0 = Date.now();
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...process.env, CHROME_BIN: fake, SITE_BROWSER_START_MS: '800' }, encoding: 'utf8', timeout: 15000,
  });
  assert.equal(run.signal, null, `the run hung and was killed after ${Date.now() - t0} ms`);
  const times = JSON.parse(run.stdout.trim().split('\n').at(-1));
  assert.ok(times[0].ms < 3000, `first start failed within the start timeout (${times[0].ms} ms)`);
  assert.match(times[0].msg, /fake-chrome/, 'the error names the browser binary');
  assert.ok(times[1].ms < 200 && times[2].ms < 200, `later pages fail at once (${times[1].ms}, ${times[2].ms} ms)`);
  assert.equal(times[1].msg, times[0].msg);
  assert.ok(Date.now() - t0 < 10000, 'the whole run exits promptly');
});
