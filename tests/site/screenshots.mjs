// Visual check: captures the site at several widths, themes and motion
// settings for a human (or agent) to inspect. Not part of `node --test`.
// Run: OUT_DIR=/some/dir/outside/the/repo node tests/site/screenshots.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { serveWebsite, openPage } from './harness.mjs';

const outDir = process.env.OUT_DIR;
if (!outDir) { console.error('Set OUT_DIR to a directory outside the repository.'); process.exit(2); }
if (resolve(outDir).startsWith(resolve(new URL('../..', import.meta.url).pathname))) {
  console.error('OUT_DIR must be outside the repository.'); process.exit(2);
}
await mkdir(outDir, { recursive: true });

const HEIGHT = { 390: 844, 768: 1024, 1280: 800, 1440: 900 };
const shots = [
  ...[390, 768, 1280, 1440].flatMap(width => [
    { name: `default-${width}-top`, width },
    { name: `default-${width}-agents`, width, scroll: '#agents' },
    { name: `default-${width}-bottom`, width, scroll: 'bottom' },
  ]),
  ...['alien-flux', 'cyberdark-aurora'].flatMap(theme => [1440, 390].map(width => ({ name: `${theme}-${width}-top`, width, query: `?theme=${theme}` }))),
  { name: 'reduced-motion-1440-top', width: 1440, reducedMotion: true },
  { name: 'chooser-open-1440', width: 1440, chooser: true },
  { name: 'chooser-open-390', width: 390, chooser: true },
  { name: 'sheet-1440', width: 1440, hash: '#agent/hermes' },
];

const site = await serveWebsite();
try {
  for (const shot of shots) {
    const page = await openPage(`${site.url}${shot.query || ''}${shot.hash || ''}`, {
      width: shot.width, height: HEIGHT[shot.width], reducedMotion: Boolean(shot.reducedMotion),
    });
    try {
      await page.evaluate(`new Promise(r => setTimeout(r, 2500))`); // themes load, typing and scramble finish
      if (shot.scroll === 'bottom') await page.evaluate(`scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })`);
      else if (shot.scroll) await page.evaluate(`document.querySelector('${shot.scroll}').scrollIntoView({ block: 'start', behavior: 'instant' })`);
      if (shot.chooser) {
        await page.evaluate(`(() => { const c = document.getElementById('themeChooser'); const b = c.shadowRoot ? c.shadowRoot.querySelector('button') : c.querySelector('button'); b && b.click(); })()`);
      }
      await page.evaluate(`new Promise(r => setTimeout(r, 600))`);
      const file = join(outDir, `${shot.name}.png`);
      await writeFile(file, await page.screenshot());
      console.log(`${file}${page.consoleErrors.length ? `  console errors: ${JSON.stringify(page.consoleErrors)}` : ''}`);
    } finally { await page.close(); }
  }
} finally { await site.close(); }
