// Browser test harness for the Skills Explorer, using only Node built-ins:
// a static server for website/ and headless Chromium/Chrome driven over the
// Chrome DevTools Protocol with Node's built-in WebSocket (Node 22+).
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../website/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
};

export function browserBinary() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  for (const name of ['chromium', 'chromium-browser', 'google-chrome-stable', 'google-chrome']) {
    const found = spawnSync('which', [name], { encoding: 'utf8' });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  return null;
}

/** True when browser tests should run; throws if they are required but impossible. */
export function browserAvailable() {
  const bin = browserBinary();
  if (!bin && process.env.SITE_REQUIRE_BROWSER === '1') throw new Error('SITE_REQUIRE_BROWSER=1 but no Chromium/Chrome binary was found (set CHROME_BIN)');
  return Boolean(bin);
}

export async function serveWebsite() {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(ROOT, path.endsWith('/') ? path + 'index.html' : path);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}/`, close: () => new Promise(resolve => server.close(resolve)) };
}

function devtoolsUrl(proc) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error('browser did not start: ' + buf.slice(-400))), 20000);
    proc.stderr.on('data', chunk => {
      buf += chunk;
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    proc.on('exit', code => reject(new Error('browser exited with ' + code + ': ' + buf.slice(-400))));
  });
}

export async function openPage(url, { width, height, dpr = 2, reducedMotion = false } = {}) {
  const profile = await mkdtemp(join(tmpdir(), 'cc-site-test-'));
  const proc = spawn(browserBinary(), [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    // CI runners (Ubuntu 24.04) restrict the user namespaces Chrome's sandbox needs; the tests only load the local site and the org kit.
    ...(process.env.CI ? ['--no-sandbox'] : []),
    `--window-size=${width},${height}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const browserWs = await devtoolsUrl(proc);
  const base = browserWs.replace(/^ws:/, 'http:').replace(/\/devtools\/browser\/.*$/, '');
  const targets = await (await fetch(base + '/json/list')).json();
  const target = targets.find(t => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  const consoleErrors = [];
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map(a => a.value ?? a.description ?? '').join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      }
      (listeners.get(msg.method) || []).forEach(fn => fn(msg.params));
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const once = method => new Promise(resolve => {
    const fns = listeners.get(method) || [];
    const fn = params => { listeners.set(method, (listeners.get(method) || []).filter(f => f !== fn)); resolve(params); };
    listeners.set(method, [...fns, fn]);
  });

  await send('Page.enable');
  await send('Runtime.enable');
  // Headless Chromium stops animation frames on an unfocused page after a few seconds; keep it focused.
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: width < 600 });
  if (reducedMotion) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url });
  await loaded;

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  await evaluate('document.fonts.ready.then(() => new Promise(r => setTimeout(r, 400)))');

  return {
    evaluate,
    consoleErrors,
    /** Real key press through the browser's input pipeline (Tab, Escape, Enter, '/'). */
    async press(key, { shift = false } = {}) {
      const codes = { Tab: 9, Escape: 27, Enter: 13, '/': 191 };
      const base = { key, code: key === '/' ? 'Slash' : key, windowsVirtualKeyCode: codes[key] || 0, modifiers: shift ? 8 : 0 };
      await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, ...(key.length === 1 ? { text: key } : key === 'Enter' ? { text: '\r' } : {}) });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    },
    screenshot: async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'),
    async close() {
      try { ws.close(); } catch { /* already closed */ }
      proc.kill();
      await new Promise(resolve => (proc.exitCode !== null ? resolve() : proc.once('exit', resolve)));
      // Chromium's helper processes can still be writing the profile briefly
      // after the main process exits; retry, and never fail a test over clean-up.
      await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
    },
  };
}
