---
name: linux-systemd-daemon-packager
description: Generate hardened systemd user/system unit files, XDG base directory paths, and clean uninstall scripts for Linux daemons and background services. Use when asked to "write a systemd unit", "harden a service", "create a daemon", "XDG paths for a service", "user systemd service", "uninstall script", "systemd security hardening", "socket activation", or "package a Linux daemon". Not for day-to-day service administration (use system-administration).
metadata:
  version: '1'
---
# Linux Systemd & Daemon Packager

Generates hardened systemd user/system unit files, XDG-compliant path layouts, and
idempotent uninstall scripts — so daemons install cleanly, run least-privileged, and
leave no residue on removal.

> [!IMPORTANT]
> Choose **user mode** (`systemctl --user`) or **system mode** (`systemctl`) before writing
> anything. The unit file paths, security directives, and runtime directories differ
> completely between the two. Mixing them produces units that silently fail to load.

---

## Steps

### 1. Classify the daemon

Answer these four questions before writing a single line of a unit file:

| Question | Determines |
|---|---|
| **User or system daemon?** | Unit file location, `WantedBy=`, runtime UID, XDG vs. FHS paths |
| **What does it need from the network?** | `After=network-online.target` vs. `After=network.target` vs. nothing |
| **Does it write persistent data?** | `StateDirectory=` vs. `RuntimeDirectory=` vs. neither |
| **Does it expose a socket / port?** | Socket activation unit needed; port < 1024 requires `AmbientCapabilities=` or socket activation proxy |

#### Decision: user vs. system

| Criterion | User daemon | System daemon |
|---|---|---|
| Runs as a specific non-root user | ✓ preferred | ✓ possible (with `User=`) |
| Runs at login / per-session | ✓ | ✗ |
| Runs at boot before login | ✗ | ✓ |
| Needs raw hardware / kernel access | ✗ | ✓ |
| Needs port < 1024 | ✗ (use socket activation or proxy) | ✓ with `AmbientCapabilities=CAP_NET_BIND_SERVICE` |
| Ships via package manager | Possible | Standard |

**Completion criterion:** user-vs-system decision recorded, all four questions answered.
No unit content is written yet.

---

### 2. Establish XDG / FHS paths

Use these path tables as the **single source of truth** for every directory reference in
the unit file, install script, and uninstall script. Never hardcode `/home/user/.config`.

#### User daemon — XDG paths

| Purpose | Variable | Default expansion | Systemd directive |
|---|---|---|---|
| Config | `$XDG_CONFIG_HOME` | `~/.config/<app>` | `ConfigurationDirectory=` (systemd ≥ 240) or env-expanded path |
| Persistent state / data | `$XDG_DATA_HOME` | `~/.local/share/<app>` | `StateDirectory=` resolves under `~/.local/share` for user units |
| Runtime / sockets / PIDs | `$XDG_RUNTIME_DIR` | `/run/user/<UID>` | `RuntimeDirectory=<app>` → `/run/user/<UID>/<app>` |
| Cache | `$XDG_CACHE_HOME` | `~/.cache/<app>` | `CacheDirectory=<app>` → `~/.cache/<app>` |
| Logs | journald | journald | `StandardOutput=journal` — no log file needed |
| Binary | `$XDG_BIN_HOME` | `~/.local/bin` | Installation target only |

#### System daemon — FHS paths

| Purpose | Standard path | Systemd directive |
|---|---|---|
| Config | `/etc/<app>/` | `ConfigurationDirectory=<app>` |
| Persistent state | `/var/lib/<app>/` | `StateDirectory=<app>` |
| Runtime / sockets | `/run/<app>/` | `RuntimeDirectory=<app>` |
| Cache | `/var/cache/<app>/` | `CacheDirectory=<app>` |
| Logs | journald | `StandardOutput=journal` |
| Binary | `/usr/local/bin/` or `/usr/bin/` | Installation target |
| Unit file | `/etc/systemd/system/` (admin) or `/usr/lib/systemd/system/` (package) | — |

> [!NOTE]
> Prefer systemd's own `StateDirectory=`, `RuntimeDirectory=`, `CacheDirectory=`, and
> `ConfigurationDirectory=` directives over manually `mkdir`-ing in install scripts.
> Systemd creates these directories with correct ownership and permissions automatically
> on service start, and removes `RuntimeDirectory=` automatically on stop.

**Completion criterion:** a path table for this specific daemon is written, every directory
mapped to its systemd directive or env variable, with no `/home/username` hardcodes.

---

### 3. Write the unit file

Generate the unit file from the hardened template for the chosen mode.

#### User unit template — `~/.config/systemd/user/<app>.service`

```ini
[Unit]
Description=<One-line description of what the daemon does>
Documentation=man:<app>(1) https://example.com/docs
# Network dependency — choose one or omit:
# After=network-online.target   ← needs confirmed connectivity
# After=network.target          ← needs interface up, not confirmed
Wants=network-online.target     # pair with After= when used

[Service]
Type=<simple|exec|forking|notify|dbus|idle>
# 'exec' is preferred over 'simple' for most daemons (systemd ≥ 240)
ExecStart=%h/.local/bin/<app> [flags]
ExecReload=kill -HUP $MAINPID
Restart=on-failure
RestartSec=5s

# --- Paths (systemd manages creation/ownership/permissions) ---
RuntimeDirectory=%p          # /run/user/<UID>/<app>
StateDirectory=%p            # ~/.local/share/<app>
CacheDirectory=%p            # ~/.cache/<app>
ConfigurationDirectory=%p    # ~/.config/<app>  (systemd ≥ 257; else pre-create)

# --- Logging ---
StandardOutput=journal
StandardError=journal
SyslogIdentifier=<app>

# --- Environment ---
Environment=XDG_RUNTIME_DIR=/run/user/%U
EnvironmentFile=-%h/.config/<app>/env   # optional; leading '-' = ignore if absent

# --- Hardening (user units — subset of system hardening) ---
NoNewPrivileges=yes
MemoryDenyWriteExecute=yes
RestrictNamespaces=yes
RestrictSUIDSGID=yes
LockPersonality=yes
PrivateTmp=yes
ProtectHostname=yes

[Install]
WantedBy=default.target
```

#### System unit template — `/etc/systemd/system/<app>.service`

```ini
[Unit]
Description=<One-line description of what the daemon does>
Documentation=man:<app>(1) https://example.com/docs
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
ExecStart=/usr/local/bin/<app> [flags]
ExecReload=kill -HUP $MAINPID
Restart=on-failure
RestartSec=5s

# --- Identity ---
User=<app>
Group=<app>
# DynamicUser=yes  ← alternative: ephemeral UID, no pre-created user needed
#                    incompatible with StateDirectory persistence across versions

# --- Paths ---
RuntimeDirectory=<app>          # /run/<app>  — removed on stop
StateDirectory=<app>            # /var/lib/<app>  — persistent
CacheDirectory=<app>            # /var/cache/<app>
ConfigurationDirectory=<app>    # /etc/<app>  — not modified by service

# --- Logging ---
StandardOutput=journal
StandardError=journal
SyslogIdentifier=<app>

# --- Environment ---
EnvironmentFile=-%i/etc/<app>/env   # optional overrides

# ================================================================
# HARDENING — apply every directive below unless a specific feature
# requires removing it. Document every removal with a comment.
# ================================================================

# Privilege controls
NoNewPrivileges=yes
CapabilityBoundingSet=            # empty = drop all capabilities
AmbientCapabilities=              # empty unless port < 1024 or raw socket needed
SecureBits=keep-caps

# Filesystem isolation
ProtectSystem=strict              # /usr, /boot, /efi read-only; / read-only
ProtectHome=yes                   # /home, /root, /run/user invisible
PrivateTmp=yes                    # isolated /tmp and /var/tmp
PrivateDevices=yes                # no /dev except null, zero, random, urandom
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
ProtectControlGroups=yes
ProtectProc=invisible             # /proc entries of other PIDs hidden
ProcSubset=pid                    # only pid subtree visible
PrivateMounts=yes
ReadWritePaths=/var/lib/<app> /run/<app>   # explicit allowlist; StateDirectory auto-adds

# System call filter
SystemCallFilter=@system-service  # curated allowlist for typical daemons
SystemCallFilter=~@privileged @resources @raw-io @reboot @swap @obsolete
SystemCallErrorNumber=EPERM
SystemCallArchitectures=native

# Network isolation (remove if daemon needs network)
# PrivateNetwork=yes              # uncomment for network-isolated daemons

# IPC isolation
PrivateIPC=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX   # adjust to actual needs
RestrictNamespaces=yes
RestrictRealtime=yes
RestrictSUIDSGID=yes

# Memory
MemoryDenyWriteExecute=yes
LockPersonality=yes

# Misc
UMask=0077
TimeoutStopSec=15s
KillMode=mixed
KillSignal=SIGTERM

[Install]
WantedBy=multi-user.target
```

#### `Type=` selection guide

| Type | Use when |
|---|---|
| `exec` | Daemon stays in foreground; binary itself is the main process (preferred default) |
| `simple` | Same as exec but PID tracking is weaker; use exec instead on systemd ≥ 240 |
| `notify` | Daemon calls `sd_notify(READY=1)` when initialization is complete |
| `forking` | Legacy: daemon double-forks; set `PIDFile=` |
| `dbus` | Daemon acquires a D-Bus name; set `BusName=` |
| `oneshot` | Short-lived task; pair with `RemainAfterExit=yes` if status must persist |

**Completion criterion:** unit file contains all hardening directives from the template.
Every removed directive has an inline comment explaining why. `systemd-analyze verify <unit>`
runs clean.

---

### 4. Add socket activation (when applicable)

Socket activation decouples the listening socket from the daemon process, enables
zero-downtime restarts, and lets unprivileged user units accept connections on privileged ports via a system-level socket unit.

#### Socket unit template — `<app>.socket`

```ini
[Unit]
Description=<app> socket
PartOf=<app>.service

[Socket]
ListenStream=/run/<app>/<app>.sock    # or: ListenStream=0.0.0.0:8080
SocketMode=0600
SocketUser=<app>
SocketGroup=<app>
Accept=no       # pass the socket fd; daemon calls accept() itself
Backlog=4096
KeepAlive=yes

[Install]
WantedBy=sockets.target
```

#### Service modifications for socket activation

```ini
[Service]
# Remove ExecStart port binding; systemd passes the socket fd
StandardInput=socket    # for Accept=yes (inetd style) only
# For Accept=no: daemon calls sd_listen_fds() or checks LISTEN_FDS env var
```

> [!TIP]
> `systemd-socket-activate -l 8080 -- /usr/local/bin/<app>` lets you test socket activation
> locally without installing the unit. The daemon receives the socket fd identically to production.

**Completion criterion:** `.socket` unit passes `systemd-analyze verify`. Daemon starts on
first connection and does not hold the port open when idle (if `Accept=yes` / per-connection model).

---

### 5. Write the install script

The install script must be **idempotent** — running it twice leaves the system in the same
state as running it once. Every step is guarded.

#### System daemon install script — `install.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

APP="<app>"
BIN_SRC="./target/release/${APP}"        # or dist path
BIN_DST="/usr/local/bin/${APP}"
UNIT_SRC="./${APP}.service"
SOCKET_SRC="./${APP}.socket"             # omit if no socket activation
UNIT_DST="/etc/systemd/system/${APP}.service"
SOCKET_DST="/etc/systemd/system/${APP}.socket"
CONFIG_DIR="/etc/${APP}"
STATE_DIR="/var/lib/${APP}"

# 1. Create system user (idempotent)
if ! id "${APP}" &>/dev/null; then
  useradd --system --no-create-home --shell /usr/sbin/nologin \
          --home-dir "/var/lib/${APP}" "${APP}"
fi

# 2. Install binary
install -Dm755 "${BIN_SRC}" "${BIN_DST}"

# 3. Create config directory (service will create state/runtime dirs)
install -dm750 -o "${APP}" -g "${APP}" "${CONFIG_DIR}"

# 4. Install default config if not already present
if [ ! -f "${CONFIG_DIR}/${APP}.toml" ]; then
  install -Dm640 -o root -g "${APP}" "./config/${APP}.toml.default" \
          "${CONFIG_DIR}/${APP}.toml"
fi

# 5. Install unit file(s)
install -Dm644 "${UNIT_SRC}" "${UNIT_DST}"
[ -f "${SOCKET_SRC}" ] && install -Dm644 "${SOCKET_SRC}" "${SOCKET_DST}"

# 6. Reload and enable
systemctl daemon-reload
systemctl enable --now "${APP}.service"
# systemctl enable --now "${APP}.socket"   # uncomment if socket activation

echo "Installed ${APP}. Status:"
systemctl status "${APP}.service" --no-pager || true
```

#### User daemon install script — `install-user.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

APP="<app>"
BIN_SRC="./target/release/${APP}"
BIN_DST="${HOME}/.local/bin/${APP}"
UNIT_DIR="${XDG_CONFIG_HOME:-${HOME}/.config}/systemd/user"
UNIT_SRC="./${APP}.service"

# 1. Install binary
install -Dm755 "${BIN_SRC}" "${BIN_DST}"

# 2. Install unit file
install -Dm644 "${UNIT_SRC}" "${UNIT_DIR}/${APP}.service"

# 3. Enable lingering so the unit survives logout (optional; ask user)
# loginctl enable-linger "${USER}"

# 4. Reload and enable
systemctl --user daemon-reload
systemctl --user enable --now "${APP}.service"

echo "Installed user service ${APP}."
systemctl --user status "${APP}.service" --no-pager || true
```

**Completion criterion:** running the install script twice produces no errors and no duplicate
users, files, or unit registrations. `systemctl status <app>` shows `active (running)`.

---

### 6. Write the uninstall script

The uninstall script must remove **every artifact** the install script created and leave
the system in the state it was in before installation. Zero residue.

#### System daemon uninstall script — `uninstall.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

APP="<app>"
BIN_DST="/usr/local/bin/${APP}"
UNIT_DST="/etc/systemd/system/${APP}.service"
SOCKET_DST="/etc/systemd/system/${APP}.socket"
CONFIG_DIR="/etc/${APP}"
# STATE_DIR="/var/lib/${APP}"   # intentionally NOT removed by default; holds user data

echo "Stopping and disabling ${APP}..."
systemctl disable --now "${APP}.service" 2>/dev/null || true
systemctl disable --now "${APP}.socket"  2>/dev/null || true

echo "Removing unit files..."
rm -f "${UNIT_DST}" "${SOCKET_DST}"
systemctl daemon-reload
systemctl reset-failed 2>/dev/null || true

echo "Removing binary..."
rm -f "${BIN_DST}"

echo "Removing system user..."
if id "${APP}" &>/dev/null; then
  userdel "${APP}" 2>/dev/null || true
fi

# Config dir removed only with --purge.
# ${VAR:?} aborts if a variable is empty, so a blank APP can never turn
# "/var/lib/${APP}" into "/var/lib/" (set -u only catches *unset* variables).
if [[ "${1:-}" == "--purge" ]]; then
  echo "Purging config: ${CONFIG_DIR:?}"
  rm -rf "${CONFIG_DIR:?}"
  echo "Purging state: /var/lib/${APP:?}"
  rm -rf "/var/lib/${APP:?}"
  echo "Purging cache: /var/cache/${APP:?}"
  rm -rf "/var/cache/${APP:?}"
fi

echo "Uninstall complete."
[ "${1:-}" != "--purge" ] && \
  echo "Data in /var/lib/${APP} retained. Run with --purge to remove."
```

#### User daemon uninstall script — `uninstall-user.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

APP="<app>"
BIN_DST="${HOME}/.local/bin/${APP}"
UNIT_FILE="${XDG_CONFIG_HOME:-${HOME}/.config}/systemd/user/${APP}.service"

systemctl --user disable --now "${APP}.service" 2>/dev/null || true
systemctl --user daemon-reload
systemctl --user reset-failed 2>/dev/null || true

rm -f "${UNIT_FILE}"
rm -f "${BIN_DST}"

if [[ "${1:-}" == "--purge" ]]; then
  # ${APP:?} aborts on an empty APP instead of deleting the whole config/data/cache folder
  rm -rf "${XDG_CONFIG_HOME:-${HOME}/.config}/${APP:?}"
  rm -rf "${XDG_DATA_HOME:-${HOME}/.local/share}/${APP:?}"
  rm -rf "${XDG_CACHE_HOME:-${HOME}/.cache}/${APP:?}"
  echo "Purged all ${APP} data."
fi

echo "User service ${APP} uninstalled."
```

**Completion criterion:** running uninstall after install leaves no files, units, or users
from the installation. `systemctl status <app>` returns `Unit <app>.service could not be found.`
Running uninstall on a never-installed system exits 0 with no errors.

---

### 7. Verify hardening posture

Run these checks before shipping the unit.

#### Automated checks

```bash
# 1. Unit syntax and dependency graph
systemd-analyze verify /etc/systemd/system/<app>.service

# 2. Security score (target: ≥ 7.0 for system daemons, ≥ 5.0 for user daemons)
systemd-analyze security <app>.service

# 3. Capability audit — should be empty for most daemons
systemctl show <app>.service -p CapabilityBoundingSet

# 4. Effective syscall filter
systemd-analyze syscall-filter <app>.service

# 5. File descriptor leak check
systemctl cat <app>.service | grep -E 'LimitNOFILE|LimitNPROC'
```

#### Hardening score targets

| Directive | Points impact | Priority |
|---|---|---|
| `PrivateUsers=yes` | High | Add for system daemons running as non-root |
| `ProtectSystem=strict` | High | Most impactful single directive |
| `SystemCallFilter=@system-service` | High | Drop all non-service syscalls |
| `CapabilityBoundingSet=` (empty) | High | Drop all capabilities |
| `MemoryDenyWriteExecute=yes` | Medium | Blocks shellcode injection |
| `RestrictAddressFamilies=` | Medium | Restrict to only needed AF_* families |
| `ProtectKernelTunables=yes` | Medium | Blocks sysctl writes |
| `DynamicUser=yes` | High | Ephemeral UID; strongest isolation for stateless services |

> [!NOTE]
> `systemd-analyze security` scores 0.0 (most secure) to 10.0 (exposed). The command
> shows per-directive scores so you can prioritize which directives to add next.
> Run it after every change. Aim to reduce the score, not just pass a threshold.

#### Runtime verification checklist

- [ ] `systemctl status <app>` shows `active (running)`, not `activating` indefinitely.
- [ ] `journalctl -u <app> --no-pager -n 50` shows no permission-denied errors.
- [ ] `ls -la /run/<app>/` or `/run/user/<UID>/<app>/` shows correct ownership.
- [ ] `ls -la /var/lib/<app>/` shows correct ownership (system daemons).
- [ ] `ls -la /etc/<app>/` shows root:root or root:<app>, mode 750.
- [ ] `systemctl stop <app>` removes `/run/<app>/` (RuntimeDirectory auto-cleanup).
- [ ] `systemctl restart <app>` completes in < `RestartSec` + `TimeoutStopSec`.
- [ ] Uninstall script exits 0 on a fresh system (guard all `rm -f` with no-error).

**Completion criterion:** `systemd-analyze security` score ≤ 3.0 for new system daemons,
all checklist items pass, no journal errors after 60 seconds of normal operation.

---

## Reference

### Unit file locations — quick lookup

| Scope | Writeable by | Path |
|---|---|---|
| System / package | Package manager | `/usr/lib/systemd/system/` |
| System / admin override | Root | `/etc/systemd/system/` |
| System / drop-in | Root | `/etc/systemd/system/<app>.service.d/*.conf` |
| User / package | Package manager | `/usr/lib/systemd/user/` |
| User / admin | Root | `/etc/systemd/user/` |
| User / personal | User | `~/.config/systemd/user/` |
| User / drop-in | User | `~/.config/systemd/user/<app>.service.d/*.conf` |

**Override rule:** files in `/etc/systemd/system/` always win over `/usr/lib/systemd/system/`.
Drop-ins are merged, not replaced — use them to patch a package-provided unit without forking it.

### Specifier quick reference (use in unit files, not in scripts)

| Specifier | Expands to |
|---|---|
| `%n` | Full unit name (`app.service`) |
| `%p` | Prefix (unit name without suffix and instance) |
| `%i` | Instance name (for `app@instance.service`) |
| `%u` | User name running the service |
| `%U` | Numeric UID |
| `%h` | Home directory of `%u` |
| `%t` | Runtime directory (`/run` for root; `/run/user/<UID>` for user) |
| `%S` | State directory (`/var/lib` for root; `~/.local/share` for user) |
| `%C` | Cache directory (`/var/cache` for root; `~/.cache` for user) |
| `%E` | Config directory (`/etc` for root; `~/.config` for user) |
| `%L` | Log directory (`/var/log` for root; `~/.local/state/log` for user) |

### Restart policy quick reference

| Policy | Restarts on | Use when |
|---|---|---|
| `no` | Never | One-shot tasks |
| `on-failure` | Non-zero exit, signal (not SIGTERM/SIGHUP) | Most daemons |
| `on-abnormal` | Signal, watchdog, timeout | High-availability daemons |
| `always` | Any exit | Supervisors, persistent background loops |
| `on-success` | Zero exit only | Retry-until-success tasks |

### Capability reference — common allowlist

```ini
# Web server binding to port 80/443
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

# Raw socket / packet capture
AmbientCapabilities=CAP_NET_RAW
CapabilityBoundingSet=CAP_NET_RAW

# Reading /proc of other users
AmbientCapabilities=CAP_SYS_PTRACE
CapabilityBoundingSet=CAP_SYS_PTRACE

# Fully unprivileged (most daemons)
AmbientCapabilities=
CapabilityBoundingSet=
```

### Drop-in override pattern — patch without forking

```bash
# Create a drop-in to override one directive without editing the package unit:
mkdir -p /etc/systemd/system/<app>.service.d/
cat > /etc/systemd/system/<app>.service.d/override.conf <<'EOF'
[Service]
# Reset the original value first (for list-type directives like ExecStart):
ExecStart=
ExecStart=/usr/local/bin/<app> --my-flag
EOF
systemctl daemon-reload
```

> [!TIP]
> `systemctl edit <app>` opens the drop-in editor automatically and reloads on save.
> Prefer drop-ins over copying unit files — they survive package upgrades.

> [!CAUTION]
> Never set `ProtectSystem=strict` without also setting `ReadWritePaths=` for every directory
> the daemon writes to. The service will start but fail silently on the first write, and the
> error surfaces in the journal as `Permission denied` with no indication that `ProtectSystem`
> is the cause. Always check the journal for 60 seconds after enabling a newly hardened unit.
