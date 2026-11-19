# CyberCore Agent Evaluation Workbench Integration

The [CyberCore Agent Evaluation Workbench](https://github.com/cybercoretech/cybercore-agent-evaluation) is a companion application in development. This reference captures its architectural direction so the skill can interact with it as capabilities land. It does not imply that any API, endpoint, CLI command, MCP tool, or hosted service is currently available.

**Current state:** the repository provides canonical v0 JSON Schema Draft 2020-12 contracts (`contracts/schemas/v0`) validated identically by Python, TypeScript, and Rust; a Rust evaluation core (domain invariants, run state machine, runner port, in-memory trial orchestration); and two local runners. The **Podman container runner** runs each attempt in a rootless container with no network (unless the trial has an allowlist, see below), a read-only pinned image, size-capped tmpfs mounts, and cgroup memory/CPU/process limits that it verifies before running. The **Bubblewrap runner** is a lighter prototype without resource limits. Both share the host kernel, so neither is hostile-code isolation. It also provides, locally:

- append-only, contract-validated persistence (SQLite records plus a content-addressed evidence store);
- crash-safe scheduling with a fenced write-ahead journal and concurrent attempts;
- `run`, `run_event` and `verification_result` records, where pass/fail comes only from an independent verifier: exact checks on stdout and output files, a Claude **model judge** for rubric criteria, or a **composite** of both, with each verdict recording which verifier produced it;
- outcome rules taken from stored `task_revision` acceptance criteria;
- opt-in collection of files a task writes to `/workspace/output`;
- the local `workbench` CLI.

The API, MCP tools, hosted persistence (D1/R2) and the hosted service are not implemented. Re-check the repository README before relying on this summary.

## 1. Product boundary

The skill is the portable methodology and agent operating guide. The Workbench is optional software for persistent evidence, controlled execution, statistical analysis, cross-run failure investigation, intervention tracking, and capability passports.

The skill must remain useful without the Workbench. Do not invent service availability, endpoints, authentication methods, deployment status, or tool names. Inspect the companion repository and published API contract before integration.

## 2. Approved contract and protocol direction

- Public HTTP API: REST described with OpenAPI. The version is not frozen: Workbench ADR 0004 compares 3.2.1 with 3.1.2 against the real toolchain before any `openapi.yaml` is written, falling back to the current 3.1.x patch line if 3.2 support is incomplete.
- Canonical data payloads: JSON Schema Draft 2020-12.
- Asynchronous channel/message contracts: AsyncAPI 3.1.
- Event envelope: CloudEvents 1.0 where suitable.
- Agent integration: a distinct MCP adapter that calls application services through supported interfaces.
- Internal Cloudflare Workers communication: provider-native Service Bindings/RPC where suitable.
- Optional future inter-service RPC: evaluate Connect RPC/Protocol Buffers only when scale and interoperability justify it.
- GraphQL and tRPC are not initial requirements.

Protocol versions are design choices, not a reason to avoid testing generators, validators, and client compatibility. Keep schemas authoritative and test generated artifacts.

## 3. Planned hosting direction

The initial hosted control plane is intended for Cloudflare:

- Workers for API and lightweight service logic.
- D1 for structured metadata and relationships.
- R2 for larger execution evidence and artifacts.
- Queues for asynchronous processing.
- Workflows for durable multi-stage orchestration.
- Durable Objects for coordination and stateful real-time components where needed.
- Containers or sandboxes for optional bounded cloud execution.

Keep Cloudflare-specific adapters behind provider interfaces. The local CLI and evaluation engine must not require Cloudflare credentials or resources. A self-hosted runner should be possible through a defined runner protocol.

## 4. Local-first and deployment modes

Planned modes:

- **Local:** CLI, local metadata/artifact storage, local runner.
- **Private hosted alpha:** CyberCore-operated Cloudflare service for internal use; no public registration initially.
- **Self-hosted:** user-operated API/storage and local or remote runners.
- **Connected:** imports from existing tracing/evaluation platforms.
- **Future multi-tenant hosted service:** only after authentication, tenant isolation, quotas, retention, audit, and support requirements are proven.

Public source code and a private hosted alpha are compatible. Never embed private deployment credentials in the public repository or skill.

## 5. Planned architectural separation

The intended design separates:

- Canonical domain/evaluation logic.
- Contracts and schema validation.
- API and authentication adapters.
- Storage implementations.
- Job orchestration.
- Execution runners.
- Provider/framework integrations.
- Analysis and reporting.
- Dashboard and visualization.
- MCP tools/resources.

The core evaluation model should not depend on Cloudflare-specific types. Runners return normalized execution records and evidence references. The analysis layer consumes versioned records rather than reading directly from a vendor's trace database.

## 6. Security boundaries

Assume imported traces and agent-generated code may be sensitive or hostile. Require:

- Explicit consent for remote uploads and external model judging.
- Redaction before persistence or export.
- Separate authentication and authorization for projects and artifacts.
- Per-run and per-tenant resource limits.
- Isolated benchmark execution and bounded network egress.
- No production secrets or unrestricted credentials in evaluated containers.
- Idempotent asynchronous processing.
- Audit records for approvals, interventions, and access to sensitive evidence.
- Configurable retention and deletion behavior.

A cloud sandbox is not permission to run any arbitrary workload. Validate provider isolation guarantees and limits before deployment.

## 7. Local workflow with the `workbench` CLI

When the user has the Workbench checked out and the CLI built, it can run and inspect local evaluations without any service:

1. Write an evaluation file (`cybercore-workbench-evaluation/v0`) with the frozen schedule, a runner (`podman` with pre-pulled images, which is preferred when tasks need resource limits or their own toolchain; or `local_bubblewrap`), a verifier (`stdout_equals`, `checks`, `model_judge`, or a `composite` of several), and optionally `task_revisions` whose acceptance criteria set outcome rules. Keep expected outputs in the verifier section, never in a trial's `task_input`. To support a claim that one agent beats another, add an `analysis_plan` to the new agent's file **before its first run**: a `decision_question` and `comparisons`, each naming the `baseline_evaluation_id`, `alpha` (default 0.05), `minimum_matched_tasks` (default 10, at least 5) and optionally a `practical_significance_threshold`.
2. `workbench run <file> --dry-run` validates everything and writes nothing. Fix the field it names before running.
3. `workbench run <file>` runs or resumes the evaluation. Repeating it is safe: finished trials are not re-run, and interrupted attempts follow the schedule's retry policy. The first run freezes the `analysis_plan` as an `evaluation_plan` record before any trial runs. A later run with an edited plan is refused: a changed plan needs new evaluation and plan IDs, never an edit to the frozen one.
4. `workbench status <evaluation-id> --json` is read-only and reports each trial's runs, verification state and outcome.
5. `workbench summary <evaluation-id> --json` gives the pass rate with a 95% interval and records `metric_result` and `analysis_result` records. `workbench compare <baseline-id> <treatment-id> --json` compares two evaluations paired by task and records a `comparison_result`.

When reporting summaries and comparisons:

- Report the pass rate with its interval, status and notes, never the bare number. Trials without a verdict count as not passed, so say how many there were, and fix their cause (for example missing judge credentials) before drawing conclusions.
- `descriptive_only` (fewer than 10 trials with an outcome, unrun trials, or too few tasks for an interval) and `insufficient_data` results do not support claims about which agent is better.
- Comparisons are paired by task. Read `inferential_status`:
  - `confirmatory` means the comparison matched a frozen, predeclared plan, the plan was frozen before the treatment's first result, and the declared minimum of matched tasks was met. The declared rule (Bonferroni-split `alpha`, McNemar's test or the paired bootstrap interval at 1 − level) was applied unchanged. Cite the `declared_comparison_id` and report `practical_significance` when a threshold was declared.
  - `exploratory` means one of those conditions was not met; the notes say which. Claim a direction only when the comparison says `favors_baseline` or `favors_treatment`, and say it was not predeclared.
  - Never declare or edit a plan after seeing results to make a comparison confirmatory; the workbench detects late declarations and keeps them exploratory.
- If the comparison is `not_comparable`, do not compare the pass rates by hand: the evaluations ran different task revisions.
- To compare agents fairly, run the same task revisions with the same verifier for each agent, and use enough distinct tasks (at least 5 for an interval, ideally many more): repeating a few tasks does not add independent evidence.
- Summaries also report speed and cost (`speed_and_cost` in `--json`). Wall time is measured by the runner. Tokens are **self-reported**: an agent may write `/workspace/output/cybercore-usage.json` (`{"format": "cybercore-usage/v0", "models": [{"model_id", "input_tokens", "output_tokens"}], "tool_calls"}`, with `collect_outputs: true`), and cost comes from the evaluation file's declared `pricing` (prices per million tokens per model). When reporting:
  - always say token and cost figures are agent-reported and unverified, and that cost is an estimate from declared prices, not a bill;
  - report missing, invalid or unpriced reports instead of averaging over the trials that happened to report; a `descriptive_only` result does not support a cost claim;
  - never compare costs computed under different price tables (the workbench marks them `not_comparable`);
  - speed and cost comparisons are always exploratory, and lower is better;
  - present quality, speed and cost together (for example "same pass rate, 60% faster, 67% cheaper on matched tasks") rather than a single winner;
  - do not rely on self-reported tokens to audit an agent that may under-report.

Respect the runners' documented limits: both share the host kernel, output is unredacted unless credentials were granted, and secrets must never go in task inputs or evaluation files. The container runner never pulls images and refuses to run if the cgroup limits are not enforced; report that to the user rather than switching to a weaker runner silently. A run stopped by a resource limit is an execution error (`not_scored`), not a task failure. Set `store_output_evidence` only for non-sensitive tasks. Treat failed or inconclusive outcomes as results to analyse, not as tool errors.

When using the `model_judge` verifier:

- Prefer exact checks wherever a criterion can be checked exactly, and judge only what genuinely needs judgment. A model judge can be mistaken, and the judged output may try to influence it; each verdict records that limitation.
- Judged outputs are sent to the Anthropic API. The evaluation file must set `consent_to_send_outputs: true`; confirm with the user before doing so for anything that is not synthetic or public, and before running an evaluation that will be billed to their credentials.
- Credentials come only from `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN`; never put a key in an evaluation file or a command line.
- A judge failure (no credentials, an API error such as an exhausted credit balance, a refusal, oversized output) is recorded as `unavailable` or `inconclusive` with the reason, never as a pass. Read the verification record's limitations before concluding anything about the agent.
- In a `composite`, criterion IDs must be unique per trial across the verifiers.

When an agent under test needs network access (for example to call a model API):

- Use the Podman runner with a `runner.egress` block, and give only the trials that need it a `network_policy` of `{"mode": "allowlist", "hosts": [...]}` listing exact host names. Every other trial keeps `deny_all`. Ask the user which hosts to allow; never allow more than the task needs.
- The container still has no network of its own: an HTTPS proxy in the workbench admits only `CONNECT` to the listed names (TLS with a matching server name, no IP addresses, no private destinations), within per-run connection and byte limits. Every attempt is recorded in the run output under `network.egress`, so read it when analysing a run.
- Credentials are named in `runner.egress.credentials` with `from_env` (a host environment variable) and requested per trial in `task_input.credentials`. Never write a key's value into an evaluation file, and confirm with the user before granting a real or billed key. Use a scoped, low-limit key where possible: the allowed service sees whatever the agent sends, and redaction only catches the exact value in stdout, stderr and collected files.
- Egress needs a statically linked `cybercore-egress-forwarder` (the workbench names the build command if it is missing). If the user's environment cannot provide it, say so rather than falling back to a runner with weaker isolation.

## 8. Future integration workflow

When the Workbench becomes available:

1. Read its current README, OpenAPI document, schemas, and authentication guidance.
2. Verify service and feature availability; never infer it from roadmap documents.
3. Check contract versions and compatibility.
4. Authenticate using the supported method and least privilege.
5. Upload only approved, minimized, redacted evidence.
6. Submit idempotent requests and handle asynchronous status/events.
7. Retrieve results with provenance references.
8. Independently inspect critical evidence rather than trusting a dashboard summary alone.
9. Report API/tool limitations and partial failures honestly.

If no Workbench integration is available, use a local workflow, an established third-party tool, or manual artifacts without blocking evaluation.
