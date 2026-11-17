# Persistent Planning Artifacts

## 1. Purpose

A persistent plan preserves intent, decisions, task contracts, and execution state across sessions, context compaction, and agent handoffs.

The objective is not to create the maximum number of documents. It is to maintain one understandable source of truth and the supporting artifacts needed to execute safely.

## 2. Authoritative plan

Choose one authoritative plan location appropriate to the project and workflow.

Possible locations include:
- A repository planning directory.
- A host-native plan artifact.
- An issue or project tracker with structured task records.
- A user-designated document.

Follow existing project conventions. Do not create a parallel planning system when the project already has an accepted one.

The plan should identify:
- Stable plan ID and title.
- Objective and scope.
- Stable `plan_id` and immutable `plan_revision`.
- `readiness` and `status` as separate fields.
- Implementation lifecycle summary derived from task states, not conflated with plan status.
- Requirements and constraints.
- Decisions and their status.
- Task contracts or links to them.
- Dependency and integration model.
- Open questions and blockers.
- Acceptance and verification approach.
- Completion evidence.
- Last reconciliation and rationale.

## 3. Optional artifact set

Use only artifacts that add value.

| Artifact | Purpose | Use when |
|---|---|---|
| Plan overview | Objective, scope, approach, and status | Most structured plans |
| Task contracts | Executable units of work | Delegation or multi-task work |
| Dependency model | Ordering, concurrency, integration | Meaningful task relationships |
| Decision records | Durable consequential choices | Architecture or compatibility decisions |
| Risk register | Material risks and mitigations | Elevated risk or uncertainty |
| Verification plan | System-level test and evidence strategy | Multi-component or high-impact changes |
| Migration/recovery plan | Data and operational sequencing | Persistent data or rollout risk |
| Handoff summary | Resume context for another agent or session | Context switch or long-running work |

These may be sections in one document or separate files. Avoid redundant copies.

## 4. Decision management

Use explicit decision lifecycle states:
- `proposed`: under consideration.
- `approved`: accepted by the appropriate authority within a defined scope.
- `rejected`: considered and not selected.
- `superseded`: replaced by a later decision.

Implementation verification is a separate field, not a decision status. When relevant, record an `implementation_verification` object with the canonical verification status (`not_started`, `in_progress`, `passed`, `failed`, `blocked`, `not_required`, or `unknown`), evidence reference, verifier, and timestamp/update marker. `passed` means implementation evidence confirms the decision was implemented as intended; it does not change the decision's lifecycle status or substitute for approval.

The normal decision progression is `proposed` → `approved` or `rejected`; a later decision may supersede either outcome. Record every decision-status transition with its actor, time/update marker, rationale, and evidence. Increment `decision_revision` when decision content or scope changes; retain earlier revisions and their approval/rejection provenance. Do not use `verified` as a decision status; record implementation verification independently.

A decision record should capture:
- Stable `decision_id`, immutable `decision_revision`, and title.
- Status.
- Context.
- Decision.
- Rationale.
- Alternatives considered when consequential.
- Consequences and constraints.
- Related requirements and tasks.
- Approver identity or role, timestamp, source/reference, approval scope, and conditions, when known.
- Approval evidence reference; never invent missing provenance.

Do not imply that an agent's suggestion is an approved decision. Preserve the reason and relationship when a decision is superseded.

## 5. Revision and change history

Record meaningful plan changes:
- What changed.
- Why it changed.
- Which evidence or requirement triggered it.
- Which tasks and dependencies are affected.
- Whether approval is required.
- Which previous decisions or task contracts are superseded.

Stable task IDs should remain stable when task meaning remains stable. If the objective changes materially, supersede the old task and create a new one with traceability.

A revision history should record previous and new revision IDs, timestamp or update marker, rationale and triggering evidence, affected requirements/tasks/decisions/dependency relationships/checkpoints, whether active execution must pause or may continue under the prior contract, and which owners/agents must be notified. A revision history need not record every wording edit. It must preserve changes affecting execution, responsibility, acceptance, risk, or coordination.

## 6. Context-loss and session recovery

When resuming work:
1. Locate the authoritative plan.
2. Read its current status and latest revision.
3. Inspect repository state relevant to active tasks.
4. Verify whether reported completed work is actually present.
5. Recheck prerequisites and open decisions.
6. Identify active owners and outstanding handoffs.
7. Reconcile stale assumptions before continuing.

Do not trust a stale plan blindly. Do not discard it and reconstruct from memory if it remains useful. Compare it with current evidence.

A compact handoff should tell the next agent:
- What the project is trying to achieve.
- Which plan is authoritative.
- What has been completed and how verified.
- What is in progress.
- What is blocked and why.
- Which decisions are approved or open.
- What should happen next.
- What must not be changed without approval.

## 7. Avoid competing sources of truth

Do not maintain several documents that independently claim to be the current plan.

If tasks live in an external tracker:
- Make the tracker authoritative for task state if that is the agreed workflow.
- Keep the repository plan focused on design, rationale, and links.
- Avoid manually duplicated status fields that drift.

If a host-native plan is authoritative, identify it clearly and link supporting artifacts. Do not create a second plan with conflicting task status.

If the system cannot persist a plan, say so and provide a portable artifact the user can save.

## 8. Artifact lifecycle

Artifacts should evolve with the work:
- Draft during exploration.
- Approve or revise as decisions are made.
- Update as tasks start, block, complete, or change.
- Annotate with verification evidence.
- Mark complete, superseded, or archived when appropriate.

Do not delete useful decision history merely because a plan changed. Do not leave obsolete plans looking authoritative.

## 9. Persistence boundaries

Creating or editing a persistent plan is a file modification. Do so only when the user requested it or authorized the workflow.

Do not commit, push, publish, or move artifacts into external systems without authorization. A plan may recommend these actions but cannot authorize them.


## 10. Canonical plan state and revision model

Do not use a single plan `status` to represent readiness or implementation progress.

```yaml
plan:
  plan_id: "PLAN-001"
  plan_revision: "2.0.0"
  readiness: "execution_ready"
  status: "active"
  acceptance_criteria:
    - id: "DAC-001"
      condition: "The defined release scope meets the approved delivery requirements"
  acceptance:
    required: true
    status: "pending"
    authority: "release-owner"
    scope: "PLAN-001 delivery"
    criteria_refs: ["DAC-001"]
    evidence_ref: null
    decided_by: null
    decided_at: null
    decision_ref: null
    conditions: []
    rationale: null
  implementation_summary:
    proposed: 0
    ready: 2
    in_progress: 1
    blocked: 1
    needs_reconciliation: 0
    in_review: 0
    done: 3
    cancelled: 0
    superseded: 0
```

### Plan readiness
- `exploratory`: objective or feasibility is still being clarified.
- `structured`: requirements, approach, and major work are organized, but one or more in-scope task contracts, required decision outcomes, dependency definitions, approval-gate definitions, or verification plans remain incomplete. A required approval gate is defined when its requirement, authority, scope, conditions, and current state are recorded. A known `pending` approval does not by itself lower plan readiness, but it still blocks the governed task action until satisfied. An unresolved rejection that invalidates a governing decision, or a gate whose meaning or authority is unknown, may keep the plan `structured`.
- `execution_ready`: the full declared scope has been independently validated, required decisions are resolved, and task contracts, dependencies, approval-gate definitions, and verification plans are sufficiently complete to determine what may proceed. A required approval may remain `pending` when its authority, scope, conditions, and current state are recorded; the affected task action remains blocked until approval is granted and separate execution authorization is satisfied. This readiness value never grants execution authorization.

### Plan status
- `active`: currently being worked or maintained.
- `paused`: intentionally suspended.
- `blocked`: plan-level condition prevents meaningful progress.
- `completed`: all planned task work is done and required plan/delivery acceptance is `accepted`, `not_required`, or formally `waived` with authority and evidence. If required plan/delivery acceptance is pending, rejected, or unknown, do not mark the plan completed.
- `cancelled`: no longer pursued.
- `superseded`: replaced by a newer plan.

A plan may be `execution_ready` and `paused`; it may be `active` but only `structured`. Keep a plan `structured` when part of its declared scope lacks complete contracts, resolved decision outcomes, defined dependencies, defined approval gates, or verification planning; identify any bounded subset of individually ready tasks. A defined approval gate may remain `pending` without reducing plan readiness, but the governed task action remains blocked until approval is granted. A task blocked only by a fully defined prerequisite sequence does not automatically lower plan readiness. Task lifecycle and dependency status represent that sequencing, while each task's approval and execution-authorization gates still apply. The implementation summary is derived from task lifecycle states and is not a second source of truth. Plan-level acceptance is distinct from task-level acceptance.

### Versioned task contracts and decisions

Every task contract carries a stable task ID and immutable `contract_revision`. Every decision carries a stable decision ID and immutable `decision_revision`. Preserve prior revisions or a durable change record. Delegations must pin the exact plan, task-contract, and decision revisions they rely on.

### Decision approval provenance

`approved` means the authorized decision authority accepted the decision within a defined scope. Record approver identity/role, timestamp, source/reference, scope, conditions, and evidence when available. If any are unknown, state that explicitly. Implementation verification belongs in the separate `implementation_verification` object and must not be used as a substitute for approval or decision status.

### Reconciliation and execution continuity

When a revision affects active work, record:
- Whether the active task must stop immediately, may continue only within the prior contract, or may continue without impact.
- Which task/decision/dependency/checkpoint revisions are superseded.
- Whether completed work remains valid.
- Which executors, accountable owners, reviewers, and orchestrators were notified.
- The new revision each subsequent delegation must use.

Never silently replace a contract while an agent is executing it. Preserve historical revisions and the rationale for supersession.
