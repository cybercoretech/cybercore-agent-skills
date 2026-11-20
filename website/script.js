// CyberCore Agent Skills Explorer: page entry (ES module).
// Renders the page from window.CC_DATA (data.js) using the pure helpers in
// lib.js. docs.js (full SKILL.md text) loads only when a skill is opened.
import * as lib from './lib.js';

const DATA = window.CC_DATA || { repo: '', ref: 'main', groups: [], skills: [], agents: [], rules: [] };
const params = new URLSearchParams(location.search);
const TEST = params.has('test');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ----- Toast -----
let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ----- Title bar: drawer, search toggle, active section -----
function openDrawer(open) {
  const drawer = $('#drawer');
  const button = $('#menuButton');
  drawer.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

function setupTitlebar() {
  $('#menuButton').addEventListener('click', () => openDrawer($('#drawer').hidden));
  $$('#drawer a').forEach(a => a.addEventListener('click', () => openDrawer(false)));
  $('#searchToggle').addEventListener('click', () => {
    const box = $('.search');
    const open = !box.classList.contains('open');
    box.classList.toggle('open', open);
    $('#searchToggle').setAttribute('aria-expanded', String(open));
    if (open) $('#search').focus();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#drawer').hidden) openDrawer(false);
  });

  const links = $$('.menu a, #drawer a');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const id = entry.target.id;
      links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + id)));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['explorer', 'agents', 'install', 'rules', 'repo'].forEach(id => observer.observe(document.getElementById(id)));
}

// ----- Hero gutter line numbers -----
function renderGutter() {
  const gutter = $('#hero .gutter');
  gutter.textContent = '';
  for (let i = 1; i <= 14; i++) gutter.append(String(i), document.createElement('br'));
}

function init() {
  renderGutter();
  setupTitlebar();
  if (TEST) window.__cc = { lib, DATA, showToast, openDrawer };
}

init();
