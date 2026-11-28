---
name: network-firewall-rule-validator
description: Audit nftables, iptables, WireGuard/Tailscale routing, and CGNAT edge cases while preventing accidental lockouts. Use when asked to "audit firewall rules", "validate nftables", "fix iptables", "WireGuard routing", "Tailscale ACL", "CGNAT edge cases", "prevent SSH lockout", "firewall lockout recovery", "port forwarding rules", "network policy review", or "routing table audit". Not for application security reviews (use security-audit).
metadata:
  version: '1'
---
# Network & Firewall Rule Validator

Audits nftables, iptables, WireGuard/Tailscale routing, and CGNAT edge cases while
preventing accidental lockouts. Every rule change is tested before it is made permanent.

> [!CAUTION]
> A wrong firewall rule applied to a remote machine is a **lockout** — no retry, no undo.
> This skill enforces a mandatory pre-flight (§1) and a timed-rollback guard (§2) before
> any rule is written. Never skip them, even for a "quick fix". The firewall does not care
> how urgent the change felt.

---

## Steps

### 1. Pre-flight audit — know before you touch

Collect the full network state before writing a single rule. Every item is mandatory.

```bash
# 1a. Active interfaces and addresses
ip -brief addr show
ip -brief link show

# 1b. Routing tables (main + policy routes)
ip route show table all
ip rule show

# 1c. Current firewall state
nft list ruleset 2>/dev/null || true          # nftables
iptables-save 2>/dev/null || true             # iptables (legacy)
ip6tables-save 2>/dev/null || true            # ip6tables
iptables-legacy-save 2>/dev/null || true      # nf_tables compat shim check

# 1d. Active connections (must preserve these paths)
ss -tunp
conntrack -L 2>/dev/null || true              # connection tracking table

# 1e. SSH / management session facts
echo "Current SSH session:"
who -a
echo "SSH port:"
ss -tlnp | grep sshd
echo "SSH client IP:"
echo $SSH_CLIENT $SSH_CONNECTION

# 1f. WireGuard / Tailscale state
wg show all 2>/dev/null || true
tailscale status 2>/dev/null || true
tailscale ip 2>/dev/null || true

# 1g. CGNAT / NAT detection
# RFC 6598 CGNAT range: 100.64.0.0/10
ip addr show | grep -E "100\.(6[4-9]|[7-9][0-9]|1([0-1][0-9]|2[0-7]))\."
# Check if default gateway is RFC1918 behind CGNAT
ip route show default
```

#### Pre-flight checklist — block on any unchecked item

- [ ] All interfaces and their IP addresses recorded.
- [ ] Default routes for IPv4 and IPv6 recorded.
- [ ] Current firewall ruleset saved to a timestamped backup file.
- [ ] SSH management IP and port confirmed and noted explicitly.
- [ ] Active connection tracking entries reviewed (no existing session will be cut).
- [ ] WireGuard / Tailscale interfaces and their subnets noted if present.
- [ ] CGNAT presence determined (yes / no / uncertain).

```bash
# Save ruleset backup before any change
BACKUP="/root/firewall-backup-$(date +%Y%m%d-%H%M%S)"
nft list ruleset > "${BACKUP}.nft" 2>/dev/null || true
iptables-save    > "${BACKUP}.ipt" 2>/dev/null || true
echo "Backup written to ${BACKUP}.*"
```

**Completion criterion:** every checklist item checked. The backup file exists and is
non-empty. SSH management path is explicitly written down. No rules are changed yet.

---

### 2. Install the lockout guard

**Always active before any change on a remote host.** The guard auto-reverts the ruleset
if you do not check in within the timeout. It is your safety net against self-lockout.

#### Timed rollback with `at`

```bash
# Schedule automatic rollback in 5 minutes
BACKUP="/root/firewall-backup-<timestamp>"

# nftables
echo "nft flush ruleset && nft -f ${BACKUP}.nft" | at now + 5 minutes
echo "Rollback scheduled for 5 minutes from now."
echo "Cancel with: atrm \$(atq | tail -1 | cut -f1)"

# iptables
echo "iptables-restore < ${BACKUP}.ipt && ip6tables-restore < ${BACKUP}.ip6t" \
  | at now + 5 minutes
```

#### Rollback guard workflow

```
1. Apply new rules (§3–§6)
2. Test SSH / management access from a SECOND terminal before closing first
3. Confirm connectivity → cancel the rollback job: atrm $(atq | tail -1 | cut -f1)
4. If unreachable → wait for the at job to fire and restore rules automatically
```

> [!WARNING]
> Never close the original SSH session before the second terminal confirms access.
> Two simultaneous sessions cost nothing; a lockout costs a datacenter visit or a
> provider console session. The second session is not optional.

#### Recovery paths if `at` is unavailable

| Method | Command |
|---|---|
| `systemd-run` one-shot | `systemd-run --on-active=300 --unit=fw-rollback nft -f /root/firewall-backup.nft` |
| `cron` temporary entry | A drop-in file `/etc/cron.d/fw-rollback` containing `*/5 * * * * root nft -f /root/firewall-backup.nft && rm -f /etc/cron.d/fw-rollback` (removes only itself; never `crontab -r`, which deletes the whole crontab) |
| `watchdog` script | Loop that pings a check-in file; if stale, restore and exit |
| Provider OOB console | Note console URL before starting — last resort |

**Completion criterion:** an active rollback job is confirmed (`atq` shows a pending job,
or `systemctl list-timers` shows the one-shot). Do not proceed to §3 without it.

---

### 3. Audit and write nftables rules

#### nftables structure model

```
table <family> <name> {
    chain <name> {
        type <filter|nat|route>  hook <input|output|forward|prerouting|postrouting>  priority <N>  policy <accept|drop>
        rule ...
    }
}
```

#### Families

| Family | Covers |
|---|---|
| `ip` | IPv4 only |
| `ip6` | IPv6 only |
| `inet` | IPv4 + IPv6 (preferred for most rulesets) |
| `arp` | ARP |
| `bridge` | Ethernet bridge |
| `netdev` | Ingress/egress on a specific interface (XDP-level) |

#### Hardened baseline — `inet filter` table

```nft
#!/usr/sbin/nft -f
# /etc/nftables.conf — baseline hardened ruleset

flush ruleset

table inet filter {

    # --- Allowlisted source IPs (management) ---
    set mgmt_v4 {
        type ipv4_addr
        flags interval
        elements = {
            # ADD YOUR MANAGEMENT IPs HERE before applying
            # 203.0.113.10,       # office egress
            # 198.51.100.0/24,    # VPN range
        }
    }

    set mgmt_v6 {
        type ipv6_addr
        flags interval
        elements = { }
    }

    # --- Chain: inbound ---
    chain input {
        type filter hook input priority 0; policy drop;

        # Stateful: accept established/related, drop invalid
        ct state established,related accept
        ct state invalid drop

        # Loopback
        iif "lo" accept

        # ICMPv4 — allow essential types only
        ip protocol icmp icmp type {
            echo-request,       # ping in
            echo-reply,
            destination-unreachable,
            time-exceeded,
            parameter-problem
        } accept

        # ICMPv6 — RFC 4890 mandatory set
        ip6 nexthdr icmpv6 icmpv6 type {
            echo-request, echo-reply,
            nd-neighbor-solicit, nd-neighbor-advert,
            nd-router-solicit, nd-router-advert,
            mld-listener-query, mld-listener-report,
            destination-unreachable, packet-too-big,
            time-exceeded, parameter-problem
        } accept

        # SSH — management sources only (populate mgmt_v4/v6 above)
        # WARNING: test this rule from a second session before making permanent
        tcp dport 22 ip saddr @mgmt_v4 accept
        tcp dport 22 ip6 saddr @mgmt_v6 accept
        # FALLBACK (comment out after mgmt_v4 is populated):
        tcp dport 22 accept   # ← REMOVE THIS LINE once mgmt set is populated

        # Services — add application rules here
        # tcp dport { 80, 443 } accept    # HTTP/HTTPS
        # udp dport 51820 accept          # WireGuard
    }

    # --- Chain: forward ---
    chain forward {
        type filter hook forward priority 0; policy drop;

        ct state established,related accept
        ct state invalid drop

        # WireGuard / VPN forwarding (adjust interfaces)
        # iifname "wg0" oifname "eth0" accept
        # iifname "eth0" oifname "wg0" ct state related,established accept
    }

    # --- Chain: outbound ---
    chain output {
        type filter hook output priority 0; policy accept;
        # Restrict outbound only when hardening a bastion or container
        ct state invalid drop
    }
}
```

#### NAT table — masquerade / DNAT

```nft
table ip nat {
    chain prerouting {
        type nat hook prerouting priority dstnat; policy accept;
        # Port forward: external 8080 → internal host 192.168.1.10:80
        # iifname "eth0" tcp dport 8080 dnat to 192.168.1.10:80
    }

    chain postrouting {
        type nat hook postrouting priority srcnat; policy accept;
        # Masquerade outbound traffic on WAN interface
        # oifname "eth0" masquerade
        # Prefer snat for static IPs (more efficient than masquerade):
        # oifname "eth0" snat to 203.0.113.5
    }
}
```

#### Rule validation commands

```bash
# Dry-run: parse without applying
nft --check -f /etc/nftables.conf

# Apply atomically (all-or-nothing; safer than individual rule adds)
nft -f /etc/nftables.conf

# Inspect live state
nft list ruleset
nft list table inet filter
nft list chain inet filter input

# Monitor rule hits in real time
nft monitor trace   # requires a trace rule; see reference §

# Count hits per rule
nft list ruleset | grep counter
```

#### Common nftables mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| `policy drop` before management rule | Instant lockout | Put `ct state established,related accept` first |
| Forgetting `flush ruleset` at top | Old rules accumulate across reloads | Always open with `flush ruleset` or use atomic replace |
| Missing ICMPv6 rules with IPv6 enabled | SLAAC, NDP, and path MTU break | Use the full RFC 4890 ICMPv6 set above |
| `masquerade` on static-IP interface | Per-packet overhead | Use `snat to <IP>` instead |
| No `ct state invalid drop` | Broken packets bypass policy | Add to every chain |
| `accept` rule after `policy drop` for `lo` missing | Loopback breaks DNS, DBus, etc. | `iif "lo" accept` must be before any other rule |

**Completion criterion:** `nft --check -f /etc/nftables.conf` exits 0. Rules are applied
atomically. SSH from the second terminal confirms access before the rollback job is cancelled.

---

### 4. Audit and migrate iptables rules

#### When to use iptables vs. nftables

| Situation | Recommendation |
|---|---|
| New system, clean slate | Use nftables exclusively |
| Existing iptables ruleset | Migrate to nftables; use `iptables-translate` |
| Kernel < 4.10 or old distro | iptables only; nftables unavailable |
| Docker / Kubernetes node | iptables (Docker inserts rules into `DOCKER` chains; nftables has limited interop) |
| Mixed: nftables + legacy rules | Use `iptables-nft` shim — never mix `iptables-legacy` and `iptables-nft` on the same system |

#### Detect which iptables backend is active

```bash
update-alternatives --display iptables 2>/dev/null || \
  ls -la /usr/sbin/iptables

# Check for shim (nf_tables backend)
iptables --version   # shows "(nf_tables)" or "(legacy)"
```

#### Translate iptables rules to nftables

```bash
# Single rule translation
iptables-translate -A INPUT -p tcp --dport 22 -j ACCEPT
# → nft add rule ip filter INPUT tcp dport 22 counter accept

# Full ruleset translation
iptables-restore-translate -f /root/firewall-backup.ipt > /etc/nftables-migrated.conf
nft --check -f /etc/nftables-migrated.conf   # validate before applying
```

#### Hardened iptables baseline (when nftables is not available)

```bash
#!/usr/bin/env bash
# firewall-iptables.sh
set -euo pipefail

IPT="iptables"
IP6T="ip6tables"

# Flush everything
$IPT  -F; $IPT  -X; $IPT  -Z
$IP6T -F; $IP6T -X; $IP6T -Z

# Default policies
$IPT  -P INPUT DROP; $IPT  -P FORWARD DROP; $IPT  -P OUTPUT ACCEPT
$IP6T -P INPUT DROP; $IP6T -P FORWARD DROP; $IP6T -P OUTPUT ACCEPT

# Established / related
$IPT  -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
$IPT  -A INPUT -m conntrack --ctstate INVALID -j DROP
$IP6T -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Loopback
$IPT  -A INPUT -i lo -j ACCEPT
$IP6T -A INPUT -i lo -j ACCEPT

# ICMPv4
$IPT -A INPUT -p icmp --icmp-type echo-request -j ACCEPT
$IPT -A INPUT -p icmp --icmp-type destination-unreachable -j ACCEPT
$IPT -A INPUT -p icmp --icmp-type time-exceeded -j ACCEPT

# ICMPv6 (RFC 4890)
for type in echo-request echo-reply destination-unreachable \
            packet-too-big time-exceeded parameter-problem \
            router-solicitation router-advertisement \
            neighbour-solicitation neighbour-advertisement; do
  $IP6T -A INPUT -p icmpv6 --icmpv6-type "$type" -j ACCEPT
done

# SSH — WARNING: replace 0.0.0.0/0 with management IP before applying
$IPT -A INPUT -p tcp --dport 22 -s 0.0.0.0/0 -j ACCEPT   # restrict this

# Persist
iptables-save  > /etc/iptables/rules.v4
ip6tables-save > /etc/iptables/rules.v6
```

**Completion criterion:** `iptables -L -n -v` shows the expected chains and rules.
No DOCKER or other tool-managed chain has been flushed accidentally.
If migrating to nftables, the translated ruleset passes `nft --check`.

---

### 5. Audit WireGuard routing

WireGuard routing errors are silent: traffic routes incorrectly rather than being blocked,
making them harder to diagnose than firewall drops.

#### WireGuard config audit checklist

For each peer in `wg0.conf` (or equivalent):

- [ ] `AllowedIPs` is the minimal set — not `0.0.0.0/0` unless this peer is a full-tunnel VPN exit.
- [ ] `AllowedIPs` does not overlap with another peer's range (causes split-brain routing).
- [ ] `Endpoint` is reachable from this host (`nc -zu <endpoint-ip> <port>`).
- [ ] `PersistentKeepalive` is set (25s) if the peer is behind NAT — required or the tunnel silences.
- [ ] The WireGuard interface IP (`Address`) does not conflict with an existing route.
- [ ] `PostUp` / `PostDown` rules are idempotent (safe to re-run on interface restart).

#### WireGuard routing — full-tunnel vs. split-tunnel

```ini
# Full tunnel (all traffic through WireGuard exit node)
[Peer]
AllowedIPs = 0.0.0.0/0, ::/0
# Required companion: exclude the endpoint itself from the tunnel
# Add to PostUp: ip route add <endpoint-ip>/32 via <local-gateway>

# Split tunnel (only specific subnets through WireGuard)
[Peer]
AllowedIPs = 10.0.0.0/8, 192.168.100.0/24
# Traffic to other destinations uses the default route
```

#### Full-tunnel lockout prevention

The classic lockout: routing `0.0.0.0/0` through WireGuard on a remote host causes the
WireGuard endpoint's own packets to route through the tunnel → infinite loop → lost.

```bash
# ALWAYS add this exclusion when using 0.0.0.0/0 AllowedIPs on a server
WG_ENDPOINT_IP="<peer-public-ip>"
LOCAL_GW="$(ip route show default | awk '/default/ {print $3; exit}')"

# In wg0.conf PostUp:
PostUp  = ip route add %WG_ENDPOINT_IP% via %LOCAL_GW%
PostDown = ip route del %WG_ENDPOINT_IP% via %LOCAL_GW%
```

#### nftables rules for WireGuard

```nft
table inet filter {
    chain input {
        # Accept WireGuard handshake / data on UDP port
        udp dport 51820 accept

        # Accept traffic arriving on the WireGuard interface (already decrypted)
        iifname "wg0" accept
    }

    chain forward {
        # WireGuard clients → internet (exit node scenario)
        iifname "wg0" oifname "eth0" accept
        iifname "eth0" oifname "wg0" ct state related,established accept
    }
}

table ip nat {
    chain postrouting {
        # Masquerade WireGuard client traffic leaving via WAN
        iifname "wg0" oifname "eth0" masquerade
    }
}
```

#### Routing verification

```bash
# From the WireGuard client, trace the path
wg show wg0                              # check handshake timestamp
ping -c 3 <wg-server-ip>                # test tunnel itself
traceroute <destination>                 # confirm packets take expected path

# From the server, check kernel routing
ip route get <client-ip>                 # should show via wg0
ip route get <external-ip>              # should NOT show via wg0 (unless exit node)

# Check for AllowedIPs overlap
wg show wg0 allowed-ips | sort -k2      # sort by IP range; duplicates indicate conflict

# Verify IP forwarding is enabled (required for forward chain to fire)
sysctl net.ipv4.ip_forward              # must be 1
sysctl net.ipv6.conf.all.forwarding     # must be 1 for IPv6 forwarding
```

**Completion criterion:** `wg show` shows a `latest handshake` for every active peer within
the last 180 seconds. `ip route get <peer-ip>` resolves via `wg0`. No `AllowedIPs` range
appears in two peers simultaneously. Full-tunnel configurations have the endpoint exclusion route.

---

### 6. Audit Tailscale ACLs and routing

#### Tailscale ACL structure (HuJSON)

```jsonc
// /etc/tailscale/acls.hujson (or Tailscale admin console)
{
  "acls": [
    // Allow all within the tailnet (default; remove to lock down)
    { "action": "accept", "src": ["*"], "dst": ["*:*"] },

    // Restrict: only devs reach prod servers on SSH
    { "action": "accept",
      "src": ["group:developers"],
      "dst": ["tag:prod:22"] },

    // Allow monitoring subnet to reach all nodes on 9100 (Prometheus)
    { "action": "accept",
      "src": ["tag:monitoring"],
      "dst": ["*:9100"] }
  ],

  "tagOwners": {
    "tag:prod":       ["autogroup:admin"],
    "tag:monitoring": ["autogroup:admin"]
  },

  "ssh": [
    {
      "action": "accept",
      "src":    ["autogroup:members"],
      "dst":    ["autogroup:self"],
      "users":  ["autogroup:nonroot"]
    }
  ]
}
```

#### Tailscale routing audit checklist

- [ ] `tailscale status` shows all expected nodes as online.
- [ ] Subnet routes are advertised and approved: `tailscale status | grep -i subnet`.
- [ ] Exit node (if used): `tailscale status | grep -i "exit node"`.
- [ ] ACL denies by default after `acls` block is non-empty — confirm any removed default permit.
- [ ] `tailscale ping <node>` succeeds for critical nodes.
- [ ] No node has an expired key (`tailscale status | grep -i expired`).
- [ ] `tailscale netcheck` shows no DERP relay dependency for latency-critical paths (direct preferred).

#### CGNAT range awareness

Tailscale uses `100.64.0.0/10` (RFC 6598 — CGNAT range) for Tailscale IPs.

```bash
# Verify Tailscale IPs
tailscale ip                             # your 100.x.x.x addresses

# Check if host is ALSO behind provider CGNAT on the same range
ip addr show | grep "100\."             # should only show tailscale0 interface
ip route show | grep "100\."            # check for conflicting routes

# If provider CGNAT uses 100.64.0.0/10 too:
# → Conflict: Tailscale traffic may route to provider NAT instead of Tailscale
# → Resolution: use Tailscale's 4via6 subnet routing or move provider to a different segment
```

#### Subnet router configuration

```bash
# Advertise a local subnet through Tailscale
tailscale up --advertise-routes=192.168.1.0/24 --accept-routes

# Approve in admin console or via CLI (requires admin):
tailscale routes --approve

# Verify route propagation to other nodes
tailscale status --peers   # check accepted routes column
ip route show              # should show 192.168.1.0/24 via tailscale0 on peer
```

**Completion criterion:** `tailscale ping` succeeds for all nodes. ACL policy is explicit
(no wildcard `*:*` in production unless intentional and documented). No CGNAT range conflict exists.

---

### 7. CGNAT edge case analysis

CGNAT (Carrier-Grade NAT, RFC 6598: `100.64.0.0/10`) breaks assumptions made by many
applications and monitoring tools. Identify and mitigate every affected path.

#### CGNAT detection

```bash
# Check if public-facing IP is RFC1918 or RFC6598 (CGNAT indicators)
curl -s https://ifconfig.me        # external IP as seen by internet
ip route show default              # gateway IP
# If gateway is 10.x, 172.16-31.x, 192.168.x, or 100.64-127.x → behind NAT

# Distinguish single NAT vs. CGNAT:
# Single NAT: gateway IP is RFC1918; external IP is public
# CGNAT:      external IP may also be RFC1918 or not routable; port forwarding impossible
traceroute 1.1.1.1 | head -5      # count how many private hops appear
```

#### CGNAT impact table

| Feature | Impact under CGNAT | Mitigation |
|---|---|---|
| Inbound port forwarding | **Impossible** — provider NAT has no customer-visible config | VPN (WireGuard/Tailscale), reverse tunnel (frp, bore), IPv6 |
| WireGuard server (listen) | Unreachable from internet | Host on a non-CGNAT VPS; use as relay |
| Peer-to-peer (gaming, WebRTC) | STUN/TURN required; symmetric NAT may block | TURN relay mandatory |
| IP-based allowlisting | CGNAT IP changes; multiple customers share one IP | Use token auth instead |
| UDP hole-punching | May work with endpoint-independent NAT; fails with symmetric NAT | Probe with `tailscale netcheck` |
| Tailscale DERP relays | Used when direct path fails; higher latency | Acceptable; prefer nodes with public IPs as relays |
| `PersistentKeepalive` in WireGuard | Critical — CGNAT mappings time out in 30–120s | Set to 25s universally |
| IPv6 | Often unaffected by CGNAT — use where available | Enable IPv6; don't rely on IPv4 public reachability |

#### CGNAT-safe firewall rules

Under CGNAT, inbound connections are blocked at the provider level regardless of local
firewall rules. Focus local rules on **outbound** security and **lateral** protection:

```nft
table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Under CGNAT: inbound from internet is already blocked upstream.
        # Still enforce locally — defense in depth.
        ct state established,related accept
        ct state invalid drop
        iif "lo" accept

        # ICMPv4 / ICMPv6 as per §3
        # ...

        # WireGuard: only accept if using a relay model
        # (direct inbound WireGuard is unreachable under symmetric CGNAT)
        udp dport 51820 accept   # keep for future / IPv6 path

        # Tailscale: accept Tailscale DERP and direct traffic
        udp dport 41641 accept          # Tailscale direct WireGuard port
        tcp dport 3478 accept           # STUN (if running local relay)
    }

    chain output {
        type filter hook output priority 0; policy accept;
        # Restrict only if host is a bastion or container
        ct state invalid drop
    }
}
```

**Completion criterion:** CGNAT status is documented (yes/no/uncertain). Every service
that assumed inbound reachability has an alternative path documented. `tailscale netcheck`
shows whether direct connections are possible or DERP relay is required.

---

### 8. Make rules permanent and validate

#### Persistence — nftables

```bash
# Debian / Ubuntu
cp /etc/nftables.conf /etc/nftables.conf.prev
nft -f /etc/nftables.conf   # apply first; confirm connectivity
systemctl enable nftables
systemctl restart nftables
systemctl status nftables

# Arch / systemd-based
systemctl enable --now nftables
# nftables.service reads /etc/nftables.conf on start
```

#### Persistence — iptables

```bash
# Debian / Ubuntu (iptables-persistent)
apt install iptables-persistent
iptables-save  > /etc/iptables/rules.v4
ip6tables-save > /etc/iptables/rules.v6
systemctl enable netfilter-persistent

# RHEL / Fedora (firewalld translates to nftables internally)
# Prefer editing firewalld zones or switching to pure nftables
```

#### WireGuard persistence

```bash
# systemd-networkd or wg-quick
systemctl enable wg-quick@wg0
# or
systemctl enable systemd-networkd   # with matching .netdev and .network files
```

#### Full validation suite

```bash
# 1. Confirm ruleset loads cleanly
nft list ruleset | wc -l    # non-zero means rules loaded

# 2. Test SSH from a DIFFERENT network path (not the same session)
ssh -v -o ConnectTimeout=5 user@host "echo OK"

# 3. Test blocked ports are actually blocked
nc -zv host 23    # telnet should be refused, not timeout
nc -zv host 3389  # RDP — if not needed, should be refused

# 4. Test ICMP
ping -c 3 host
ping6 -c 3 host   # IPv6

# 5. Verify forwarding (if applicable)
# From a WireGuard client:
curl --interface wg0 https://ifconfig.me   # should show server's exit IP

# 6. Connection tracking integrity
conntrack -L | wc -l       # should not be zero if established sessions exist

# 7. Rule hit counters (after a few minutes of traffic)
nft list ruleset | grep -A1 "counter"   # verify rules are being hit

# 8. Cancel rollback job
atq              # confirm pending job ID
atrm <job-id>   # cancel after all tests pass
echo "Rollback guard cancelled. Rules are permanent."
```

#### Final state checklist

- [ ] `nft list ruleset` reflects all intended rules.
- [ ] `systemctl status nftables` is `active (exited)` (oneshot) or `active (running)`.
- [ ] SSH from a second path succeeds.
- [ ] Blocked ports refused (not timeout — a timeout suggests a routing issue, not a firewall drop).
- [ ] WireGuard `latest handshake` fresh (< 3 min).
- [ ] Tailscale `tailscale ping` succeeds for all nodes.
- [ ] Rollback `at` job cancelled.
- [ ] Rules survive a reboot: `shutdown -r now` and re-verify.

**Completion criterion:** every checklist item checked, reboot test passed, rollback job
confirmed cancelled. The backup file is kept for 30 days.

---

## Reference

### nftables priority values

| Hook | Priority name | Numeric | Notes |
|---|---|---|---|
| Any | `raw` | -300 | Before conntrack |
| Any | `mangle` | -150 | Packet mangling |
| Any | `dstnat` | -100 | DNAT (prerouting) |
| Any | `filter` | 0 | Main filtering (default) |
| Any | `security` | 50 | SELinux |
| Any | `srcnat` | 100 | SNAT (postrouting) |

### RFC address ranges — firewall reference

```
RFC 1918 (private):
  10.0.0.0/8          Class A private
  172.16.0.0/12       Class B private
  192.168.0.0/16      Class C private

RFC 6598 (CGNAT):
  100.64.0.0/10       Shared address space (Tailscale uses this)

RFC 5737 (documentation):
  192.0.2.0/24        TEST-NET-1
  198.51.100.0/24     TEST-NET-2
  203.0.113.0/24      TEST-NET-3

RFC 3927 (link-local):
  169.254.0.0/16      IPv4 link-local (APIPA)
  fe80::/10           IPv6 link-local

RFC 4193 (IPv6 private):
  fc00::/7            Unique local addresses (ULA)

Loopback:
  127.0.0.0/8         IPv4 loopback
  ::1/128             IPv6 loopback

Multicast:
  224.0.0.0/4         IPv4 multicast
  ff00::/8            IPv6 multicast
```

### Diagnosis command cheat-sheet

```bash
# Real-time packet tracing (nftables)
nft add rule inet filter input meta nftrace set 1
nft monitor trace

# Drop reasons
nft list ruleset | grep -i drop
journalctl -k | grep -i "nft\|iptables"    # kernel log drops

# conntrack
conntrack -L -p tcp --dport 22              # active SSH sessions
conntrack -L --state ESTABLISHED | wc -l   # total established

# Routing trace
ip route get 8.8.8.8 from 192.168.1.5     # simulate routing decision
traceroute --sport=12345 8.8.8.8          # source-port aware trace

# WireGuard debug
wg show wg0 latest-handshakes             # Unix timestamps
wg show wg0 transfer                      # bytes sent/received per peer
wg show wg0 endpoints                     # resolved endpoints

# Tailscale diagnostics
tailscale netcheck                         # NAT type, DERP latency
tailscale bugreport                        # full diagnostic bundle
tailscale debug derp-map                   # DERP relay topology
```

### Lockout recovery playbook

If locked out despite precautions:

```
1. Provider OOB console (IPMI, VNC, serial) → revert backup:
      nft -f /root/firewall-backup-<timestamp>.nft

2. Cloud provider security groups (AWS SG / GCP firewall rules):
      Add inbound allow for port 22 from your IP via console

3. Single-user mode / rescue boot:
      Boot into rescue system → mount root → remove /etc/nftables.conf →
      replace with minimal allow-all → reboot

4. Systemd emergency target (physical access):
      systemctl emergency → edit /etc/nftables.conf → systemctl start nftables

5. If using WireGuard full-tunnel lockout:
      Provider console → ip route del 0.0.0.0/0 dev wg0 →
      ip route add 0.0.0.0/0 via <local-gw>
```

> [!TIP]
> Keep the provider OOB console URL and credentials in a password manager entry
> **before** starting any firewall change session on a remote host. Discovering you
> need it after the lockout is the worst time to find out you don't have it.
