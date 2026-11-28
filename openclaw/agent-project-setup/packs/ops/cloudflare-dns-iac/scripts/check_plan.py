#!/usr/bin/env python3
"""Check a Terraform/OpenTofu JSON plan for risky Cloudflare changes.

Usage:
    terraform plan -out=tfplan && terraform show -json tfplan > tfplan.json
    python3 check_plan.py tfplan.json

Exit codes: 0 = no errors (warnings and destructive changes may still be listed),
1 = errors found, 2 = bad input. Destructive changes are reported for approval but
do not fail the run on their own; pass --fail-on-destroy to make them fail it.

Handles provider v5 resource names and the main v4 names.
"""
from __future__ import annotations

import ipaddress
import json
import re
import sys
from collections import defaultdict

DNS = {"cloudflare_dns_record", "cloudflare_record"}
PROTECTED = DNS | {
    "cloudflare_zone", "cloudflare_zone_dnssec",
    "cloudflare_zero_trust_access_application", "cloudflare_access_application",
    "cloudflare_zero_trust_access_policy", "cloudflare_access_policy",
    "cloudflare_zero_trust_access_group", "cloudflare_access_group",
    "cloudflare_zero_trust_tunnel_cloudflared", "cloudflare_tunnel",
    "cloudflare_zero_trust_tunnel_cloudflared_config", "cloudflare_tunnel_config",
    "cloudflare_zero_trust_gateway_policy", "cloudflare_teams_rule",
    "cloudflare_workers_script", "cloudflare_worker_script",
    "cloudflare_workers_custom_domain", "cloudflare_worker_domain",
}
ACCESS_POLICY = {"cloudflare_zero_trust_access_policy", "cloudflare_access_policy"}
ACCESS_APP = {"cloudflare_zero_trust_access_application", "cloudflare_access_application"}
TUNNEL_CONFIG = {"cloudflare_zero_trust_tunnel_cloudflared_config", "cloudflare_tunnel_config"}
WORKER = {"cloudflare_workers_script", "cloudflare_worker_script"}
PROXIABLE = {"A", "AAAA", "CNAME"}
SECRETISH = re.compile(r"(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|PRIVATE)", re.I)


def is_ip(value: str) -> bool:
    try:
        ipaddress.ip_address(value.strip().rstrip("."))
        return True
    except ValueError:
        return False


def includes_everyone(rules) -> bool:
    """True if a v5 include list ([{everyone: {}}]) or v4 block ({everyone = true}) allows all."""
    if isinstance(rules, dict):
        rules = [rules]
    for rule in rules or []:
        # v5: {"everyone": {}} (empty object means "present"); v4: {"everyone": true}
        if isinstance(rule, dict) and "everyone" in rule and rule["everyone"] not in (None, False):
            return True
    return False


def main(argv: list[str]) -> int:
    args = [a for a in argv[1:] if not a.startswith("--")]
    fail_on_destroy = "--fail-on-destroy" in argv
    if len(args) != 1:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    try:
        with open(args[0], encoding="utf-8") as fh:
            plan = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"cannot read plan JSON: {exc}", file=sys.stderr)
        return 2

    findings: list[tuple[str, str, str]] = []  # (severity, address, message)
    names = defaultdict(list)  # (zone, fqdn) -> [(type, address, content)]

    for rc in plan.get("resource_changes", []):
        rtype, addr = rc.get("type", ""), rc.get("address", "?")
        change = rc.get("change", {})
        actions = change.get("actions", [])
        after = change.get("after") or {}

        if rtype in PROTECTED and "delete" in actions:
            kind = "REPLACE" if "create" in actions else "DELETE"
            findings.append(("DESTRUCTIVE", addr, f"{kind} of {rtype}"))

        if "delete" in actions and "create" not in actions:
            continue  # nothing left to validate

        if rtype in DNS:
            rtype_dns = str(after.get("type", "")).upper()
            name = str(after.get("name", "")).lower().rstrip(".")
            content = str(after.get("content", after.get("value", "")) or "")
            zone = str(after.get("zone_id", ""))
            names[(zone, name)].append((rtype_dns, addr, content))
            proxied = bool(after.get("proxied"))
            if proxied and rtype_dns and rtype_dns not in PROXIABLE:
                findings.append(("ERROR", addr, f"{rtype_dns} record cannot be proxied"))
            ttl = after.get("ttl")
            if proxied and ttl not in (None, 1):
                findings.append(("WARN", addr, f"proxied record has ttl={ttl}; proxied records use automatic TTL (1)"))
            if rtype_dns in {"MX", "NS"} and content and is_ip(content):
                findings.append(("WARN", addr, f"{rtype_dns} target {content} is an IP address; it must be a hostname"))

        elif rtype in ACCESS_POLICY:
            decision = str(after.get("decision", "")).lower()
            if decision == "allow" and includes_everyone(after.get("include")):
                findings.append(("ERROR", addr, "Access policy allows everyone"))
            if decision == "bypass":
                findings.append(("WARN", addr, "Access bypass skips identity checks; confirm it is scoped to public paths"))

        elif rtype in ACCESS_APP:
            pols = after.get("policies")
            if pols is not None and len(pols) == 0:
                findings.append(("WARN", addr, "Access application has no policies attached"))

        elif rtype in TUNNEL_CONFIG:
            cfg = after.get("config") or {}
            if isinstance(cfg, list):
                cfg = cfg[0] if cfg else {}
            ingress = cfg.get("ingress") or cfg.get("ingress_rule") or []
            if ingress and (ingress[-1] or {}).get("hostname"):
                findings.append(("ERROR", addr, "last tunnel ingress rule has a hostname; add a catch-all (service: http_status:404)"))

        elif rtype in WORKER:
            for b in after.get("bindings") or []:
                if isinstance(b, dict) and b.get("type") == "plain_text" and SECRETISH.search(str(b.get("name", ""))):
                    findings.append(("ERROR", addr, f"plain_text binding {b.get('name')} looks like a secret; use secret_text or wrangler secret put"))

    for (zone, name), recs in names.items():
        types = [t for t, _, _ in recs]
        if "CNAME" in types and len(recs) > 1:
            findings.append(("ERROR", recs[0][1], f"{name}: CNAME cannot share a name with other records ({', '.join(types)})"))
        spf = [a for t, a, c in recs if t == "TXT" and c.strip('"').lower().startswith("v=spf1")]
        if len(spf) > 1:
            findings.append(("ERROR", spf[0], f"{name}: {len(spf)} SPF records; there must be exactly one"))

    order = {"DESTRUCTIVE": 0, "ERROR": 1, "WARN": 2}
    for sev, addr, msg in sorted(findings, key=lambda f: (order[f[0]], f[1])):
        print(f"{sev:<11} {addr}: {msg}")
    errors = sum(1 for f in findings if f[0] == "ERROR")
    destroys = sum(1 for f in findings if f[0] == "DESTRUCTIVE")
    warns = sum(1 for f in findings if f[0] == "WARN")
    print(f"\n{errors} error(s), {destroys} destructive change(s), {warns} warning(s)")
    note = "Plan only sees records in this plan; run the live checks in SKILL.md §4 as well."
    print(note)
    if errors or (fail_on_destroy and destroys):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
