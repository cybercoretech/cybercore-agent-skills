---
name: offline-first-privacy-auditor
description: Scan dependencies and source code to guarantee zero outbound network calls, analytics, or hidden telemetry. Use when asked to "audit telemetry", "remove analytics", "offline-first audit", "zero telemetry", "find phone-home calls", "privacy audit", "block outbound network", "dependency tracking scan", "GDPR source audit", "air-gap compatibility", or "disable telemetry in dependencies". Not for vulnerability audits (use security-audit).
metadata:
  version: '1'
---
# Offline-First & Zero-Telemetry Privacy Auditor

Scans dependencies and source code to guarantee zero outbound network calls, analytics,
or hidden telemetry — so the program works fully offline and makes no unannounced
contact with external hosts.

> [!IMPORTANT]
> Telemetry is **opt-out by default** in the majority of modern toolchains, frameworks,
> and runtime platforms. Assume it is present until proven absent. The burden of proof
> is on the audit, not on the dependency maintainer's README.

---

## Steps

### 1. Define the threat model

Before scanning anything, record what "zero telemetry" means for this specific project.
Different contexts have different requirements; the audit scope follows from the threat model.

#### Threat model questions

| Question | Why it matters |
|---|---|
| **Air-gap required?** | Air-gapped environments need build-time and runtime network isolation, not just opt-out flags |
| **User data scope** | PII only, or all external contact including crash reports and version checks? |
| **Dependency depth** | Direct deps only, or the full transitive tree? |
| **Runtime or build-time** | Telemetry in build tools (bundlers, compilers) vs. shipped binary/library |
| **Platform** | Web (browser), native desktop, mobile, CLI, server — different egress surfaces |
| **Regulatory context** | GDPR, HIPAA, CCPA, FedRAMP — may impose specific requirements beyond preference |

#### Telemetry taxonomy

Name the categories being audited. Every finding is tagged to one of these:

| Tag | Description | Examples |
|---|---|---|
| `analytics` | Usage and behaviour tracking | Mixpanel, Amplitude, Segment, Google Analytics |
| `crash` | Error / crash reporting | Sentry, Bugsnag, Crashlytics, Rollbar |
| `version-check` | Phoning home to check for updates | npm `update-notifier`, Homebrew, VS Code extensions |
| `telemetry` | Generic metrics collection | OpenTelemetry exporters to external endpoints, Datadog agent |
| `fingerprint` | Hardware/software fingerprinting | Machine IDs, font enumeration, canvas fingerprinting |
| `cdn-fetch` | Runtime asset fetch from external CDN | Google Fonts, unpkg, jsDelivr, cdnjs |
| `beacon` | Navigation/unload network pings | `navigator.sendBeacon`, `<img src="...">` pixel |
| `license-check` | License validation phone-home | Electron Builder, commercial SDKs |
| `feature-flag` | Remote feature flag evaluation | LaunchDarkly, Statsig, Flagsmith (cloud-hosted) |
| `implicit` | Indirect: dependency fetching at runtime | pip install at startup, dynamic `require()` from URL |

**Completion criterion:** threat model is recorded with all six questions answered and the
set of applicable telemetry tags chosen. The audit scope (depth, platform, regulatory
context) is written down before any scanning begins.

---

### 2. Scan dependencies for known telemetry

#### npm / Node.js

```bash
# List all production deps (no devDeps — they don't ship)
npm ls --prod --depth=Infinity 2>/dev/null | tee /tmp/dep-tree.txt

# Known telemetry packages — search the full tree
TELEMETRY_PKGS=(
  "update-notifier"       # version-check; phone-home on CLI startup
  "node-ipc"              # backdoored (CVE-2022-23812); historical reference
  "@amplitude/analytics-node"
  "mixpanel"
  "@segment/analytics-node"
  "@sentry/node" "@sentry/browser" "@sentry/react"
  "bugsnag" "@bugsnag/js"
  "rollbar"
  "heap"
  "fullstory"
  "hotjar"
  "logrocket"
  "datadog-rum"
  "newrelic"
  "elastic-apm-node"
  "posthog-js" "posthog-node"
  "rudderstack"
  "@launchdarkly/node-server-sdk" "launchdarkly-js-client-sdk"
  "statsig-js" "statsig-node"
  "opentelemetry-sdk-node"   # benign alone; check configured exporters
)

for pkg in "${TELEMETRY_PKGS[@]}"; do
  if npm ls --prod --depth=Infinity 2>/dev/null | grep -q "$pkg"; then
    echo "FOUND: $pkg"
  fi
done

# Check package.json scripts for phone-home patterns
grep -rE "(postinstall|prepare|preinstall)" package.json package-lock.json \
  | grep -v "^$"

# Inspect node_modules for outbound URLs in JS (broad sweep)
grep -rE "https?://[a-zA-Z0-9._/-]+" node_modules/.pnpm \
  node_modules/*/dist node_modules/*/lib \
  --include="*.js" -l 2>/dev/null | head -40
```

#### Rust / Cargo

```bash
# Full dependency tree
cargo tree --edges normal 2>/dev/null | tee /tmp/cargo-tree.txt

# Known telemetry / phone-home crates
TELEMETRY_CRATES=(
  "sentry"           # crash reporting
  "rollbar"
  "opentelemetry-otlp"   # check configured endpoint
  "amplitude"
  "rudderstack"
  "segment"
  "update-informer"  # version-check phone-home
  "self_update"      # fetches GitHub releases at runtime
  "reqwest"          # HTTP client — not telemetry itself; check callers
  "ureq"             # same
)

for crate in "${TELEMETRY_CRATES[@]}"; do
  if cargo tree 2>/dev/null | grep -q "^$crate\b\|[ └─├]$crate "; then
    echo "FOUND: $crate"
  fi
done

# Grep source for outbound URL patterns
grep -rE \
  "(https?://[a-zA-Z0-9._/-]+\.(com|io|net|dev|app))" \
  src/ --include="*.rs" | grep -v "//\s" | grep -v "^\s*//"
```

#### Python / pip

```bash
# Full installed packages
pip list --format=freeze | tee /tmp/pip-freeze.txt

TELEMETRY_PKGS_PY=(
  "sentry-sdk"
  "rollbar"
  "bugsnag"
  "opentelemetry-exporter-otlp"
  "ddtrace"           # Datadog
  "newrelic"
  "elastic-apm"
  "posthog"
  "mixpanel"
  "amplitude-analytics"
  "segment-analytics-python"
  "rudder-sdk-python"
  "statsig"
  "launchdarkly-server-sdk"
)

for pkg in "${TELEMETRY_PKGS_PY[@]}"; do
  if pip show "$pkg" 2>/dev/null | grep -q "Name:"; then
    echo "FOUND: $pkg"
  fi
done

# Check setup.py / pyproject.toml for post-install scripts
grep -rE "(cmdclass|post_install|install_requires)" setup.py pyproject.toml 2>/dev/null
```

#### Go / Go modules

```bash
go list -m all 2>/dev/null | tee /tmp/go-modules.txt

TELEMETRY_MODS_GO=(
  "github.com/getsentry/sentry-go"
  "go.opentelemetry.io/otel/exporters/otlp"
  "github.com/newrelic/go-agent"
  "github.com/DataDog/dd-trace-go"
  "github.com/posthog/posthog-go"
  "github.com/launchdarkly/go-server-sdk"
)

for mod in "${TELEMETRY_MODS_GO[@]}"; do
  if go list -m all 2>/dev/null | grep -q "$mod"; then
    echo "FOUND: $mod"
  fi
done
```

**Completion criterion:** every ecosystem in the project has been scanned. All findings
are recorded as a table: `package | tag | version | transitive? | opt-outable?`.
No "probably fine" assessments — every hit is confirmed or cleared.

---

### 3. Scan source code for outbound network patterns

Dependency scanning misses hardcoded calls, dynamic URLs, and conditional telemetry that
only fires in certain environments. Source scanning is non-optional.

#### Universal pattern grep

```bash
# Run from project root. Adjust --include patterns for your languages.
SCAN_DIR="${1:-.}"

echo "=== Outbound URL patterns ==="
grep -rEn \
  "(https?://[a-zA-Z0-9._-]+\.(com|io|net|dev|app|co)[a-zA-Z0-9/_?=-]*)" \
  "$SCAN_DIR" \
  --include="*.rs" --include="*.py" --include="*.go" \
  --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" \
  --include="*.toml" --include="*.json" --include="*.yaml" --include="*.yml" \
  | grep -vE "(test|spec|fixture|mock|example|docs?/|\.md:|LICENSE)" \
  | grep -vE "^Binary"

echo "=== Known analytics hostnames ==="
ANALYTICS_HOSTS=(
  "analytics.google.com" "www.google-analytics.com" "ssl.google-analytics.com"
  "api.segment.io" "cdn.segment.com" "api.segment.com"
  "api2.amplitude.com" "api.amplitude.com"
  "api.mixpanel.com" "cdn.mxpnl.com"
  "ingest.sentry.io" "o[0-9]+.ingest.sentry.io"
  "api.rollbar.com"
  "app.bugsnag.com" "notify.bugsnag.com"
  "api.posthog.com" "app.posthog.com" "eu.posthog.com"
  "api.rudderstack.com"
  "featuregates.org"                    # Statsig
  "app.launchdarkly.com" "stream.launchdarkly.com"
  "telemetry.nextjs.org"
  "telemetry.blender.org"
  "code.visualstudio.com"               # VS Code extension telemetry
  "bam.nr-data.net"                     # New Relic browser
  "js-agent.newrelic.com"
  "www.googletagmanager.com" "googletagmanager.com"
  "hotjar.com" "static.hotjar.com"
  "logrocket.com"
  "fullstory.com"
  "cdn.heapanalytics.com"
  "cdn.lr-ingest.com"
  "collector.github.com"                # GitHub telemetry
  "telemetry.mozilla.org"
  "incoming.telemetry.mozilla.org"
  "ping.archlinux.org"
  "registry.npmjs.org"                  # runtime fetches only (not build-time)
  "pypi.org"                            # same
  "crates.io"                           # same
  "update.googleapis.com"
  "clients2.google.com"
)

for host in "${ANALYTICS_HOSTS[@]}"; do
  results=$(grep -rEn "$host" "$SCAN_DIR" \
    --include="*.rs" --include="*.py" --include="*.go" \
    --include="*.ts" --include="*.js" --include="*.toml" \
    --include="*.json" --include="*.yaml" 2>/dev/null \
    | grep -v "test\|spec\|mock\|example\|\.md:")
  if [ -n "$results" ]; then
    echo "FOUND [$host]:"
    echo "$results"
    echo "---"
  fi
done

echo "=== Network API surface ==="
# Language-specific: flag every outbound network call site
grep -rEn \
  "(fetch\(|axios\.|http\.get|http\.post|urllib\.request|requests\.(get|post|put)|reqwest::|ureq::|hyper::|TcpStream::connect|net\.Dial|http\.Get|http\.Post|curl_easy_perform|WebClient\.|HttpClient\.)" \
  "$SCAN_DIR" \
  --include="*.rs" --include="*.py" --include="*.go" \
  --include="*.ts" --include="*.js" --include="*.tsx" \
  | grep -vE "(test|spec|mock|//)"

echo "=== Environment-conditioned telemetry ==="
# Telemetry that activates unless an env var is set
grep -rEn \
  "(TELEMETRY|ANALYTICS|DO_NOT_TRACK|SENTRY_DSN|DD_AGENT|NEW_RELIC|OTEL_EXPORTER|DISABLE_TELEMETRY|OPT.?OUT|NO_ANALYTICS)" \
  "$SCAN_DIR" \
  --include="*.rs" --include="*.py" --include="*.go" \
  --include="*.ts" --include="*.js" --include="*.toml" \
  --include="*.env*" --include="*.yaml"
```

#### Framework-specific telemetry locations

| Framework / Tool | Telemetry mechanism | How to find |
|---|---|---|
| **Next.js** | `next/dist/telemetry/` — opt-out via `NEXT_TELEMETRY_DISABLED=1` | `grep -r "telemetry" node_modules/next/dist --include="*.js" -l` |
| **Angular CLI** | `ng analytics off` or `NG_CLI_ANALYTICS=false` | `grep -r "analytics" node_modules/@angular/cli --include="*.js" -l` |
| **Gatsby** | `gatsby telemetry --disable` or `GATSBY_TELEMETRY_DISABLED=1` | `grep -r "telemetry" node_modules/gatsby/dist -l` |
| **Nuxt** | `NUXT_TELEMETRY_DISABLED=1` | `grep -r "telemetry" node_modules/nuxt -l` |
| **Vite** | No built-in telemetry | Confirm via source |
| **Rust `cargo`** | No telemetry | — |
| **Rustup** | No telemetry | — |
| **.NET SDK** | `DOTNET_CLI_TELEMETRY_OPTOUT=1` | `dotnet --info` shows telemetry status |
| **Go toolchain** | No telemetry in `go` itself; check third-party tools | — |
| **pip / uv** | No telemetry | — |
| **Homebrew** | `HOMEBREW_NO_ANALYTICS=1` | `brew analytics state` |
| **VS Code extensions** | `telemetry.telemetryLevel: "off"` in settings | Extension `package.json` for `enableTelemetry` |
| **Electron apps** | Per-app; check `app.on('ready')` and `autoUpdater` | Grep for `autoUpdater` and `update-electron-app` |
| **Tauri** | No built-in telemetry | Confirm via source; check `tauri-updater` config |

**Completion criterion:** every file flagged by the grep suite is manually reviewed and
classified as `safe` (false positive), `telemetry-confirmed`, or `needs-removal`.
No grep hit is dismissed without reading the calling code.

---

### 4. Runtime network interception test

Source scanning finds static calls. Runtime interception catches dynamic, lazy-loaded,
and conditional telemetry that only fires during execution.

#### Method A — `strace` / `ltrace` (Linux, CLI tools)

```bash
# Intercept all network syscalls during a run
strace -e trace=network -f -o /tmp/strace-net.log \
  ./target/release/myapp --some-flag 2>/dev/null

# Extract unique destinations
grep -oE "sin_addr=inet_addr\(\"[^\"]+\"\)" /tmp/strace-net.log | sort -u
grep -oE "connect\([0-9]+, \{[^}]+\}" /tmp/strace-net.log | sort -u
```

#### Method B — `ss` + `conntrack` live monitoring

```bash
# In a separate terminal, watch for new outbound connections while the app runs
watch -n 0.5 'ss -tunp | grep myapp'

# Capture new connections in real time
conntrack -E --event-mask NEW 2>/dev/null | grep -v "127.0.0.1\|::1"
```

#### Method C — network namespace isolation (definitive)

```bash
# Run the app in a network namespace with no external routes
# Any network call either hangs (blocked) or errors — both are findings

# Create isolated namespace
ip netns add audit-ns
ip netns exec audit-ns ip link set lo up     # loopback only

# Run app inside namespace — all external calls fail
ip netns exec audit-ns ./target/release/myapp --some-flag
# OR for processes needing more setup:
ip netns exec audit-ns unshare --net --pid --fork \
  ./target/release/myapp --some-flag

# Clean up
ip netns del audit-ns
```

#### Method D — `mitmproxy` / local DNS sinkhole (GUI apps / browsers)

```bash
# Start mitmproxy as a transparent proxy
mitmproxy --mode transparent --showhost -p 8080

# Route the app through it (or system-wide):
http_proxy=http://127.0.0.1:8080 https_proxy=http://127.0.0.1:8080 \
  ./myapp --some-flag

# Inspect the mitmproxy console for every outbound request
# Every hit that isn't a user-initiated action is a finding
```

#### Method E — `nftables` outbound drop + logging (definitive, production-safe)

```bash
# Add a logging + drop rule for all outbound from the app's UID
APP_UID=$(id -u myapp_user)

nft add rule inet filter output \
  meta skuid $APP_UID \
  log prefix "TELEMETRY-AUDIT: " \
  drop

# Run the app and watch the kernel log
journalctl -k -f | grep "TELEMETRY-AUDIT"

# Remove rule when done
nft delete rule inet filter output handle $(
  nft -a list chain inet filter output | grep "TELEMETRY-AUDIT" | awk '{print $NF}'
)
```

**Completion criterion:** the app completes a full normal-use session under Method C
(network namespace isolation) without crashing on network errors. Any connection attempt
to a non-loopback address during that session is a confirmed finding.

---

### 5. Enumerate and neutralize telemetry

For each confirmed finding from §2–§4, apply the appropriate neutralization in priority order.

#### Neutralization priority order

```
1. Remove the dependency entirely           ← zero residue; best outcome
2. Replace with a telemetry-free alternative
3. Disable via official opt-out mechanism   ← still ships the code; acceptable for build tools
4. Patch / fork the dependency              ← last resort; creates maintenance burden
5. Block at network layer                   ← defense-in-depth only; never sole control
```

#### Official opt-out mechanisms — environment variables

Set these unconditionally in your project's environment (`.env`, `environment.d/`, CI secrets, Dockerfile `ENV`):

```bash
# Telemetry opt-outs — set all that apply
NEXT_TELEMETRY_DISABLED=1
GATSBY_TELEMETRY_DISABLED=1
NUXT_TELEMETRY_DISABLED=1
NG_CLI_ANALYTICS=false
DOTNET_CLI_TELEMETRY_OPTOUT=1
HOMEBREW_NO_ANALYTICS=1
HOMEBREW_NO_AUTO_UPDATE=1
TAURI_SKIP_DEVSERVER_CHECK=true
DO_NOT_TRACK=1                 # Honorable, not universal; include anyway
OTEL_SDK_DISABLED=true         # OpenTelemetry SDK global disable
SENTRY_DSN=                    # Empty DSN → Sentry SDK is a no-op
DD_AGENT_HOST=                 # Empty → Datadog agent disabled
NEW_RELIC_ENABLED=false
DISABLE_OPENCOLLECTIVE=1       # Suppresses donation prompts with network calls
ADBLOCK=true                   # Some tools respect this
NO_UPDATE_NOTIFIER=1           # update-notifier (npm)
```

#### Removing `update-notifier` (npm)

```javascript
// If you cannot remove the dependency, patch the check at app entry:
process.env.NO_UPDATE_NOTIFIER = '1';
// Place before any require() / import that might trigger the check
```

#### Disabling Sentry when DSN is absent

```javascript
// Sentry is a no-op when DSN is undefined — but verify the import still runs
import * as Sentry from "@sentry/browser";
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "",  // empty string = no-op
  enabled: Boolean(process.env.SENTRY_DSN),
});
```

#### Removing auto-update / version-check in Rust

```rust
// self_update crate — gate behind a compile-time feature flag, never default
#[cfg(feature = "auto-update")]
fn check_update() { ... }

// Or gate behind an explicit opt-in env var — never check by default
fn maybe_check_update() {
    if std::env::var("MYAPP_CHECK_UPDATES").as_deref() == Ok("1") {
        do_update_check();
    }
}
```

#### Patching a dependency with `patch` (Cargo)

```toml
# Cargo.toml — replace a telemetry-containing crate with a local fork
[patch.crates-io]
sentry = { path = "../sentry-stripped" }
```

#### `npm overrides` (package.json)

```json
{
  "overrides": {
    "update-notifier": "npm:noop-package@1.0.0"
  }
}
```

**Completion criterion:** every confirmed finding has a resolution. The resolution tier
(removal / replacement / opt-out / patch / network-block) is recorded for each. No finding
remains open with only a network-block as the sole control.

---

### 6. Audit CDN and external asset fetches

Runtime CDN fetches are telemetry by another name — the CDN operator logs your users'
IPs, user-agents, and request timing even if no analytics SDK is present.

#### Web / frontend — scan HTML, CSS, JS

```bash
# External script/style/font sources
grep -rEn \
  "(src|href|url)\s*=\s*[\"']https?://" \
  src/ public/ dist/ static/ \
  --include="*.html" --include="*.htm" \
  --include="*.css" --include="*.scss" \
  --include="*.ts" --include="*.tsx" \
  --include="*.js" --include="*.jsx"

# Google Fonts (most common CDN privacy issue)
grep -rEn "fonts\.googleapis\.com\|fonts\.gstatic\.com" \
  src/ public/ --include="*.css" --include="*.html" --include="*.ts"

# Other common external asset CDNs
grep -rEn \
  "(unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|cdn\.skypack\.dev|esm\.sh|esm\.run)" \
  src/ public/ --include="*.html" --include="*.ts" --include="*.js"
```

#### Remediation — self-host everything

| CDN resource | Self-hosting method |
|---|---|
| Google Fonts | Download with `google-webfonts-helper`; serve from `/fonts/` |
| npm CDN scripts | Bundle with Vite/esbuild/rollup; no runtime CDN fetch |
| External CSS frameworks | Install as npm package; import at build time |
| Favicon / OG images | Serve from own origin |
| Analytics pixels `<img>` | Remove entirely |
| External video embeds | Use privacy-enhanced mode (YouTube `youtube-nocookie.com`) or self-host |

#### CSP as a telemetry fence

A strict Content Security Policy is both a security control and a telemetry declaration:

```
# HTTP header — locks down all outbound to known safe origins
Content-Security-Policy:
  default-src 'self';
  script-src  'self' 'nonce-{SERVER_GENERATED}';
  style-src   'self' 'nonce-{SERVER_GENERATED}';
  font-src    'self';
  img-src     'self' data:;
  connect-src 'self';
  frame-src   'none';
  object-src  'none';
  base-uri    'self';
  form-action 'self';
  upgrade-insecure-requests;
```

> [!NOTE]
> A CSP `report-uri` or `report-to` directive sends violation reports to an external
> endpoint. If using reporting, point it to a self-hosted endpoint (`report-uri /csp-report`)
> not to a third-party service like `report-uri.com` — that itself is telemetry.

**Completion criterion:** `grep -rE "https?://" dist/ public/` returns only self-hosted
origins or explicitly approved third parties (documented in the threat model). CSP is
present and blocks `connect-src` to unknown origins.

---

### 7. Harden the build pipeline

Telemetry in build tools leaks project structure, file counts, build times, and dependency
lists to tool vendors — even if the shipped binary is clean.

#### Build tool opt-outs

```bash
# .env or CI environment — apply before any build command
NEXT_TELEMETRY_DISABLED=1
GATSBY_TELEMETRY_DISABLED=1
NG_CLI_ANALYTICS=false
NUXT_TELEMETRY_DISABLED=1
DOTNET_CLI_TELEMETRY_OPTOUT=1
HOMEBREW_NO_ANALYTICS=1
CARGO_TERM_QUIET=false       # not telemetry; keep verbose for audit
TURBO_TELEMETRY_DISABLED=1   # Turborepo
NX_DAEMON=false              # Nx — disable daemon that phones home
NX_CLOUD=false               # Nx Cloud (remote caching) — disable
```

#### Dockerfile — no telemetry in container builds

```dockerfile
# Dockerfile
ENV NEXT_TELEMETRY_DISABLED=1 \
    GATSBY_TELEMETRY_DISABLED=1 \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DO_NOT_TRACK=1 \
    NO_UPDATE_NOTIFIER=1 \
    DISABLE_OPENCOLLECTIVE=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# Offline npm install (uses only local cache; no registry calls at build)
# COPY package.json package-lock.json ./
# RUN npm ci --prefer-offline
```

#### CI/CD — GitHub Actions / GitLab CI

```yaml
# GitHub Actions — set env at workflow level
env:
  NEXT_TELEMETRY_DISABLED: "1"
  DOTNET_CLI_TELEMETRY_OPTOUT: "1"
  HOMEBREW_NO_ANALYTICS: "1"
  TURBO_TELEMETRY_DISABLED: "1"
  DO_NOT_TRACK: "1"
  NO_UPDATE_NOTIFIER: "1"

# GitLab CI — set in .gitlab-ci.yml variables block
variables:
  NEXT_TELEMETRY_DISABLED: "1"
  DOTNET_CLI_TELEMETRY_OPTOUT: "1"
  DO_NOT_TRACK: "1"
```

#### Lock dependency fetching to known-good snapshots

```bash
# npm — use lockfile and prefer-offline
npm ci --prefer-offline

# pip — use a local index or hash-pinned requirements
pip install --no-index --find-links=/local/wheels -r requirements.txt
# OR with pip-compile hash pinning:
pip-sync --pip-args="--no-index" requirements.txt

# Cargo — vendor all dependencies (no network at build time)
cargo vendor
# Then in .cargo/config.toml:
# [source.crates-io]
# replace-with = "vendored-sources"
# [source.vendored-sources]
# directory = "vendor"

# Go — use module proxy or vendor
GOFLAGS=-mod=vendor go build ./...
# or: GOPROXY=off go build ./...  ← fails fast if deps not in module cache
```

**Completion criterion:** a CI run with network access revoked after the dependency
install phase completes successfully (`npm ci --prefer-offline` or equivalent). Build
tool opt-out env vars are set in the CI configuration file (not just locally).

---

### 8. Produce the audit report and enforcement policy

#### Audit report structure

```markdown
# Zero-Telemetry Audit Report
Date: YYYY-MM-DD
Project: <name>
Auditor: <name or agent>
Scope: <threat model summary from §1>

## Findings

| # | Location | Tag | Severity | Status | Resolution |
|---|---|---|---|---|---|
| 1 | `node_modules/update-notifier` | version-check | Medium | Resolved | Removed |
| 2 | `src/analytics.ts:14` | analytics | High | Resolved | File deleted |
| 3 | `public/index.html` fonts.googleapis.com | cdn-fetch | Medium | Resolved | Self-hosted |
| 4 | `NEXT_TELEMETRY_DISABLED` missing in CI | telemetry | Low | Resolved | Added to workflow |

## Severity scale
- High:   Ships to users; exfiltrates data without consent
- Medium: Ships to users; non-PII but unexpected contact
- Low:    Build-time only; no user impact

## Cleared (false positives)
| Location | Why cleared |
|---|---|
| `src/api-client.ts` | User-initiated HTTP calls to own backend |

## Enforcement
- Dependency scan runs in CI on every PR (see §8 policy below)
- env opt-outs committed to `.env.build` and Dockerfile
- CSP blocks unknown connect-src
- Cargo vendor / npm --prefer-offline enforced in CI
```

#### Enforcement: CI dependency scan gate

```yaml
# .github/workflows/privacy-audit.yml
name: Privacy Audit

on: [push, pull_request]

jobs:
  telemetry-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan for known telemetry packages (npm)
        run: |
          FOUND=0
          BLOCKLIST="update-notifier @sentry/node mixpanel amplitude segment posthog"
          for pkg in $BLOCKLIST; do
            if npm ls --prod --depth=Infinity 2>/dev/null | grep -q "$pkg"; then
              echo "BLOCKED: $pkg found in production deps"
              FOUND=1
            fi
          done
          exit $FOUND

      - name: Scan source for analytics hostnames
        run: |
          FOUND=0
          HOSTS="analytics.google.com api.segment.io api2.amplitude.com ingest.sentry.io"
          for host in $HOSTS; do
            if grep -rE "$host" src/ --include="*.ts" --include="*.js" --include="*.rs" \
                 --include="*.py" --include="*.go" 2>/dev/null \
                 | grep -qv "test\|spec\|mock"; then
              echo "BLOCKED: $host found in source"
              FOUND=1
            fi
          done
          exit $FOUND

      - name: Verify telemetry opt-out env vars present
        run: |
          grep -q "NEXT_TELEMETRY_DISABLED" .env.build Dockerfile 2>/dev/null \
            || (echo "MISSING: NEXT_TELEMETRY_DISABLED not set in build env" && exit 1)
```

#### Ongoing policy

| Control | Owner | Frequency |
|---|---|---|
| Dependency blocklist scan | CI gate | Every PR |
| Source grep for analytics hosts | CI gate | Every PR |
| Runtime network isolation test | Developer | Every major version |
| CDN fetch audit | Developer | Every major version |
| Opt-out env var audit | Developer | Quarterly |
| New dependency vetting | Reviewer | Before merging any new dep |

**Completion criterion:** the audit report is written, all findings are resolved or
documented as accepted risk with justification, the CI gate is active and blocking,
and the ongoing policy table has named owners and frequencies.

---

## Reference

### Complete telemetry opt-out environment variable list

```bash
# JavaScript / Node.js ecosystem
NEXT_TELEMETRY_DISABLED=1
GATSBY_TELEMETRY_DISABLED=1
NUXT_TELEMETRY_DISABLED=1
NG_CLI_ANALYTICS=false
TURBO_TELEMETRY_DISABLED=1
NX_DAEMON=false
NX_CLOUD=false
CREATE_REACT_APP_TELEMETRY=0      # older CRA
NO_UPDATE_NOTIFIER=1
NPM_CONFIG_UPDATE_NOTIFIER=false
DISABLE_OPENCOLLECTIVE=1
YARN_ENABLE_TELEMETRY=0           # Yarn Berry
PNPM_TELEMETRY=0                  # pnpm (future)

# .NET / C#
DOTNET_CLI_TELEMETRY_OPTOUT=1
DOTNET_UPGRADEASSISTANT_TELEMETRY_OPTOUT=1

# Python
# (pip, uv, rye have no telemetry; check tool-specific docs)

# macOS tooling
HOMEBREW_NO_ANALYTICS=1
HOMEBREW_NO_AUTO_UPDATE=1

# General / cross-platform
DO_NOT_TRACK=1                    # https://consoledonottrack.com/
OTEL_SDK_DISABLED=true
SENTRY_DSN=
DD_AGENT_HOST=
NEW_RELIC_ENABLED=false
ELASTIC_APM_ACTIVE=false

# CI / platform specific
GITHUB_ACTIONS_RUNNER_ALLOW_RUNASROOT=0   # unrelated; example of platform var
VERCEL_TELEMETRY_DISABLED=1
```

### Telemetry-free alternatives

| Telemetry dependency | Drop-in alternative | Notes |
|---|---|---|
| Sentry (crash) | Self-hosted Sentry, Glitchtip | Same SDK; different endpoint |
| Datadog APM | OpenTelemetry → self-hosted Jaeger/Tempo | Vendor-neutral |
| Google Analytics | Self-hosted Plausible, Matomo, Umami | GDPR-compliant |
| LaunchDarkly | Flagsmith (self-hosted), Unleash | Full feature parity |
| Hotjar / FullStory | None — remove; justify if re-adding | No self-hosted equivalent |
| Mixpanel / Amplitude | PostHog (self-hosted) | Product analytics |
| `update-notifier` | Remove; add `--check-updates` flag | Explicit, never implicit |
| New Relic browser | OpenTelemetry JS → self-hosted Tempo | W3C Trace Context |
| Google Fonts CDN | `google-webfonts-helper` + self-host | Zero CDN leakage |

### DNS sinkhole for rapid testing

Block all telemetry hosts locally during development:

```
# /etc/hosts — add to sink known analytics domains
0.0.0.0 analytics.google.com
0.0.0.0 www.google-analytics.com
0.0.0.0 api.segment.io
0.0.0.0 api2.amplitude.com
0.0.0.0 api.mixpanel.com
0.0.0.0 ingest.sentry.io
0.0.0.0 app.posthog.com
0.0.0.0 api.rollbar.com
0.0.0.0 app.bugsnag.com
0.0.0.0 bam.nr-data.net
0.0.0.0 js-agent.newrelic.com
0.0.0.0 www.googletagmanager.com
0.0.0.0 static.hotjar.com
0.0.0.0 cdn.heapanalytics.com
0.0.0.0 featuregates.org
0.0.0.0 stream.launchdarkly.com
0.0.0.0 telemetry.nextjs.org
0.0.0.0 collector.github.com
```

> [!TIP]
> Run the full audit again after each major dependency upgrade. Telemetry is frequently
> added in minor releases — a package that was clean at version 2.x may phone home at 3.x.
> Pin the CI blocklist to the dependency scanner, not to a one-time audit document.
