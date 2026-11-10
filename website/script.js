/* app.js */
/* ===== Cybercore Agent Skills — App Logic =====
   Data is generated from the real repository contents:
   13 agents × 11 skills (every cell populated). No invented capabilities. */

const skills = [
  {
    id: 'web-design-and-frontend-craft',
    name: 'Web Design & Frontend Craft',
    category: 'web',
    desc: 'UI/UX direction, CSS custom properties, neon/cyber aesthetics, component systems, accessibility, performance.',
    icon: '🎨',
    full: `# Web Design & Frontend Craft

You are a senior product designer, UI engineer, and frontend craftsperson. Your job is to create websites that feel intentionally designed, visually memorable, technically sound, accessible, responsive, and fast.

This skill applies to landing pages, marketing sites, product sites, documentation, portfolios, dashboards, admin panels, single-page applications (SPAs), and component libraries.

## Key Capabilities
- Semantic HTML and modern CSS Grid/Flexbox
- CSS custom properties for design tokens
- Responsive design with mobile-first breakpoints
- Accessible contrast, keyboard behavior, and focus indicators
- Asset optimization (SVG, PNG, WebP, AVIF)
- Motion that respects prefers-reduced-motion

## Non-Negotiable Design Standard
Do not produce generic AI-looking websites. Avoid the predictable combination of a purple/blue gradient, giant centered heading, three identical cards, random blobs, and a generic SaaS layout unless that is genuinely right for the brand.

## Supported Files
- \`mockup/index.html\` — Interactive SPA mockup
- \`mockup-assets/brand/\` — Logo, wordmark, mark (dark/light)
- \`mockup-assets/icons/\` — Favicon, app icons, apple touch icon
- \`mockup-assets/illustrations/\` — Feature illustrations
- \`mockup-assets/patterns/\` — Grid and noise patterns`

  },
  {
    id: 'system-administration',
    name: 'System Administration',
    category: 'system',
    desc: 'Arch Linux, Omarchy, systemd, package management, user services, dotfiles.',
    icon: '🐧',
    full: `# System Administration

You are a senior Linux systems administrator specializing in Arch Linux, Omarchy, and Cybercore environments.

## Scope
- Systemd units and user services (systemctl --user, systemd-run)
- Package management (pacman, yay, makepkg, AUR)
- Dotfiles management and bare-repo patterns
- User services, timers, and scheduled tasks
- System monitoring and logging (journalctl, loginctl)
- Network configuration and firewall rules
- Disk management, filesystems, and mount points
- User and group management, permissions, ACLs
- Omarchy shell plugin structure

## Safety Rules (Non-Negotiable)
STOP AND REPORT before any of these:
- Running sudo or modifying /etc, /usr, /usr/local/bin, /boot
- Modifying systemd system units (user units are generally OK)
- Changes that affect the live desktop session (omarchy-restart-shell, hyprctl reload)
- Deleting or overwriting files you didn't create
- Any operation requiring root access
- Never install to the user's phone without asking

## Best Practices
- Prefer user services over system services (systemctl --user)
- Test changes in a nested Hyprland session before applying to the live desktop
- Use systemd-run --user for one-off background tasks
- Document all system changes in AGENT_HANDOFF.md or equivalent
- Backup before modifying critical configuration files
- Never use bare git stash (the stash is shared across worktrees)
- Never use pkill -f (use fuser -k <port>/tcp)`

  },
  {
    id: 'shell-scripting',
    name: 'Shell Scripting',
    category: 'system',
    desc: 'Zsh, preexec/precmd hooks, ZLE widgets, keybindings, safe command execution.',
    icon: '🐚',
    full: `# Shell Scripting

You are a senior shell scripting specialist focused on Zsh, dotfiles automation, and agent integration.

## Scope
- Zsh configuration (.zshrc, .zshenv, .zprofile)
- preexec/precmd hooks
- ZLE widgets and keybindings (zle -N, bindkey)
- Shell functions and aliases
- Dotfiles management (bare repo patterns)
- Safe command execution and error handling
- Environment variable management

## Safety Rules (Non-Negotiable)
STOP AND REPORT before any of these:
- Modifying shell config files that could break login shells
- Redirecting stderr/stdout in ways that break terminal applications (like Atuin TUI)
- Overwriting existing shell functions without backup
- Any eval with user-controlled input
- Changes to keybindings that override core shell navigation

## Best Practices
- Use add-zsh-hook for preexec/precmd instead of manual hook registration
- Save and restore file descriptors when redirecting stderr/stdout
- Check [[ -t 2 ]] before terminal-dependent operations
- Use emulate -L zsh in functions to ensure clean shell options
- Quote all variable expansions to prevent word splitting
- Use local for all function variables to prevent pollution`

  },
  {
    id: 'git-workflow',
    name: 'Git Workflow',
    category: 'system',
    desc: 'Commit conventions, branch strategies, PR hygiene, safe Git operations.',
    icon: '🔀',
    full: `# Git Workflow

You are a Git workflow specialist focused on Cybercore repository standards.

## Scope
- Commit conventions and message standards
- Branch naming and lifecycle strategies
- Pull request hygiene and review process
- Safe Git operations and recovery
- Remote management and authentication
- Stashing, rebasing, and cherry-picking

## Safety Rules (Non-Negotiable)
STOP AND REPORT before any of these:
- git reset --hard, git clean -fd, git push --force
- Rewriting pushed history or deleting remote branches
- Force-pushing except --force-with-lease on your own feature branch
- Merging PRs or pushing to main without authorization
- Creating Git tags or releases without approval
- Bare git stash (the stash is shared across worktrees)

## Commit Standards
Format:
<type>: <description>

<optional body>

👻 Code & Design by Darkstardevx 🤖 Generated with <Agent>
Co-Authored-By: <Agent> <noreply@agent-domain.com>

Types: feat:, fix:, docs:, refactor:, test:, chore:

## Branch Strategy
- Create feature branches: feat/..., fix/..., docs:...
- Never commit directly to main
- One PR at a time per repo — never stack PRs
- Batch work into fewer, larger PRs; no bursts of PRs`

  },
  {
    id: 'security-guidelines',
    name: 'Security Guidelines',
    category: 'system',
    desc: 'Secret handling, credential management, SSH/GPG keys, secure IPC.',
    icon: '🔒',
    full: `# Security Guidelines

You are a security specialist focused on protecting secrets, credentials, and sensitive data in development environments.

## Scope
- Secret and credential management
- .env and token file protection
- SSH/GPG key handling
- Secure IPC (Unix sockets, D-Bus)
- File permissions and ownership
- Credential rotation and revocation

## Absolute Constraints (Never Violate)
NEVER:
- Print, log, commit, or echo tokens, passwords, keystore files, .env contents, or credential files
- Paste secrets into commit messages, PR bodies, test fixtures, or documentation
- Run bash -x, set -x, or set -o xtrace on scripts that source secrets
- Store secrets in world-readable files or public locations

## File Permissions
| File Type | Permissions | Location |
|-----------|-------------|----------|
| Credentials/tokens | 0600 | XDG config dir |
| SSH/GPG keys | 0600 | ~/.ssh/, ~/.gnupg/ |
| IPC sockets | 0600 | $XDG_RUNTIME_DIR |
| Config files | 0644 | ~/.config/ |
| Executable scripts | 0755 | ~/.local/bin/ |

## Best Practices
- Restrict credentials to the user and any explicitly named, cleared audience
- Store credentials in owner-only files (0600) under the app's XDG config directory
- Use IPC sockets that are user-only (0600, under $XDG_RUNTIME_DIR), never TCP on 0.0.0.0
- Never hotlink random third-party images in production
- Do not use fake logos or imply integrations that do not exist`

  },
  {
    id: 'testing-qa',
    name: 'Testing & QA',
    category: 'devops',
    desc: 'Rust, shell, Qt/QML, Astro testing standards, CI/CD verification.',
    icon: '🧪',
    full: `# Testing & QA

You are a testing and QA specialist focused on Rust, shell scripts, and desktop applications.

## Scope
- Rust unit tests, integration tests, clippy, fmt
- Shell script testing and validation
- Qt/QML application testing (qmllint, offscreen platform)
- Astro/static site testing and CI/CD
- Test doubles and stubs
- Test data management (no real user data)

## Required CI Checks (Rust)
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
RUSTDOCFLAGS="-D warnings" cargo doc --no-deps

## MSRV Compliance
Match the crate's rust-version (1.80, 1.85, or 1.88). Don't use newer std APIs than MSRV allows.

## Error Handling
- thiserror in libraries, anyhow in binaries
- No .unwrap()/.expect() in production library code; return Result<T, E>

## Test Data Rules
Never touch real user data. Use temp dirs in tests; fake external effects; never send real notifications, emails, or network calls to real services.`

  },
  {
    id: 'rust-development',
    name: 'Rust Development',
    category: 'language',
    desc: 'Cargo workspaces, crates.io publishing, MSRV compliance, error handling.',
    icon: '🦀',
    full: `# Rust Development Standards

You are a senior Rust developer focused on the Cybercore ecosystem and crates.io publishing.

## Scope
- Cargo workspace patterns and crate structure
- crates.io publishing and version management
- MSRV (Minimum Supported Rust Version) compliance
- Error handling patterns (thiserror, anyhow)
- Memory management and borrowing
- Async runtimes and concurrency

## Safety Rules (Non-Negotiable)
STOP AND REPORT before any of these:
- cargo publish without explicit user approval
- Raising MSRV without reporting why
- Using unsafe blocks without explicit user approval and a detailed safety comment
- .unwrap() and .expect() in production library code
- Dependencies on untagged git refs or local paths instead of crates.io versions

## MSRV Compliance
| Crate | MSRV | Edition |
|-------|------|---------|
| Most Cybercore crates | 1.80 | 2021 |
| Some newer crates | 1.85 | 2021/2024 |
| vdb-rs | 1.88 | 2024 |

## Error Handling
- Libraries: thiserror, Result<T, E> with ? propagation
- Binaries: anyhow, Result<T, E> with ? propagation
- Production code: No .unwrap()/.expect()`

  },
  {
    id: 'qt-cpp-desktop',
    name: 'Qt/C++ Desktop',
    category: 'language',
    desc: 'Qt6/C++, QML, Quickshell/Omarchy plugins, qmake6.',
    icon: '🖥️',
    full: `# Qt6/C++ Desktop Development

You are a senior Qt6/C++ developer specializing in desktop applications and Omarchy/Quickshell shell plugins.

## Scope
- Qt6/C++ applications with qmake6
- QML UI components and Quickshell/Omarchy plugins
- .pro files, .pri shared settings, qml.qrc, qmldir
- C++20 with RAII patterns
- QObject parent ownership and QML exposure

## Safety Rules (Non-Negotiable)
STOP AND REPORT before any of these:
- Editing ~/.config/hypr or ~/.config/omarchy (use the omarchy skill for those)
- Running omarchy-restart-shell or hyprctl reload/keyword
- Killing user's apps or changing the live desktop session
- Adding CMake to a qmake project

## Build System
Use qmake6 only — never add CMake to a qmake project.
qmake6 && make -j"$(nproc)"

## C++20 Patterns
- RAII for resource management
- QObject parent owns children — don't wrap those in unique_ptr
- Expose to QML with Q_PROPERTY/QML_ELEMENT/QML_SINGLETON
- Keep heavy work off UI thread (QtConcurrent, worker QThread)`

  },
  {
    id: 'android-development',
    name: 'Android Development',
    category: 'language',
    desc: 'Gradle, APK signing, Android CLI tooling.',
    icon: '📱',
    full: `# Android Development

You are an Android developer specializing in Gradle builds, APK signing, and CLI tooling.

## Scope
- Gradle build configuration and variants
- APK signing and release builds
- Android CLI tools (adb, sdkmanager, avdmanager)
- Environment variable management for Android builds
- Version code/name management

## Safety Rules (Non-Negotiable)
STOP AND REPORT before any of these:
- Publishing to F-Droid or Google Play without authorization
- Modifying signing keystores or release keys
- Never install to the user's phone without asking

## Key Capabilities
- Gradle build configuration and variants
- APK signing and release builds
- Android CLI tools (adb, sdkmanager, avdmanager)
- Version code/name management
- Environment variable management for Android builds`

  },
  {
    id: 'api-backend',
    name: 'API Backend',
    category: 'devops',
    desc: 'REST API design, JSON schemas, error handling.',
    icon: '☁️',
    full: `# API Backend Development

You are a backend developer specializing in REST API design, JSON schemas, and HTTP service patterns.

## Scope
- RESTful API design and endpoints
- JSON request/response schemas
- Error handling and status codes
- HTTP service patterns and middleware
- Authentication and authorization
- API versioning and deprecation

## Design Principles
1. RESTful design — Use HTTP methods correctly (GET, POST, PUT, PATCH, DELETE)
2. JSON-first — All request/response bodies use JSON
3. Stateless — Each request contains all information needed
4. Versioned — API version in URL or header
5. Self-describing — Error responses include enough info to debug

## Error Handling
| Status | Meaning | Use Case |
|--------|---------|----------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 204 | No Content | Successful, no body |
| 400 | Bad Request | Client error, validation |
| 401 | Unauthorized | Authentication required |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server error |

## Best Practices
- Use plural resource names (/users, /projects)
- Nest resources when appropriate (/users/123/projects)
- Return created resource in 201 response
- Use Location header for created resource URL`

  },
  {
    id: 'container-devops',
    name: 'Container & DevOps',
    category: 'devops',
    desc: 'Docker, GitHub Actions, CI/CD, Cloudflare Pages.',
    icon: '📦',
    full: `# Container & DevOps

You are a DevOps engineer specializing in containerization, CI/CD pipelines, and deployment automation.

## Scope
- Docker images and multi-stage builds
- GitHub Actions workflows
- CI/CD pipeline design and debugging
- Container registries and image tagging
- Deployment strategies and rollbacks
- Environment variable and secret management
- Cloudflare Pages deployment

## Safety Rules (Non-Negotiable)
STOP AND REPORT before any of these:
- git push --force or rewriting pushed history
- Cloudflare/Pages deploys by hand
- Modifying production CI/CD pipelines without authorization
- Changes to spend limits or billing configurations
- Cross-Region resource creation

## Docker Best Practices
- Use multi-stage builds to reduce image size
- Pin base image versions (don't use latest)
- Run as non-root user (USER directive)
- Use .dockerignore to exclude secrets and build artifacts

## GitHub Actions
- Use reusable workflows when possible
- Pin action versions (commit SHA or specific tag)
- Use permissions: to limit token scope

## Deployment Strategies
- Blue/green — Deploy alongside existing, switch traffic
- Canary — Deploy to subset, monitor, then roll out
- Rolling — Gradually replace instances
- Always have a rollback plan`
  }
];

const agents = [
  { id: 'opencode',     name: 'OpenCode',   dir: '~/.config/opencode/', script: 'setup-agent.sh' },
  { id: 'claude',       name: 'Claude',     dir: '~/.claude/',           script: 'setup-claude.sh' },
  { id: 'codex',        name: 'Codex',      dir: '~/.codex/',            script: 'setup-codex.sh' },
  { id: 'copilot',      name: 'Copilot',    dir: '~/.copilot/',          script: 'setup-copilot.sh' },
  { id: 'crush',        name: 'Crush',      dir: '~/.crush/',            script: 'setup-crush.sh' },
  { id: 'gemini',       name: 'Gemini',     dir: '~/.gemini/',           script: 'setup-gemini.sh' },
  { id: 'hermes',       name: 'Hermes',     dir: '~/.hermes/',           script: 'setup-hermes.sh' },
  { id: 'kimi-code',    name: 'Kimi-Code',  dir: '~/.kimi-code/',        script: 'setup-kimi-code.sh' },
  { id: 'openclaw',     name: 'OpenClaw',   dir: '~/.openclaw/',         script: 'setup-openclaw.sh' },
  { id: 'ollama',       name: 'Ollama',     dir: '~/.ollama/',           script: 'setup-ollama.sh' },
  { id: 'pi',           name: 'Pi',         dir: '~/.pi/',               script: 'setup-pi.sh' },
  { id: 'ori',          name: 'Ori',        dir: '~/.ori/',              script: 'setup-ori.sh' },
  { id: 'qwen',         name: 'Qwen',       dir: '~/.qwen/',             script: 'setup-qwen.sh' }
];

// Every agent ships every skill (verified against real repo contents).
const skillMatrix = {};
skills.forEach(s => { skillMatrix[s.id] = {}; agents.forEach(a => { skillMatrix[s.id][a.id] = true; }); });

const categoryLabels = {
  all: 'All Skills',
  web: 'Web & Frontend',
  system: 'System',
  language: 'Languages',
  devops: 'DevOps'
};

let activeFilter = 'all';
let favorites = new Set(JSON.parse(localStorage.getItem('cc-favs') || '[]'));
let searchQuery = '';
let activeDetail = null;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function init() {
  renderMatrix();
  renderAgents();
  renderDeploy();
  renderRules();
  animateStats();
  setupSearch();
  setupDeepLink();
  window.addEventListener('hashchange', setupDeepLink);
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      const nav = document.getElementById('mobileNav');
      if (nav) nav.style.display = 'none';
    }
  });
  document.addEventListener('cc:theme', e => {
    const { id, palette } = e.detail || {};
    if (id) {
      document.documentElement.dataset.theme = id;
      if (palette) {
        const root = document.documentElement;
        if (palette.acid_green) root.style.setProperty('--cc-neon-green', `#${palette.acid_green}`);
        if (palette.hot_pink) root.style.setProperty('--cc-neon-pink', `#${palette.hot_pink}`);
        if (palette.cyan) root.style.setProperty('--cc-neon-cyan', `#${palette.cyan}`);
        if (palette.purple) root.style.setProperty('--cc-neon-purple', `#${palette.purple}`);
        if (palette.bg) root.style.setProperty('--cc-bg', `#${palette.bg}`);
        if (palette.panel) root.style.setProperty('--cc-card', `#${palette.panel}`);
        if (palette.line) root.style.setProperty('--cc-border', `#${palette.line}`);
        if (palette.muted) root.style.setProperty('--cc-fg-muted', `#${palette.muted}`);
        if (palette.white) root.style.setProperty('--cc-fg', `#${palette.white}`);
      }
    }
  });
}

function animateStats() {
  const targets = {
    statAgents: agents.length,
    statSkills: skills.length,
    statFiles: agents.length * skills.length,
    statFavs: favorites.size
  };
  Object.entries(targets).forEach(([id, target]) => {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const steps = 20;
    const increment = target / steps;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      current += increment;
      el.textContent = Math.floor(current);
      if (step >= steps) { el.textContent = target; el.classList.remove('animating'); clearInterval(interval); }
    }, 20);
  });
}

function renderMatrix() {
  const tbody = document.getElementById('matrixBody');
  tbody.innerHTML = '';
  let rendered = 0;
  skills.forEach(skill => {
    if (activeFilter !== 'all' && skill.category !== activeFilter) return;
    if (activeFilter === 'favorites' && !favorites.has(skill.id)) return;
    const haystack = `${skill.name} ${skill.desc} ${skill.full}`.toLowerCase();
    if (searchQuery && !haystack.includes(searchQuery)) return;
    rendered++;
    const row = document.createElement('tr');
    row.dataset.id = skill.id;
    row.dataset.category = skill.category;
    row.className = 'skill-row';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Open ${skill.name} documentation`);
    row.onclick = () => openDetail('skill', skill.id);
    row.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetail('skill', skill.id); } };
    const isFavorite = favorites.has(skill.id);
    const skillHtml = '<div class="skill-cell"><span class="skill-icon">' + skill.icon + '</span><div class="skill-info"><div class="skill-name">' + escapeHtml(skill.name) + '</div><div class="skill-desc">' + escapeHtml(skill.desc) + '</div><div class="skill-cats"><span class="cat-chip">' + (categoryLabels[skill.category] || skill.category) + '</span></div></div><button class="favorite-btn ' + (isFavorite ? 'favorited' : '') + '" type="button" aria-label="' + (isFavorite ? 'Remove from' : 'Add to') + ' favorites" aria-pressed="' + isFavorite + '" onclick="event.stopPropagation(); toggleFavorite(\'' + skill.id + '\')">' + (isFavorite ? '★' : '☆') + '</button></div>';
    row.innerHTML = '<td>' + skillHtml + '</td>';
    agents.forEach(agent => {
      const td = document.createElement('td');
      td.className = 'status-cell';
      if (skillMatrix[skill.id][agent.id]) {
        td.className += ' is-installed';
        td.setAttribute('aria-label', 'Installed');
        td.innerHTML = '<span class="status-mark" aria-hidden="true">✓</span>';
      } else {
        td.textContent = '–';
        td.setAttribute('aria-label', 'Not installed');
      }
      row.appendChild(td);
    });
    const cmdCell = document.createElement('td');
    cmdCell.className = 'actions-cell';
    cmdCell.innerHTML = '<button class="copy-btn" aria-label="Choose an agent to install ' + escapeHtml(skill.name) + '" onclick="event.stopPropagation(); openInstallPicker(\'' + skill.id + '\')">Install</button>';
    row.appendChild(cmdCell);
    tbody.appendChild(row);
  });
  const empty = document.getElementById('matrixEmpty');
  if (empty) empty.remove();
  if (rendered === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="16"><div class="empty-state"><h3>No skills match</h3><p>Try a different filter or clear the search.</p></div></td>';
    tbody.appendChild(tr);
  }
}

function filterCategory(category, btn) {
  activeFilter = category;
  document.querySelectorAll('.filter-chip').forEach(c => { c.classList.remove('chip--active'); c.setAttribute('aria-pressed', 'false'); });
  btn.classList.add('chip--active'); btn.setAttribute('aria-pressed', 'true'); renderMatrix();
}

function setupSearch() {
  const input = document.getElementById('skillSearch');
  const wrap = document.getElementById('searchWrap');
  input.addEventListener('input', (e) => { searchQuery = e.target.value.trim().toLowerCase(); renderMatrix(); renderAgents(); renderDeploy(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.matches('input, textarea, [contenteditable=true]')) { e.preventDefault(); wrap.classList.add('open'); input.focus(); }
    if (e.key === 'Escape') { if (document.getElementById('detailPanel').classList.contains('open')) closeDetail(); else { input.value = ''; searchQuery = ''; renderMatrix(); renderAgents(); renderDeploy(); } }
  });
}

function setupDeepLink() {
  const hash = window.location.hash;
  if (hash.startsWith('#skill/')) { const skillId = hash.slice(7); openDetail('skill', skillId); }
  else if (hash.startsWith('#agent/')) { const agentId = hash.slice(7); openDetail('agent', agentId); }
  else if (hash === '') { closeDetail(); }
}

function openDetail(type, id) {
  if (type === 'skill') { const skill = skills.find(s => s.id === id); if (!skill) return; renderSkillDetail(skill); }
  else if (type === 'agent') { const agent = agents.find(a => a.id === id); if (!agent) return; renderAgentDetail(agent); }
  activeDetail = type + ':' + id;
  window.location.hash = type + '/' + id;
  const panel = document.getElementById('detailPanel');
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  panel.focus();
}

function closeDetail() {
  const panel = document.getElementById('detailPanel'); if (!panel) return;
  panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); activeDetail = null;
  if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
}

function renderSkillDetail(skill) {
  document.getElementById('detailTitle').textContent = skill.name;
  const main = document.getElementById('detailMain');
  const sidebar = document.getElementById('detailSidebar');

  main.innerHTML = '<h3>Overview</h3><p>' + escapeHtml(skill.desc) +
    '</p><h3>Category</h3><p><span class="cat-chip" style="margin-right:8px;">' +
    escapeHtml(skill.category) +
    '</span></p><h3>Availability</h3><p>This skill is available for all 13 supported agents. Choose one agent to generate a single-skill install command.</p><h3>Full Documentation</h3><pre>' +
    escapeMd(skill.full) + '</pre>';

  sidebar.innerHTML =
    '<h4>Skill ID</h4><p>' + escapeHtml(skill.id) +
    '</p><h4>Category</h4><p>' + escapeHtml(skill.category) +
    '</p><h4>Version</h4><p>2</p><h4>Install This Skill</h4>' +
    '<button class="copy-btn" onclick="openInstallPicker(\'' + skill.id +
    '\')">Choose Agent &amp; Copy Install Command</button>' +
    '<button class="copy-btn" style="margin-top:8px;" onclick="copyText(window.skillFullText)">Copy Full Documentation</button>';

  window.skillFullText = skill.full;
}

function renderAgentDetail(agent) {
  document.getElementById('detailTitle').textContent = agent.name;
  const main = document.getElementById('detailMain');
  const sidebar = document.getElementById('detailSidebar');
  const deployedSkills = skills.filter(s => skillMatrix[s.id][agent.id]);
  main.innerHTML = '<h3>Overview</h3><p>' + escapeHtml(agent.desc) + '</p><h3>Configuration Directory</h3><p><code>' + agent.dir + '</code></p><h3>Setup Script</h3><p><code>' + agent.script + '</code></p><h3>Deployed Skills (' + deployedSkills.length + ')</h3><div style="display:flex;flex-wrap:wrap;gap:6px;">' + deployedSkills.map(s => '<span class="skill-tag">' + s.name + '</span>').join('') + '</div>';
  sidebar.innerHTML = '<h4>Agent ID</h4><p>' + agent.id + '</p><h4>Home Directory</h4><p>' + agent.dir + '</p><h4>Setup Script</h4><button class="copy-btn" onclick="copyText(\'bash ~/Projects/ai/' + agent.id + '/agent-project-setup/' + agent.script + '\')">Copy Setup Command</button><button class="copy-btn" style="margin-top:8px;" onclick="copyText(\'~/Projects/ai/' + agent.id + '/\')">Copy Agent Directory</button>';
}

function toggleFavorite(skillId) {
  if (favorites.has(skillId)) favorites.delete(skillId); else favorites.add(skillId);
  try { localStorage.setItem('cc-favs', JSON.stringify([...favorites])); } catch (error) { console.warn('Favorites could not be saved in this browser.', error); }
  showToast(favorites.has(skillId) ? 'Added to favorites' : 'Removed from favorites'); renderMatrix();
  const stat = document.getElementById('statFavs'); if (stat) stat.textContent = favorites.size;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toastText');
  if (text) text.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function openInstallPicker(skillId) {
  const skill = skills.find(item => item.id === skillId);
  if (!skill) {
    showToast('Could not find that skill');
    return;
  }

  const existing = document.getElementById('skillInstallPicker');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'skillInstallPicker';
  overlay.setAttribute('role', 'presentation');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;' +
    'justify-content:center;padding:20px;background:rgba(0,0,0,.78);' +
    'backdrop-filter:blur(5px);';

  const agentButtons = agents.map(agent =>
    '<button type="button" data-agent-id="' + escapeHtml(agent.id) + '"' +
    ' style="display:flex;align-items:center;justify-content:space-between;' +
    'width:100%;padding:12px 14px;border:1px solid var(--cc-border);' +
    'border-radius:8px;background:var(--cc-card);color:var(--cc-fg);' +
    'cursor:pointer;text-align:left;font:inherit;">' +
    '<span>' + escapeHtml(agent.name) + '</span>' +
    '<span style="color:var(--cc-neon-cyan);font-size:12px;">Select &amp; copy ↗</span>' +
    '</button>'
  ).join('');

  overlay.innerHTML =
    '<section role="dialog" aria-modal="true" aria-labelledby="skillPickerTitle"' +
    ' style="width:min(440px,100%);max-height:85vh;overflow:auto;padding:22px;' +
    'border:1px solid var(--cc-border);border-radius:12px;' +
    'background:var(--cc-card);box-shadow:0 20px 70px rgba(0,0,0,.5);">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">' +
    '<h3 id="skillPickerTitle" style="margin:0;">Choose an agent</h3>' +
    '<button type="button" data-picker-close aria-label="Close"' +
    ' style="border:0;background:transparent;color:var(--cc-fg);font-size:22px;cursor:pointer;">×</button>' +
    '</div>' +
    '<p style="margin:10px 0 16px;color:var(--cc-fg-muted);font-size:13px;">' +
    'Choose one agent. The command will install only <strong>' +
    escapeHtml(skill.name) + '</strong> for that agent.</p>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
    agentButtons +
    '</div>' +
    '<p style="margin:14px 0 0;color:var(--cc-fg-muted);font-size:11px;">' +
    'Existing copies of this skill are backed up before replacement.</p>' +
    '</section>';

  const onKeyDown = event => {
    if (event.key === 'Escape') closePicker();
  };
  function closePicker() {
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
  }

  overlay.addEventListener('click', event => {
    if (event.target === overlay || event.target.closest('[data-picker-close]')) {
      closePicker();
      return;
    }

    const choice = event.target.closest('[data-agent-id]');
    if (!choice) return;

    const agent = agents.find(item => item.id === choice.dataset.agentId);
    if (!agent) return;

    const command = buildSingleSkillInstallCommand(skill, agent);
    navigator.clipboard.writeText(command).then(() => {
      showToast('Copied ' + skill.name + ' install command for ' + agent.name);
    }).catch(() => {
      showToast('Clipboard access failed. Check browser permissions.');
    });
    closePicker();
  });

  document.addEventListener('keydown', onKeyDown);
  document.body.appendChild(overlay);
}

function buildSingleSkillInstallCommand(skill, agent) {
  const skillDir = '.' + agent.id + '/skills/' + skill.id;
  const target = skillDir + '/SKILL.md';
  const sourceUrl =
    'https://raw.githubusercontent.com/cybercoretech/cybercore-agent-skills/' +
    'bcbe0fea4d9e0afb2f4d3ccafaff75cfb3023085/' +
    agent.id + '/agent-project-setup/.' + agent.id +
    '/skills/' + skill.id + '/SKILL.md';

  return [
    'set -eu',
    'skill_dir=' + "'" + skillDir + "'",
    'target="$skill_dir/SKILL.md"',
    'mkdir -p "$skill_dir"',
    'if [ -f "$target" ]; then',
    '  backup="$target.bak.$(date +%Y%m%d-%H%M%S)"',
    '  cp -p "$target" "$backup"',
    '  printf "Backed up existing skill to %s\\n" "$backup"',
    'fi',
    'tmp="$target.tmp.$$"',
    'trap \'rm -f "$tmp"\' EXIT',
    'curl -fsSL ' + "'" + sourceUrl + "'" + ' -o "$tmp"',
    'mv "$tmp" "$target"',
    'trap - EXIT',
    'printf "Installed ' + skill.id + ' for ' + agent.name + ' in %s\\n" "$target"'
  ].join('\n');
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard'));
}

function renderAgents() {
  const grid = document.getElementById('agentGrid'); grid.innerHTML = '';
  agents.filter(agent => !searchQuery || `${agent.name} ${agent.dir} ${agent.script}`.toLowerCase().includes(searchQuery)).forEach(agent => {
    const deployed = skills.filter(s => skillMatrix[s.id][agent.id]);
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = (e) => { if (!e.target.closest('.copy-btn')) openDetail('agent', agent.id); };
    const initial = agent.name.charAt(0).toUpperCase();
    card.innerHTML = '<div class="card-header"><span class="card-icon">' + initial + '</span><div><div class="card-name">' + escapeHtml(agent.name) + '</div><div class="card-subtitle">' + agent.dir + '</div></div></div><div class="card-stats"><div class="stat-item"><span class="value">' + deployed.length + '</span> skills</div><div class="stat-item"><span class="value">' + agent.script + '</span> script</div></div><div style="margin-top:auto;"><button class="btn btn--ghost btn--icon" onclick="event.stopPropagation(); copyText(\'bash ~/Projects/ai/' + agent.id + '/agent-project-setup/' + agent.script + '\')">Copy Command</button></div>';
    grid.appendChild(card);
  });
}

function renderDeploy() {
  const grid = document.getElementById('deployGrid'); grid.innerHTML = '';
  agents.filter(agent => !searchQuery || `${agent.name} ${agent.dir} ${agent.script}`.toLowerCase().includes(searchQuery)).forEach(agent => {
    const card = document.createElement('div');
    card.className = 'card';
    const initial = agent.name.charAt(0).toUpperCase();
    card.innerHTML = '<div class="card-header"><span class="card-icon">' + initial + '</span><div><div class="card-name">' + escapeHtml(agent.name) + '</div><div class="card-subtitle">' + agent.dir + '</div></div></div><pre style="margin:12px 0; font-size:12px;">bash ~/Projects/ai/' + agent.id + '/agent-project-setup/' + agent.script + '</pre><button class="btn btn--primary" style="width:100%;" onclick="event.stopPropagation(); copyText(\'bash ~/Projects/ai/' + agent.id + '/agent-project-setup/' + agent.script + '\')">Copy Command</button>';
    grid.appendChild(card);
  });
}

function renderRules() {
  const grid = document.getElementById('rulesGrid');
  grid.innerHTML = '';
  const rules = [
    {
      title: 'Zero Unapproved Actions',
      items: [
        'Never edit code, overwrite files, or run state-modifying commands without presenting a plan and obtaining explicit user confirmation.',
        'Always show the diff and intent before editing any file.',
        'Never make changes silently or "just to try something."'
      ]
    },
    {
      title: 'No Rogue Bug-Fixing Loops',
      items: [
        'If a build fails or a test errors out, STOP immediately.',
        'Explain the error directly to the user.',
        'Do not attempt recursive auto-fix attempts without permission.'
      ]
    },
    {
      title: 'Preserve Existing Architecture',
      items: [
        'Do not rewrite whole functions or refactor files unless explicitly instructed.',
        'Do not change library dependencies or public API signatures without request.',
        'Make the minimal change required to fulfill the user\'s explicit request.'
      ]
    }
  ];
  rules.forEach(rule => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<h3 style="font-family:var(--cc-font-mono);font-size:15px;color:var(--cc-neon-purple);margin-bottom:8px;">' + escapeHtml(rule.title) + '</h3><ul style="color:var(--cc-fg-muted);font-size:13px;line-height:1.7;padding-left:18px;">' + rule.items.map(i => '<li>' + escapeHtml(i) + '</li>').join('') + '</ul>';
    grid.appendChild(card);
  });
}

window.escapeHtml = escapeHtml;
function escapeMd(text) { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
window.escapeMd = escapeMd;

function toggleMobileNav() {
  const nav = document.getElementById('mobileNav'), button = document.getElementById('mobileMenuBtn');
  const isOpen = nav.classList.toggle('open'); button.setAttribute('aria-expanded', String(isOpen));
}
function toggleSearch() {
  const wrap = document.getElementById('searchWrap'), input = document.getElementById('skillSearch');
  wrap.classList.toggle('open'); if (wrap.classList.contains('open')) input.focus();
}

document.addEventListener('click', event => {
  const panel = document.getElementById('detailPanel'); if (event.target === panel) closeDetail();
  if (event.target.closest('.mobile-nav a')) toggleMobileNav();
});
init();
