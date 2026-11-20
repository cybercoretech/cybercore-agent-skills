# Evidence, Data Contracts, and Agent Capability Passports

This reference defines the logical records needed for portable evaluation and causal analysis. It is a conceptual contract, not a claim that the Workbench API exists or that its schemas are final. The Workbench's concrete v0 schemas live in its repository under `contracts/schemas/v0` (for example `common/record-envelope.schema.json` and `evaluation/run.schema.json`); prefer them over the illustrative shapes below when integrating with the Workbench.

## 1. Contract principles

- Every record has a stable ID, schema identifier/version, creation time, and provenance.
- Behavioral assets are identified by immutable revision or content hash where practical.
- Relationships use stable references, not copied narrative alone.
- Observations, inferences, hypotheses, and decisions are distinct fields or record types.
- Missing, redacted, and unavailable data are explicit; never substitute fabricated values.
- Raw evidence is preserved separately from summaries and model-generated interpretations.
- Large payloads may live in object storage; metadata carries a durable reference and integrity hash.
- Records are append-oriented. Corrections create a new revision or superseding record rather than silently rewriting history.
- Schema compatibility and migration rules are explicit.

## 2. Common identity and provenance

A common envelope should include, as appropriate:

```yaml
record_id: RUN-00042
record_type: evaluation_run
schema_id: "https://schemas.example.invalid/evaluation/run.schema.json"
schema_version: "1.0.0"
created_at: "2026-11-16T20:00:00Z"
source:
  system: local-runner
  component_version: "0.1.0"
  origin_id: local-session-9
provenance:
  parent_records: [EXP-0007, TASK-012]
  captured_by: runner
  capture_version: "1.0.0"
  integrity:
    algorithm: sha256
    digest: "example-digest-not-a-real-hash"
```

The URL and values are illustrative and intentionally do not match the Workbench v0 contracts (which use, for example, `record_type: run` and nest `source` inside `provenance`). A production schema should use a real organization-controlled schema namespace and validate timestamps, identifiers, and digests. Do not use `.invalid` as a deployed schema host.

## 3. Core logical records

### System fingerprint

Capture the evaluated configuration as a versioned manifest:

- `fingerprint_id` and revision.
- Model/provider/version and inference parameters.
- Agent runtime/harness/planner/orchestrator versions.
- Prompt/system instruction revisions or hashes.
- Skill identity, revision/hash, and platform discovery settings.
- Tool definitions, schemas, adapters, versions, permissions, and egress rules.
- Memory, retrieval, corpus/index, and embedding revisions.
- Environment/container image, OS/runtime, dependencies, fixtures, and resource limits.
- Grader, verifier, benchmark, and evaluator versions.
- Unknown or unobservable fields with reason.

Do not include secret values. Use secret identifiers or redacted references when necessary.

### Evaluation task

Capture task ID/revision, task family, objective, user-visible instruction, initial state, input/fixture references, permitted tools/effects, constraints, expected outcomes, acceptance criteria, verification plan, risk/difficulty strata, validity state, and provenance.

Keep hidden evaluator data separate from agent-visible input. Access controls should prevent the agent from reading hidden graders or answer keys when those must remain hidden.

### Experiment manifest

Capture decision question, design revision, baseline and treatment fingerprints, benchmark/task-set revisions, sampling frame, task strata, trial count/strategy, ordering/randomization, concurrency, budgets, timeouts, retries, network policy, grader/verifier versions, primary/secondary metrics, exclusions, stopping rules, approvals, and analysis plan.

### Run and trajectory

Capture run ID, task/experiment references, exact fingerprint, start/end times, run outcome, resource measurements, human interventions, and ordered event references. Events should include actor/component, event type, timestamps, inputs/outputs where safe, status, duration, correlation/parent IDs, source references, and redaction metadata.

Do not require hidden chain-of-thought. Observable actions, tool calls, state changes, outputs, and verification evidence are sufficient for rigorous evaluation and attribution. Capture private reasoning only if a system explicitly exposes it, policy permits collection, and the user has authorized it; it is not a prerequisite.

### Evidence artifact

Capture evidence ID, media/content type, source run/event/task, location or object reference, integrity hash, capture time, redaction status, access classification, retention policy, and a concise factual description. Separate evidence content from an evaluator's interpretation of that content.

### Verification result

Capture verifier ID/version, applicable criterion, target state inspected, method, result, evidence references, execution environment, timestamp, and limitations. A verification record should identify precisely what was checked and what was not.

### Failure and attribution

A failure record references the run and violated requirement/invariant, describes the observed outcome, links decisive event and any applicable detection, containment, and reporting gap references, and records verification evidence. Keep the three gap-reference sets distinct. An attribution report separately records competing hypotheses, status, confidence basis, causal graph, alternatives, and next tests. See `failure-attribution.md`.

### Intervention

Capture intervention ID/revision, hypothesis, target assets and revisions, proposed change, approvals, control/treatment definitions, safety/isolation design, benchmark/task set, trial protocol, expected mechanism, success criteria, rollback, results, uncertainty, side effects, and decision.

### Capability Passport

Capture a bounded evidence summary:

- Passport ID, revision, creation/expiry or review date.
- Exact system fingerprint and tested configuration.
- Intended workload, task families, operating conditions, and autonomy level.
- Benchmark identities/revisions and validity findings.
- Trial counts, denominators, outcome distributions, uncertainty, and exclusions.
- Demonstrated capabilities and per-dimension results.
- Safety gates and violations.
- Known failure clusters and attribution status.
- Cost, latency, and resource profile.
- Untested areas, environment assumptions, and evidence limitations.
- Decision state and permitted-use constraints.
- Links to underlying experiments, tasks, runs, verifiers, and evidence.

A passport is not a universal certification or guarantee. Material changes to the fingerprint may invalidate claims or require targeted re-evaluation.

## 4. References and integrity

Use stable IDs and explicit relationship types. An evidence reference should resolve to a durable record or explain why it cannot be accessed. When evidence is redacted, preserve the fact of redaction, reason, and impact on confidence.

Content hashes help detect accidental modification but do not prove who created an artifact or whether its contents are true. Use signatures or trusted attestations where the threat model requires authenticity. Preserve source identity and capture context.

## 5. Schema versioning and compatibility

Use semantic versioning for schema packages where appropriate, but define compatibility based on actual consumers:

- Additive optional fields may be backward-compatible if consumers ignore unknown fields safely.
- Changing field meaning, enum semantics, requiredness, identifier interpretation, or relationship type is potentially breaking.
- Never reuse a field name with a different meaning.
- Preserve schema version with each record.
- Define migration and dual-read strategies before changing stored records.
- Test Rust, TypeScript, and Python validation/serialization against shared fixtures.
- Validate round trips and unknown-field handling.

JSON Schema validates structure; it does not by itself enforce authorization, causal truth, evidence authenticity, or cross-record business invariants. Implement those checks separately.

## 6. Data minimization and retention

Capture only what is required for the evaluation and future reproducibility. Redact credentials, secrets, personal data, proprietary content, and unnecessary prompt/tool payloads. Define access, retention, deletion, export, and backup behavior for both metadata and artifacts.

Do not assume that storing a hash makes sensitive content safe to share. Avoid logging secrets in identifiers, URLs, error messages, or model-judge prompts. Separate public regression fixtures from restricted evidence.

## 7. Contract checklist

- Are record IDs stable and unique within their scope?
- Is schema version explicit?
- Can every material conclusion trace to evidence?
- Are fingerprints complete enough for the intended claim?
- Are unknown and redacted fields represented honestly?
- Are run outcome, verification, attribution, and evaluation decision separate?
- Are records immutable or revisioned?
- Are large artifacts referenced safely and integrity-checked?
- Are all schemas validated by multiple language implementations?
- Are authorization and retention rules defined outside structural schema validation?
