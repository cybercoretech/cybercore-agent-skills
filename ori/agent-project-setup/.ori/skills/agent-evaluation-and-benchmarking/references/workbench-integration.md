# CyberCore Agent Evaluation Workbench Integration

The CyberCore Agent Evaluation Workbench is a planned companion application. This reference captures the approved architectural direction so the skill can interact with it when it exists. It does not imply that the application, API, endpoint, CLI command, MCP tool, or hosted service is currently available.

## 1. Product boundary

The skill is the portable methodology and agent operating guide. The Workbench is optional software for persistent evidence, controlled execution, statistical analysis, cross-run failure investigation, intervention tracking, and capability passports.

The skill must remain useful without the Workbench. Do not invent service availability, endpoints, authentication methods, deployment status, or tool names. Inspect the companion repository and published API contract before integration.

## 2. Approved contract and protocol direction

- Public HTTP API: REST described initially with OpenAPI 3.1.1.
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

## 7. Future integration workflow

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
