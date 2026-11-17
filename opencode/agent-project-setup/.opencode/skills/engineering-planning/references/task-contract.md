# Orchestrator-Ready Task Contract

## 1. Purpose

A task contract is the portable agreement describing one unit of engineering work. It is the central interface between a plan, a human owner, an implementation agent, and an orchestrator.

It communicates intent and boundaries without requiring the recipient to reconstruct missing context from a conversation.

A contract does not prescribe every implementation detail. It defines what must be achieved, what must be preserved, what may be changed, and how completion will be recognized.

## 2. Contract completeness

A delegated task should answer:

1. What am I responsible for?
2. Why does this task exist?
3. Which requirements and decisions govern it?
4. What context and evidence do I need?
5. What am I allowed to change?
6. What must I preserve?
7. What must happen before I start?
8. Can I work in parallel, and under what conditions?
9. What must I produce?
10. How will completion be evaluated?
11. What should cause me to stop?
12. How do I report results or request reconciliation?

A missing field is not automatically a defect. It becomes a defect when the missing information is necessary for safe execution or coordination. Mark unknown or not-applicable values explicitly rather than inventing them.

## 3. Canonical contract model

This YAML is a reference representation, not a required orchestration platform.

```yaml
task:
  id: "TASK-001"
  parent_id: null
  title: "Validate plugin registrations"

  classification:
    type: "implementation"
    priority: "high"
    complexity: "medium"
    risk: "medium"
    confidence: "high"

  contract_revision: "1.0.0"
  lifecycle:
    status: "ready"
  approval:
    required: true
    status: "pending"
    approver: "Plugin feature owner"
    scope: "Plugin registration validation changes"
    conditions: []
    decided_by: null
    decided_at: null
    decision_ref: null
    evidence_ref: null
    rationale: null
  execution_authorization:
    status: "not_granted"
    authority: null
    scope: null
    evidence_ref: null

  ownership:
    accountable_owner: null
    executor: null
    contributors: []
    reviewer: null
    integrator: null
    suggested_role: "implementer"
    execution_mode: "independent"

  objective: >
    Reject invalid plugin registrations before they
    become available to the runtime.

  rationale: >
    Prevent invalid registry state and make registration
    failures explicit to callers.

  context:
    source_requirements:
      - "REQ-004"
    relevant_decisions:
      - "ADR-002"
    repository_evidence:
      - path: "src/plugins/registry.rs"
        detail: "Current registration entry point"
        confidence: "verified"

  scope:
    included:
      - "Validate registration requests"
      - "Return actionable validation errors"
    excluded:
      - "Implement plugin discovery"
      - "Change plugin loading lifecycle"

  dependencies:
    relationships:
      - id: "DEP-001"
        type: "hard"
        from: "TASK-000"
        to: "TASK-001"
        condition: "TASK-000 reaches lifecycle status done and publishes its output"
        status: "satisfied"
        evidence_ref: "PLAN-001/TASK-000/completion"
    resource_conflicts:
      - id: "RES-001"
        resource: "PluginRegistry interface"
        tasks: ["TASK-001", "TASK-002"]
        strategy: "single_owner"
        accountable_owner: null
    parallelism:
      safe: false
      assumptions: []
      synchronization_point: "INT-001"

  contracts:
    inputs:
      - "Plugin registration request"
    outputs:
      - "Validated registration result or defined error"
    interfaces:
      - "Existing PluginRegistry registration API"
    invariants:
      - "Invalid plugins never enter registry state"
      - "Existing valid registration behavior is preserved"

  implementation:
    approach: >
      Validate the request before mutating registry state.
    constraints:
      - "Preserve the public registration API"
    freedom:
      - "Internal helper structure may be chosen by implementer"

  acceptance_criteria:
    - id: "AC-001"
      condition: "Duplicate identifiers are rejected"
      verification: "Automated unit test"
    - id: "AC-002"
      condition: "Valid registrations preserve existing behavior"
      verification: "Regression test"

  verification:
    status: "not_started"
    required_checks:
      - "Relevant unit tests"
      - "Regression tests"
    optional_checks:
      - "Static analysis"
    completion_evidence:
      - "Test results"
      - "Files and interfaces changed"

  acceptance:
    required: true
    status: "pending"
    authority: "Plugin feature owner"
    scope: "TASK-001 implementation deliverables"
    criteria_refs: ["AC-001", "AC-002"]
    evidence_ref: null
    decided_by: null
    decided_at: null
    decision_ref: null
    conditions: []
    rationale: null

  failure_handling:
    stop_conditions:
      - "Required interface differs materially from the plan"
      - "Validation requires changing an approved public contract"
    escalation: "Return the discrepancy for plan reconciliation"

  handoff:
    deliverables:
      - "Implementation"
      - "Tests"
    report:
      - "Files changed"
      - "Behavior implemented"
      - "Verification results"
      - "Remaining limitations"
```

The example is illustrative. Its plugin names and paths are not claims about any particular repository. `TASK-000` represents a prerequisite task defined elsewhere in the same authoritative plan; `TASK-002` represents a downstream task enabled by this work. `INT-001` is the stable integration checkpoint defined in that plan's dependency model. If a prerequisite is outside the plan, represent it as a named `external` relationship rather than leaving an unresolved task ID.

## 4. Field semantics

### Identity
- `id`: stable, unique identifier within the plan.
- `parent_id`: optional parent task or milestone.
- `contract_revision`: immutable revision identifier for this task contract; increment or issue a new revision whenever execution meaning changes.
- `title`: concise outcome-oriented label.

### Classification
- `type`: investigation, design, implementation, testing, integration, migration, documentation, operations, or review.
- `priority`: relative importance, not a schedule promise.
- `complexity`: expected difficulty and interaction.
- `risk`: potential impact of failure.
- `confidence`: strength of evidence supporting the task definition.

Do not use labels as substitutes for explanation.

### Lifecycle, approval, and execution authorization

Canonical task lifecycle states:
- `proposed`: identified but not sufficiently defined.
- `ready`: technically ready; contract and prerequisites are sufficient for execution to be considered.
- `in_progress`: authorized execution has begun.
- `blocked`: a known prerequisite prevents progress.
- `needs_reconciliation`: evidence, requirements, or a changed contract invalidate the current execution assumptions.
- `in_review`: implementation deliverables are submitted and required verification and/or formal task acceptance is awaiting evaluation.
- `done`: required verification has passed (or is explicitly not required), task-level acceptance is `accepted`, `not_required`, or formally `waived`, and completion evidence is recorded.
- `cancelled`: no longer required.
- `superseded`: replaced by a materially revised task.

Lifecycle is not permission. `ready` never grants execution authority.

Typical task progression is `proposed` → `ready` → `in_progress` → `in_review` → `done`, subject to separate approval, execution-authorization, verification, and acceptance gates. A blocked task returns to `ready` if execution has not begun or `in_progress` if work had begun once its prerequisite is restored and its contract remains valid. A failed verification or rejected acceptance returns the task to `in_progress` for bounded corrective work, or to `needs_reconciliation` when the contract or governing requirements must change. A reconciled task receives a new contract revision before it returns to `ready` or `in_progress`. `cancelled` and `superseded` close that task record; do not silently reopen or rewrite its history.

A task may enter `in_review` when its implementation is submitted but required checks or acceptance remain outstanding. It must not enter `done` while verification is `not_started`, `in_progress`, `failed`, `blocked`, or `unknown`, or while required acceptance is `pending`, `rejected`, or `unknown`. A rejected acceptance requires corrective work or reconciliation; do not silently treat it as accepted. A waived acceptance gate requires an authorized waiver and durable evidence.

Approval is a separate, auditable object:
- `required`: whether a formal approval gate applies (`true`, `false`, or `unknown`).
- `status`: `not_required`, `pending`, `approved`, `rejected`, or `unknown`.
- `approver`: identity or role authorized to approve, if known.
- `scope`: the task action or deliverable covered by this approval gate.
- `conditions`: conditions attached to an approval.
- `decided_by`: actual decision-maker; required for `approved` or `rejected`.
- `decided_at`: timestamp or durable update marker for the decision.
- `decision_ref`: optional authoritative approval/decision record.
- `evidence_ref`: durable reference to approval evidence.
- `rationale`: decision rationale, required when approval is rejected.

If `required` is `false`, `status` must be `not_required`. If `required` is `true`, use `pending`, `approved`, `rejected`, or `unknown`. If `required` is `unknown`, keep `status` `unknown` until resolved. An `approved` or `rejected` state requires the named approver authority, scope, actual decision-maker, decision time/update marker, and durable evidence; `rejected` additionally requires a rationale. A `pending` state has no decision-maker or decision time yet. Preserve the history of approval changes; do not overwrite a rejection with a later approval without retaining both events. A fully defined approval gate may remain `pending` without making the task contract incomplete, but the governed action must not proceed until approved.

Execution authorization is separate again. Use explicit states such as `not_granted`, `granted`, `revoked`, or `unknown`, with authority, scope, and evidence reference. An approval decision may be necessary but is not necessarily sufficient for execution authorization. Assignment, role labels, orchestration, and technical readiness do not grant permission.

Unknown must remain unknown. Do not interpret missing, null, or unknown approval metadata as `not_required` or `approved`. A missing approval scope or authority means the approval gate is not yet sufficiently defined.

### Ownership and execution assignment
- `accountable_owner`: the single person or agent accountable for the task outcome and handoff.
- `executor`: the person or agent performing the work; may differ from the accountable owner.
- `contributors`: additional participants with bounded responsibilities.
- `reviewer`: person or agent responsible for review; independence requirements should be explicit.
- `integrator`: owner responsible for combining this task's output with other contributions, when applicable.
- `suggested_role`: capability recommendation only; it is not an assignment or permission.
- `execution_mode`: independent, sequential, coordinated, or integrative.

Keep accountability distinct from execution. One task has one accountable owner even if several contributors assist. Do not infer repository access, modification rights, or authorization from any role name.

### Context
Link requirements, decisions, evidence, and authoritative artifacts. Include enough detail to locate relevant material without copying large source files into every contract.

### Scope
`included` defines responsibility. `excluded` prevents accidental expansion and clarifies neighboring ownership.

### Dependencies and resource conflicts

The canonical source of truth is `dependencies.relationships`, a list of typed directed relationships. Each relationship has a stable ID, type, source and target IDs, condition, `status`, and evidence/reference as applicable. Use `status` consistently; do not alternate between `state` and `status` for the same property.

Supported relationship types:
- `hard`: target cannot start or complete until the source condition is satisfied; use direction prerequisite → dependent.
- `soft`: target may proceed under an explicit provisional assumption and must revalidate before the named gate.
- `integration`: independent contributions converge at a stable integration checkpoint; this is not automatically a start-order edge.
- `decision`: work depends on a decision record and its required state.
- `external`: work depends on a named outside actor/system/delivery/approval with owner, expected condition, and current `status`.

Model resource conflicts separately under `resource_conflicts`; include stable resource ID, resource identity, affected tasks, coordination strategy, and accountable owner. A conflict is not automatically a prerequisite.

`parallelism` records whether concurrent execution is safe, the assumptions supporting that claim, and relevant synchronization points. Legacy convenience fields such as `blocked_by` or `enables` may be derived for display, but must not replace typed relationship records.

### Contracts
Define inputs, outputs, interfaces, and invariants. Identify compatibility requirements and producer/consumer expectations where relevant.

### Implementation
Describe the intended approach and constraints. State where the implementer has freedom. Do not over-specify internal details unless they are architectural requirements.

### Verification and acceptance records
Acceptance criteria define what must be true. Verification records whether the defined checks were performed and what evidence they produced. Formal acceptance records whether the designated authority accepted the scoped outcome. These are separate decisions: passing tests does not itself constitute acceptance.

Use this verification status vocabulary:
- `not_started`: required checks have not begun.
- `in_progress`: one or more checks are underway.
- `passed`: every required check passed and its evidence is recorded.
- `failed`: one or more required checks failed.
- `blocked`: required verification cannot proceed because a prerequisite or environment is unavailable.
- `not_required`: no verification checks are required; justify this where the risk warrants it.
- `unknown`: the current verification result cannot be established.

Use the same acceptance record shape at task scope and plan/delivery scope:

```yaml
acceptance:
  required: true                 # true, false, or unknown
  status: "pending"              # not_required, pending, accepted, rejected, waived, unknown
  authority: "release-owner"     # person or role authorized to accept
  scope: "Defined deliverable"   # what this decision covers
  criteria_refs: ["AC-001"]      # stable acceptance-criterion IDs
  evidence_ref: null              # evidence supporting the acceptance decision
  decided_by: null               # actual decision-maker; required for accepted/rejected/waived
  decided_at: null               # timestamp or durable update marker for the decision
  decision_ref: null              # optional authoritative decision record
  conditions: []
  rationale: null
```

Consistency rules:
- If `required` is `false`, `status` must be `not_required`. If `required` is `true`, use `pending`, `accepted`, `rejected`, `waived`, or `unknown` as applicable. If `required` is `unknown`, keep `status` `unknown` until the requirement is resolved.
- `accepted`, `rejected`, and `waived` are authority decisions and require the named authority, actual decision-maker (`decided_by`), decision time/update marker (`decided_at`), scope, and durable evidence reference. Record any conditions.
- `rejected` additionally requires a rationale and does not satisfy the acceptance gate.
- `waived` requires an authorized waiver; do not infer waiver from omission or inactivity.
- `pending` means the required authority has not issued an acceptance decision and therefore has no decision-maker/time yet. `unknown` is not equivalent to pending, accepted, or not required.
- A change from `pending` to `accepted`, `rejected`, or `waived` must preserve the decision-maker, time, rationale/conditions, and evidence. A later decision after rejection must not erase the rejection history; record the later decision as a new event or revision.
- When `required` is `true`, `criteria_refs` must resolve to the stable acceptance-criterion IDs for the recorded scope. Do not treat free-text summaries as a substitute for criterion references when the contract is intended for orchestration.
- A task is `done` only when verification is `passed` or `not_required` and task-level acceptance is `accepted`, `not_required`, or formally `waived`. A task with a required acceptance decision pending remains `in_review` even when its tests pass.
- Plan/delivery acceptance is separate from task acceptance. A plan is not `completed` while required plan-level acceptance is pending, rejected, or unknown.

`completion_evidence` records implementation and verification artifacts. `acceptance.evidence_ref` records evidence supporting the authority's acceptance decision. They may point to the same durable artifact only when it genuinely supports both claims.

### Failure handling
List conditions requiring a stop, escalation, or reconciliation. Do not ask an agent to improvise around an invalid prerequisite or approved design conflict.

### Handoff
Define deliverables and the minimum completion report. A handoff is incomplete if it says only "done" without evidence.

## 5. Minimum viable contract

For a small, low-risk task, a compact contract may omit non-applicable detail but must preserve the canonical distinctions:

```yaml
task:
  id: "TASK-014"
  contract_revision: "1.0.0"
  title: "Correct timeout boundary condition"
  lifecycle:
    status: "ready"
  approval:
    required: false
    status: "not_required"
  execution_authorization:
    status: "unknown"
    authority: null
    scope: null
    evidence_ref: null
  ownership:
    accountable_owner: null
    executor: null
  objective: "Treat the configured timeout boundary consistently."
  scope:
    included: ["Timeout comparison"]
    excluded: ["Retry policy changes"]
  dependencies:
    relationships: []
    resource_conflicts: []
    parallelism:
      safe: true
      assumptions: ["No shared timeout policy is changed"]
  acceptance_criteria:
    - id: "AC-001"
      condition: "Boundary value behaves as specified"
  verification:
    status: "not_started"
    required_checks: ["Focused tests"]
    completion_evidence: []
  acceptance:
    required: false
    status: "not_required"
    authority: null
    scope: "TASK-014"
    criteria_refs: ["AC-001"]
    evidence_ref: null
    decided_by: null
    decided_at: null
    decision_ref: null
    conditions: []
    rationale: "No separate formal acceptance gate applies to this low-risk task."
  failure_handling:
    stop_conditions:
      - "Observed behavior conflicts with documented API semantics"
```

The compact form is a subset of the canonical model, not a separate schema. Do not set execution authorization to granted merely because the task is technically ready.

Do not force every optional field into a small task. Do not omit a critical field merely to keep the contract short.

## 6. Readiness gate

Before marking a task `ready`, ask:
- Is the objective unambiguous?
- Is the scope bounded?
- Are required decisions approved or explicitly unnecessary?
- Are prerequisites satisfied?
- Is relevant context discoverable?
- Are interfaces and invariants sufficiently clear?
- Are acceptance criteria observable?
- Is verification feasible?
- Are shared resources and parallel constraints identified?
- Are stop conditions clear where risk warrants them?

If not, keep the task proposed or blocked and name the missing condition.

## 7. Agent execution protocol

An executing agent should:
1. Read the contract and linked authoritative context.
2. Confirm prerequisites are satisfied.
3. Inspect current repository state before changing anything.
4. Stay within included scope and preserve stated invariants.
5. Report discoveries that materially contradict the contract.
6. Avoid silently changing approved interfaces or scope.
7. Produce deliverables and verification evidence.
8. Report changed files, decisions made within delegated freedom, checks run, failures, and limitations.

Stop and request reconciliation when a stop condition occurs.

## 8. Orchestrator interpretation

An orchestrator should derive:
- Eligible tasks.
- Blocked tasks and reasons.
- Ownership and suitable capabilities.
- Safe parallel groups.
- Shared-resource conflicts.
- Expected outputs.
- Acceptance gates.
- Escalation and reconciliation events.

The orchestrator must not infer permission from `suggested_role`, `priority`, task readiness, assignment, or a completed approval field. It must separately verify execution authorization, its scope, and any environment policy before dispatch. A task with status `ready` may remain undispatchable.

## 9. Contract anti-patterns

Avoid:
- A title and paragraph with no acceptance criteria.
- "Implement the feature" as the entire objective.
- Dependencies hidden in prose.
- `parallel_safe: true` without considering shared interfaces.
- Acceptance criteria such as "code is clean."
- Required tests that do not demonstrate the behavior.
- A suggested role mistaken for an assigned owner.
- A task marked ready while a critical decision is unresolved.
- A task whose output has no known integration point.
- A contract that asks an agent to redesign architecture without approval.


## 10. Canonical schema rules and compatibility

The canonical model in this reference is authoritative across the skill's examples and other references.

### Stable identifiers and revisions
- A plan has a stable `plan_id` and immutable `plan_revision`.
- A task has a stable `task.id` while its objective remains materially the same, plus an immutable `contract_revision`.
- A decision has a stable `decision_id` and immutable `decision_revision`.
- A dependency relationship has a stable `id`; if its meaning changes materially, revise the record and preserve history.
- An integration checkpoint has a stable `checkpoint_id` and revision.

A revision change that affects scope, interfaces, assumptions, dependencies, acceptance, ownership, or authorization must trigger reconciliation of affected active work. Do not silently overwrite the contract an executor accepted.

### External prerequisite record
An `external` relationship must identify, where known: external party/system, responsible contact or role, expected condition/output, current `status` (`unknown`, `pending`, `satisfied`, `failed`, `waived`), evidence reference, and any stated timing constraint. Do not invent an owner or due date.

### Priority and qualitative scales
Priority, complexity, risk, and confidence are independent dimensions. If a project uses qualitative levels, define its scale locally. At minimum, use consistent meanings: low, medium, high; explain the reason rather than treating labels as measurements. Unknown is not low.

### Acceptance and verification
Acceptance criteria describe required outcomes. Verification records the method and result. Completion evidence is the artifact or observation supporting the result. Avoid duplicating criterion-level verification and task-level checks: criterion verification maps each criterion to evidence; task-level checks cover broader build, regression, integration, and quality gates.

### Contract mapping
A host-specific task system may flatten or rename fields only if it preserves lifecycle, approval, execution authorization, accountability, assignment, typed dependencies, resource coordination, acceptance, verification, and revision semantics. If it cannot, keep the missing semantics in the authoritative plan and link them explicitly.
