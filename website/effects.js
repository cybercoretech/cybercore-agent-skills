// CyberCore Agent Skills Explorer: decorative effects (ES module).
// Everything here is optional polish: it runs after the page is interactive,
// never blocks input, keeps final text available to assistive technology,
// pauses while the tab is hidden, and does nothing for reduced motion.

const GLYPHS = '01<>/\\{}[]#$%&*+=?~ABCDEFXYZ';

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Frames via requestAnimationFrame, which browsers suspend in hidden tabs. */
function frames(duration, step) {
  return new Promise(resolve => {
    const start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / duration);
      step(t);
      if (t < 1) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function textNodes(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

/**
 * Scrambles an element's text into place, keeping its child elements (such
 * as the purple ×). The final text sits in aria-label throughout.
 */
export async function scramble(el, { duration = 550 } = {}) {
  const finalText = el.textContent.replace(/\s+/g, ' ').trim();
  el.setAttribute('aria-label', finalText);
  if (prefersReducedMotion()) return;
  const nodes = textNodes(el).map(node => ({ node, text: node.textContent }));
  const total = nodes.reduce((n, item) => n + item.text.length, 0) || 1;
  await frames(duration, t => {
    let seen = 0;
    const settled = Math.floor(t * total);
    for (const item of nodes) {
      item.node.textContent = [...item.text].map((ch, i) => {
        const index = seen + i;
        if (ch === ' ' || index < settled) return ch;
        return GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }).join('');
      seen += item.text.length;
    }
  });
  for (const item of nodes) item.node.textContent = item.text;
}

/**
 * Types lines into the `.term-line` spans of a terminal, character by
 * character, after any prompt span. `lines[i]` is the text for span i.
 */
export async function typeLines(el, lines, { cps = 40 } = {}) {
  const targets = [...el.querySelectorAll('.term-line')].map((span, i) => {
    let node = span.lastChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) node = span.appendChild(document.createTextNode(''));
    return { node, text: lines[i] ?? node.textContent };
  });
  if (prefersReducedMotion()) { targets.forEach(t => { t.node.textContent = t.text; }); return; }
  el.setAttribute('aria-busy', 'true');
  el.classList.add('typing');
  targets.forEach(t => { t.node.textContent = ''; });
  for (const target of targets) {
    if (!target.node.isConnected) break; // re-rendered (tab switch): the new content is already final
    await frames((target.text.length / cps) * 1000, t => {
      target.node.textContent = target.text.slice(0, Math.ceil(t * target.text.length));
    });
  }
  targets.forEach(t => { t.node.textContent = t.text; });
  el.classList.remove('typing');
  el.removeAttribute('aria-busy');
}

/** Runs fn once, the first time el scrolls into view. */
export function onFirstView(el, fn) {
  if (!el) return;
  const observer = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { observer.disconnect(); fn(); }
  }, { threshold: 0.25 });
  observer.observe(el);
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const TRACES = [
  { d: 'M10 40 H120 L150 70 H300', tone: 'cyan' },
  { d: 'M40 120 H90 L120 150 H210 L240 120 H300', tone: 'purple' },
  { d: 'M0 200 H160 L190 170 H260 L280 190 H300', tone: 'green' },
  { d: 'M60 250 H140 L170 220 H300', tone: 'cyan' },
];

/** Circuit traces with travelling signal pulses, behind the right side of the hero. */
function heroCircuit(hero) {
  if (!hero || hero.querySelector('svg.circuit')) return;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'circuit');
  svg.setAttribute('viewBox', '0 0 300 280');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  TRACES.forEach((trace, i) => {
    for (const cls of ['trace', 'pulse']) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', trace.d);
      path.setAttribute('pathLength', '100');
      path.setAttribute('class', `${cls} tone-${trace.tone}`);
      if (cls === 'pulse') path.style.animationDelay = `${-i * 0.9}s`;
      svg.append(path);
    }
    const end = endPoint(trace.d);
    const node = document.createElementNS(SVG_NS, 'circle');
    node.setAttribute('cx', String(end.x));
    node.setAttribute('cy', String(end.y));
    node.setAttribute('r', '3');
    node.setAttribute('class', `pad tone-${trace.tone}`);
    svg.append(node);
  });
  hero.append(svg);
}

/** End point of a path made of M, L, H and V commands. */
function endPoint(d) {
  let x = 0;
  let y = 0;
  for (const [, cmd, args] of d.matchAll(/([MLHV])\s*([\d\s.]+)/g)) {
    const nums = args.trim().split(/\s+/).map(Number);
    if (cmd === 'M' || cmd === 'L') [x, y] = nums;
    else if (cmd === 'H') x = nums[0];
    else y = nums[0];
  }
  return { x, y };
}

/** Wires every effect on the page. Safe to call once after the first render. */
export function startEffects(root = document) {
  const html = root.documentElement;
  const sync = () => html.classList.toggle('fx-paused', root.hidden);
  root.addEventListener('visibilitychange', sync);
  sync();

  const reduced = prefersReducedMotion();
  html.classList.toggle('fx-on', !reduced);
  heroCircuit(root.querySelector('#hero .hero'));

  const heroTitle = root.querySelector('#hero h1');
  if (heroTitle) scramble(heroTitle);
  root.querySelectorAll('h2.fx-scramble').forEach(h => {
    h.setAttribute('aria-label', h.textContent.trim());
    if (!reduced) onFirstView(h, () => scramble(h));
  });

  if (reduced) return;
  for (const id of ['heroTerminal', 'installTerminal']) {
    const box = root.getElementById(id);
    const term = box && (box.matches('.term-lines') ? box : box.querySelector('.term-lines'));
    if (!term) continue;
    const lines = [...term.querySelectorAll('.term-line')].map(span => (span.lastChild && span.lastChild.nodeType === Node.TEXT_NODE ? span.lastChild.textContent : ''));
    onFirstView(term, () => typeLines(term, lines));
  }
}
