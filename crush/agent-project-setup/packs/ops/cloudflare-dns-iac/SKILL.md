---
name: cloudflare-dns-iac
description: Manage Cloudflare DNS, Zero Trust (Access, Gateway, Tunnels) and Workers as infrastructure-as-code, and validate every change before it is applied. Use when asked to "change DNS records", "add a Cloudflare record", "terraform cloudflare", "OpenTofu cloudflare", "import Cloudflare into Terraform", "cf-terraforming", "migrate the Cloudflare provider to v5", "Access policy", "Zero Trust policy", "cloudflared tunnel ingress", "Gateway rules", "deploy a Worker", "wrangler deploy", "Worker routes or custom domains", "DNSSEC", "SPF/DKIM/DMARC records", "CAA records", or "check a Cloudflare plan before apply".
metadata:
  version: '1'
---
# Cloudflare & DNS Infrastructure-as-Code

Keeps Cloudflare DNS records, Zero Trust policies and Workers deployments in code, and
validates every change (syntax, plan, policy checks, live lookups) before anything reaches
the Cloudflare API.

> [!CAUTION]
> DNS and Access changes take effect globally within seconds, and resolvers cache the
> mistakes. A deleted MX record loses mail, a removed Access policy exposes an internal app,
> a disabled DNSSEC at the wrong time takes a zone offline for every validating resolver.
> This skill requires a recorded baseline (§1), a saved plan that passed the checks (§2–§5)
> and the owner's approval of that exact plan (§6) before any `apply` or `deploy`. Never run
> `terraform apply` without a saved plan file, never `-auto-approve` by hand, and never
> deploy a Worker straight to 100% when a gradual rollout is possible.

---

## Steps

### 1. Baseline — record what exists before changing it

```bash
# 1a. Tool versions (provider major decides resource names, see §7)
terraform version || tofu version
grep -A3 'cloudflare/cloudflare' .terraform.lock.hcl
wrangler --version
cloudflared --version 2>/dev/null || true

# 1b. Token scope — use a scoped API token, never the Global API Key
#     Read-only token for plan; a separate edit token for apply.
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify | jq '.result.status'

# 1c. Export the live zone (the restore point)
ZONE_ID=<zone-id>
STAMP=$(date +%Y%m%d-%H%M%S)
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/export" > "zone-$STAMP.bind"

# 1d. Live answers for the names you will touch (from outside Cloudflare's cache too)
for n in example.com www.example.com; do
  dig +short "$n" A @1.1.1.1; dig +short "$n" AAAA @1.1.1.1; dig +short "$n" CNAME @1.1.1.1
done
dig +short example.com MX @8.8.8.8
dig +short example.com TXT @8.8.8.8
dig +dnssec +short example.com DS @8.8.8.8      # DNSSEC state at the registrar

# 1e. Drift: does state match reality?
terraform plan -refresh-only -lock-timeout=60s
```

#### Baseline checklist — block on any unchecked item

- [ ] Provider major version known (v4 or v5); resource names in code match it.
- [ ] A scoped API token is in use; the plan token cannot edit.
- [ ] A BIND export of every affected zone is saved with a timestamp.
- [ ] Live `dig` answers for every affected name are recorded.
- [ ] `plan -refresh-only` shows no drift, or the drift is explained and imported (§7).
- [ ] Remote state backend with locking is configured (never local state for shared zones).

**Completion criterion:** the export file exists and is non-empty, drift is zero or
explained, and nothing has been changed yet.

---

### 2. Static validation — before any plan

```bash
terraform fmt -check -recursive
terraform init -backend=false -input=false
terraform validate
tflint --recursive                     # with the terraform ruleset enabled
# Optional: policy-as-code / misconfiguration scanners
trivy config .                         # or: checkov -d .
```

Code rules:

| Rule | Why |
|---|---|
| Pin the provider: `version = "~> 5.x"` and commit `.terraform.lock.hcl` | A provider major upgrade renames resources and can plan mass deletes |
| `zone_id` / `account_id` from variables or data sources, never pasted inline per record | One wrong ID edits another zone |
| One record = one resource keyed by a stable name (`for_each` over a map, not `count`) | `count` re-indexes and plans delete/create on every list edit |
| `lifecycle { prevent_destroy = true }` on zones, apex records, MX, DNSSEC and Access apps | Turns a catastrophic plan into an error |
| Secrets (tunnel tokens, service-token secrets, Worker secrets) come from variables marked `sensitive = true` or a secret store | Plans and state must not print them; state is still sensitive, so encrypt the backend |
| No `cloudflare_dns_record` for names a Worker custom domain or Pages project owns | Those create their own records; two owners fight |

**Completion criterion:** `fmt -check`, `validate` and `tflint` exit 0.

---

### 3. Plan and run the automated checks

```bash
terraform plan -out=tfplan -lock-timeout=60s
terraform show -json tfplan > tfplan.json
python3 <this-skill-dir>/scripts/check_plan.py tfplan.json   # add --fail-on-destroy in CI
```

`scripts/check_plan.py` (standard library only) reads the JSON plan and exits 1 on errors,
2 on unreadable input. It only sees resources in this Terraform configuration; records
managed elsewhere (dashboard, Pages, Worker custom domains) need the live checks in §4. It reports:

| Severity | Check |
|---|---|
| **DESTRUCTIVE** | Any delete or replace of a DNS record, zone, DNSSEC, Access app/policy/group, tunnel, Gateway policy or Worker script |
| **ERROR** | `proxied = true` on a type that cannot be proxied (only A, AAAA, CNAME can) |
| **ERROR** | A CNAME sharing its name with any other record (CNAME must be alone at a name) |
| **ERROR** | More than one SPF (`v=spf1`) TXT record at the same name |
| **ERROR** | An Access policy that allows `everyone` |
| **ERROR** | A tunnel config whose last ingress rule has a hostname (no catch-all) |
| **ERROR** | A Worker `plain_text` binding whose name looks like a secret (KEY, TOKEN, SECRET, PASSWORD) |
| WARN | Proxied record with an explicit TTL other than 1 (proxied records use automatic TTL) |
| WARN | Access `bypass` decisions; Access applications with no policies attached |
| WARN | An MX or NS record whose target is an IP address instead of a hostname |

Read the human plan too. The checker catches patterns; you catch intent.

```bash
terraform show tfplan | less
terraform show -json tfplan | jq -r '.resource_changes[] | select(.change.actions != ["no-op"]) | "\(.change.actions|join("+")) \(.address)"'
```

**Completion criterion:** the checker exits 0 (or every DESTRUCTIVE line is intended and
listed for approval), and the plan contains only the changes the task asked for.

---

### 4. Validate DNS semantics — the checks a plan cannot do

For every created or changed record, confirm against live DNS:

#### Record rules

| Record | Validate |
|---|---|
| **A / AAAA** | Target IP is yours and reachable; private (RFC 1918) addresses never published publicly unless intentional |
| **CNAME** | Target resolves (`dig +short <target>`); no other record at the same name; apex CNAMEs rely on Cloudflare CNAME flattening |
| **Dangling CNAME** | Target on a third-party platform (GitHub Pages, S3, Heroku, Azure, Netlify, Vercel) must still be claimed by you, or the name can be taken over |
| **MX** | Points at hostnames (not IPs, not CNAMEs); priorities intended; never proxied |
| **TXT / SPF** | One `v=spf1` record per name; ≤10 DNS lookups (`include`, `a`, `mx`, `redirect`, `exists`); ends with `~all` or `-all` |
| **DKIM** | Selector record (`<selector>._domainkey`) matches the provider's published key exactly; no line breaks inside the key |
| **DMARC** | `_dmarc` TXT starts `v=DMARC1;`, has `p=`; roll out `none` → `quarantine` → `reject` while watching `rua` reports |
| **CAA** | Lists every CA that issues for the zone. With Cloudflare edge certificates, keep Cloudflare's CAs allowed (check the current list in Cloudflare's docs) or certificate renewal fails |
| **NS (delegations)** | Child zone exists at the target nameservers before delegating |
| **Wildcard** | `*.example.com` does not shadow names that should not exist; specific records still win |

```bash
# SPF lookup count (rough): count mechanisms that cost a lookup
dig +short example.com TXT | grep -o 'include:[^ "]*\|a:[^ "]*\|mx[: ]\|redirect=[^ "]*\|exists:[^ "]*' | wc -l
# Dangling check for a CNAME target
dig +short www.example.com CNAME; dig +short "$(dig +short www.example.com CNAME)" A
```

#### DNSSEC — order of operations

| Action | Safe order |
|---|---|
| **Enable** | Enable signing in Cloudflare → wait until the DS record is shown → add DS at the registrar → verify with `dig +dnssec` and a DNSSEC analyser |
| **Disable** | Remove DS at the registrar → wait for the parent TTL (often 24–48h) → then disable signing in Cloudflare |
| **Move zone / change nameservers** | Remove DS first, or migrate keys; never change nameservers with a stale DS in place |

Getting the order wrong makes the zone fail validation everywhere (SERVFAIL), not just break one record.

**Completion criterion:** every new or changed name has a recorded expected answer, no CNAME
conflicts, SPF/DKIM/DMARC/CAA rules pass, and any DNSSEC change follows the order above.

---

### 5. Validate Zero Trust and Workers changes

#### Access (applications, policies, groups)

- **Default deny:** an application is only protected if it has an Allow policy that is narrower
  than `everyone`. Policies are evaluated in precedence order; the first matching decision wins.
- **Rule logic:** `include` = OR (any match qualifies), `require` = AND (every rule must also
  match), `exclude` = NOT. An Allow with only `include: everyone` is public.
- **`bypass`** skips Access entirely (no identity, no logs of who). Only for health checks or
  public assets, and scoped to exact paths.
- **`service_auth` / service tokens** for machine clients; rotate tokens and set an expiry.
- **Session duration:** set it explicitly. In provider v5 the schema default is `24h`, and some
  accounts enforce a lower maximum, so `plan` succeeds but `apply` fails.
- **Provider v5:** policies are account-level (`account_id`, not `zone_id`). App-scoped
  policies live **inline** in the application's `policies` attribute.
- **Test before and after:** an unauthenticated request must be redirected to login or denied.

```bash
curl -sI https://app.example.com | head -5      # expect 302 to the team domain login, or 403
```

#### Gateway (DNS / HTTP / network policies)

- Rules apply in precedence order. A broad Allow above a Block silently disables the Block.
- Test a new Block rule on a test device group before it reaches everyone.

#### Tunnels (`cloudflared`)

```bash
cloudflared tunnel ingress validate                         # config syntax and catch-all
cloudflared tunnel ingress rule https://app.example.com     # which rule a URL hits
```

- The last ingress rule must have **no hostname** (catch-all), usually `service: http_status:404`.
- Every public hostname routed to a tunnel should also have an Access application in front of
  it unless it is deliberately public.
- Tunnel tokens are secrets: never commit them; inject at runtime.

#### Workers (`wrangler`)

```bash
npx tsc --noEmit 2>/dev/null || true                 # if TypeScript
npx vitest run                                       # tests (Workers Vitest integration if used)
wrangler deploy --dry-run --outdir dist/             # bundles without uploading; shows Total Upload size
wrangler versions upload                             # uploads a version, serves no traffic yet
wrangler versions deploy <new-id>@10% <old-id>@90% -y    # gradual rollout
wrangler rollback [<version-id>] --message "reason"      # instant rollback to a previous version
```

Workers checklist:
- [ ] `compatibility_date` set and not moved without reading the change notes.
- [ ] Secrets set with `wrangler secret put`, never in `vars` or the config file.
- [ ] Routes and custom domains do not collide with records managed in Terraform (§2) or with another Worker's route.
- [ ] Bindings (KV, D1, R2, Durable Objects, Queues) point at the right environment's resources, not production from a staging config.
- [ ] Bundle size from the dry run is within the plan's limit.
- [ ] If Terraform also manages the Worker (`cloudflare_workers_script`), only one tool deploys it.

**Completion criterion:** Access changes leave no public app by accident, tunnel ingress
validates with a catch-all, and the Worker has passed tests and a dry run, with a version
uploaded and a rollout percentage chosen.

---

### 6. Apply — only the approved plan

1. Show the owner: the checker output, the list of changed addresses, every DESTRUCTIVE line,
   and the rollback plan. Get approval for **this plan file**.
2. Apply exactly that plan; a fresh `plan` during apply could differ.

```bash
terraform apply tfplan            # applies the saved plan; no re-plan, no prompt bypass
```

3. Workers: raise the rollout in steps (10% → 50% → 100%) while watching errors
   (`wrangler tail`, Workers analytics). Roll back at the first error spike.
4. If the apply fails partway, **stop**. Run `terraform plan` again to see the real state
   before doing anything else; do not re-run apply blindly.

**Completion criterion:** apply finished with the expected counts (`N added, N changed,
N destroyed` matching the approved plan) and no errors.

---

### 7. Import and migrate (when code does not match reality)

```bash
# Generate config and import commands for existing resources
cf-terraforming generate --resource-type cloudflare_dns_record --zone $ZONE_ID > dns.tf
cf-terraforming import   --resource-type cloudflare_dns_record --zone $ZONE_ID
# Use the resource type name of your provider major (v4: cloudflare_record), and a
# cf-terraforming release that supports it.
# Terraform ≥1.5: prefer `import {}` blocks, then plan until it shows no changes
```

**Provider v4 → v5** renames most resources (`cloudflare_record` → `cloudflare_dns_record`,
`cloudflare_access_application` → `cloudflare_zero_trust_access_application`,
`cloudflare_access_policy` → `cloudflare_zero_trust_access_policy`, `cloudflare_tunnel` →
`cloudflare_zero_trust_tunnel_cloudflared`, `cloudflare_worker_script` →
`cloudflare_workers_script`, `cloudflare_teams_rule` → `cloudflare_zero_trust_gateway_policy`).

```bash
tf-migrate migrate --dry-run --source-version v4 --target-version v5   # preview
tf-migrate migrate --source-version v4 --target-version v5
```

> [!WARNING]
> App-scoped Access policies (`cloudflare_access_policy` with `application_id`) are not
> converted automatically. `tf-migrate` removes them, but you must add them **inline** to the
> application's `policies` attribute **before** applying. Applying in between sends an empty
> policy list, which detaches every policy from the application. Read the provider's v5
> migration guide for the resources you use, then require a plan with **zero** destroys
> before applying the migration.

**Completion criterion:** after import or migration, `terraform plan` shows no changes.

---

### 8. Verify after apply

```bash
# DNS answers from multiple resolvers match the expected values from §4
for r in 1.1.1.1 8.8.8.8 9.9.9.9; do dig +short app.example.com @$r; done
# Mail still flows: MX, SPF, DKIM, DMARC unchanged unless intended
dig +short example.com MX; dig +short _dmarc.example.com TXT
# HTTPS and certificates
curl -sI https://example.com | head -3
# Access still blocks anonymous users
curl -sI https://app.example.com | head -3
# Worker version serving
wrangler deployments list | head -15
# No drift left behind
terraform plan -detailed-exitcode     # exit 0 = no changes
```

#### Final checklist

- [ ] Every changed name answers as expected from three resolvers.
- [ ] Mail records unchanged unless the task changed them.
- [ ] Protected apps still require login; public apps still public.
- [ ] Worker at 100% only after a clean watch period; previous version ID noted for rollback.
- [ ] `terraform plan -detailed-exitcode` returns 0.
- [ ] Baseline export kept until the change has been stable for a week.

**Completion criterion:** every checklist item checked.

---

## Reference

### Rollback paths

| Change | Rollback |
|---|---|
| DNS record (Terraform) | `git revert` the change → plan → apply; or restore single records from the BIND export |
| Whole zone emergency | Import the BIND export through the dashboard or API, then re-import into state |
| Access policy | Revert the commit and apply; for an exposed app, add a temporary Block-everyone policy at top precedence first |
| Tunnel ingress | Restore the previous config and restart `cloudflared` (or revert remote config) |
| Worker | `wrangler rollback <previous-version-id>` |
| DNSSEC broken | Remove the DS at the registrar first; validation recovers after parent TTL |

### Proxy and TTL rules

| Type | Proxiable | TTL when proxied |
|---|---|---|
| A, AAAA, CNAME | Yes | Automatic (`ttl = 1`) |
| MX, TXT, NS, SRV, CAA, others | No | n/a |

### Lookup cheat-sheet

```bash
dig +trace example.com                  # delegation path
dig example.com NS +short               # nameservers in use
dig example.com SOA +short              # serial (did the change publish?)
dig +dnssec example.com A               # RRSIG present?
dig @<ns>.ns.cloudflare.com example.com # authoritative answer, bypassing caches
```
