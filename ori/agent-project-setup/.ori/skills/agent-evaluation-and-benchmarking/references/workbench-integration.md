# CyberCore Agent Evaluation Workbench Integration

The [CyberCore Agent Evaluation Workbench](https://github.com/cybercoretech/cybercore-agent-evaluation) is a companion application in development. This reference captures its architectural direction so the skill can interact with it as capabilities land. It does not imply that any API, endpoint, CLI command, MCP tool, or hosted service is currently available.

**Current state:** the repository provides canonical v0 JSON Schema Draft 2020-12 contracts (`contracts/schemas/v0`) validated identically by Python, TypeScript, and Rust; a Rust evaluation core (domain invariants, run state machine, runner port, in-memory trial orchestration); and two local runners. The **Podman container runner** runs each attempt in a rootless container with no network, a read-only pinned image, size-capped tmpfs mounts, and cgroup memory/CPU/process limits that it verifies before running. The **Bubblewrap runner** is a lighter prototype without resource limits. Both share the host kernel, so neither is hostile-code isolation. It also provides, locally:

- append-only, contract-validated persistence (SQLite records plus a content-addressed evidence store);
- crash-safe scheduling with a fenced write-ahead journal and concurrent attempts;
- `run`, `run_event` and `verification_result` records, where pass/fail comes only from an independent verifier;
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

1. Write an evaluation file (`cybercore-workbench-evaluation/v0`) with the frozen schedule, a runner (`podman` with pre-pulled images, which is preferred when tasks need resource limits or their own toolchain; or `local_bubblewrap`), a verifier (`stdout_equals` or `checks`), and optionally `task_revisions` whose acceptance criteria set outcome rules. Keep expected outputs in the verifier section, never in a trial's `task_input`.
2. `workbench run <file> --dry-run` validates everything and writes nothing. Fix the field it names before running.
3. `workbench run <file>` runs or resumes the evaluation. Repeating it is safe: finished trials are not re-run, and interrupted attempts follow the schedule's retry policy.
4. `workbench status <evaluation-id> --json` is read-only and reports each trial's runs, verification state and outcome.

Respect the runners' documented limits: both share the host kernel, output is unredacted, and secrets must not go in task inputs. The container runner never pulls images and refuses to run if the cgroup limits are not enforced; report that to the user rather than switching to a weaker runner silently. A run stopped by a resource limit is an execution error (`not_scored`), not a task failure. Set `store_output_evidence` only for non-sensitive tasks. Treat failed or inconclusive outcomes as results to analyse, not as tool errors.

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
