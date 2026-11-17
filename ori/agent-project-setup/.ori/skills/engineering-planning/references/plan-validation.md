# Plan Validation and Readiness Review

## 1. Purpose

Independent validation challenges the plan before it is treated as ready for execution or delegation.

The purpose is to find omissions, contradictions, unsafe assumptions, and unverifiable work—not to rubber-stamp a document because it looks complete.

## 2. Validation dimensions

### Objective and requirements
- Does the plan address the actual requested outcome?
- Are required outcomes distinguishable from preferences?
- Are constraints and exclusions explicit?
- Are material ambiguities recorded?
- Can tasks be traced to requirements where traceability matters?

### Evidence and repository understanding
- Are repository claims supported by inspected evidence?
- Are paths, interfaces, dependencies, and tests real?
- Are inferences and assumptions labeled?
- Has contradictory evidence been addressed?
- Are important unknowns visible?

### Scope and impact
- Are included and excluded areas clear?
- Are affected consumers and integration points considered?
- Is existing behavior that must be preserved identified?
- Are compatibility implications understood?
- Is scope creep present?

### Design and decisions
- Are proposed and approved decisions distinguished?
- Are interfaces and responsibilities coherent?
- Are invariants explicit?
- Have consequential alternatives been considered?
- Are unresolved decisions reflected as blockers where necessary?

### Task quality
- Does each task have one coherent outcome?
- Is its change surface bounded?
- Are prerequisites explicit?
- Are inputs, outputs, and deliverables clear?
- Is ownership unambiguous?
- Are stop conditions appropriate?
- Is the task appropriately sized?

### Dependencies and coordination
- Do all dependency references resolve?
- Are hard dependencies acyclic?
- Are soft dependencies and assumptions explicit?
- Are shared resources identified?
- Are parallel claims defensible?
- Are integration checkpoints and owners defined?

### Acceptance and verification
- Are acceptance criteria observable?
- Does each important criterion have a verification method?
- Are required checks feasible?
- Is system-level integration verified?
- Is completion evidence specified?
- Are limitations and unavailable test environments disclosed?

### Risk and delivery
- Are material risks and uncertainties visible?
- Is risk distinct from complexity and confidence?
- Are security and data integrity considered where relevant?
- Are migration, deployment, and recovery needs addressed?
- Is the proposed recovery strategy credible?

### Orchestration and persistence
- Can an orchestrator determine what is ready and blocked?
- Can an agent execute without reconstructing missing intent?
- Are ownership and handoffs explicit?
- Is there one authoritative plan?
- Can the work resume after context loss?
- Are approval gates and operational boundaries clear?

## 3. Validation procedure

1. Read the user's objective and authoritative requirements.
2. Read the current plan and referenced task contracts.
3. Independently reconstruct the intended outcome.
4. Compare requirements, scope, design, tasks, dependencies, and verification.
5. Inspect cited repository evidence where practical.
6. Challenge assumptions and look for contradictory evidence.
7. Validate dependency references and cycles.
8. Evaluate whether parallel execution is safe.
9. Check acceptance criteria for observability and feasibility.
10. Record findings with stable IDs, qualitative severity, affected plan elements, evidence, recommended correction, and resolution state.
11. Record review coverage for each material area.
12. Revise the plan or report why it cannot yet be considered ready.

Do not validate only the formatting or presence of headings.

## 4. Finding severity

Use qualitative severity with a reason:

- **Blocking:** prevents safe or meaningful execution.
- **Major:** likely to cause incorrect implementation, integration failure, or unmet requirements.
- **Moderate:** creates avoidable ambiguity, rework, or verification weakness.
- **Minor:** improves clarity or maintainability but does not block execution.

Do not invent numerical confidence scores. Explain uncertainty in ordinary language.

## 5. Separate readiness, plan status, and implementation lifecycle

Plan validation reports **plan readiness** using the canonical values:
- `exploratory`: the objective, feasibility, or essential constraints are still being clarified.
- `structured`: requirements, approach, and major work are organized, but one or more in-scope execution contracts, required decision outcomes, dependency definitions, approval-gate definitions, or verification plans remain incomplete. An approval gate is sufficiently defined when its requirement, authority, scope, conditions, and current state are recorded. A known `pending` approval does not by itself lower plan readiness; it still prevents the governed task action until satisfied. An unresolved rejection that invalidates a governing decision, or an approval gate whose meaning or authority is unknown, may keep the plan `structured`.
- `execution_ready`: the full declared scope has been independently validated, required decisions are resolved, and task contracts, dependencies, approval-gate definitions, and verification plans are sufficiently complete to determine what may proceed. A required approval may remain `pending` when its authority, scope, conditions, and current state are recorded; the affected task action remains blocked until approval is granted and separate execution authorization is satisfied.

Do not introduce alternate plan-readiness values such as `not_ready`, `conditionally_ready`, or `ready_for_execution`. Keep a plan `structured` when some in-scope work is not individually ready because its contract, decision outcome, dependency definition, approval-gate definition, or verification planning is incomplete; identify the ready subset and its bounded authority. Do not confuse a fully defined approval gate that is currently `pending` with an incomplete plan definition: record the gate and block the affected action until approval is granted. A task that is `blocked` only because a fully defined hard prerequisite has not completed does not by itself make the plan merely `structured`; the plan may be `execution_ready` when the full declared scope is otherwise validated. Task lifecycle, dependency status, approval, and execution authorization determine what may proceed; a plan-level readiness label never grants permission.

Plan operational status is a separate field: `active`, `paused`, `blocked`, `completed`, `cancelled`, or `superseded`.

Implementation progress is represented per task using the canonical task lifecycle states defined in `task-contract.md` (`proposed`, `ready`, `in_progress`, `blocked`, `needs_reconciliation`, `in_review`, `done`, `cancelled`, `superseded`). Verification and acceptance remain separate records. A task can be `done` only when required verification has passed (or is explicitly not required) and task-level acceptance is `accepted`, `not_required`, or formally `waived`. Plan-level delivery acceptance may still be pending after implementation tasks are complete; in that case, do not mark the plan `completed`. If a host system uses states such as `not_started`, `ready_for_review`, or `accepted`, document an explicit mapping; do not silently treat those labels as plan-readiness outcomes or task lifecycle states.

Readiness may differ by task. Do not mark all tasks ready because one branch can start. A technically ready task may still be awaiting approval or execution authorization. Validation does not grant either.

## 6. Findings and review coverage

Each finding should be traceable and actionable:

```yaml
finding:
  id: "FND-001"
  severity: "major"
  affected:
    requirements: ["REQ-004"]
    tasks: ["TASK-012"]
    decisions: ["DEC-002"]
    dependencies: ["DEP-003"]
  statement: "The consumer task assumes an interface not present in the approved contract."
  evidence:
    - "Repository path/symbol or cited plan evidence"
  reasoning: "The task cannot satisfy its output contract against the current interface."
  recommended_correction: "Reconcile the interface decision and revise both task contracts."
  resolution_status: "open"
```

Severity remains qualitative:
- `blocking`: prevents safe or meaningful execution.
- `major`: likely to cause incorrect implementation, integration failure, or unmet requirements.
- `moderate`: creates avoidable ambiguity, rework, or verification weakness.
- `minor`: improves clarity or maintainability but does not block execution.

Track coverage independently from findings. For each material review area or requirement, use:
- `reviewed_supported`
- `reviewed_with_findings`
- `not_reviewed`
- `unable_to_verify`

A review with no findings is not complete if important areas were not reviewed. State why coverage is incomplete.

## 7. Validation report

A useful report includes:
- Overall readiness outcome.
- Scope reviewed.
- Blocking and major findings.
- Contradictions and unresolved assumptions.
- Dependency and parallelism findings.
- Acceptance and verification gaps.
- Required corrections.
- Tasks that can safely proceed.
- Limitations of the review.

Clearly distinguish a plan review from implementation verification. A valid plan does not prove the code works.

## 8. Independent challenge prompts

Ask:
- What requirement could be missed by this decomposition?
- Which assumption, if false, would invalidate the design?
- Which task has an unclear owner or output?
- What can conflict if two tasks run simultaneously?
- What happens if an external prerequisite is late or unavailable?
- Which acceptance criterion cannot actually be demonstrated?
- What integration work has been omitted?
- What irreversible operation lacks recovery planning?
- Which statement is presented as fact without evidence?
- What would cause an implementation agent to make an unauthorized design decision?

## 9. Validation anti-patterns

Avoid:
- Treating a complete-looking template as proof of completeness.
- Approving tasks with vague acceptance criteria.
- Ignoring contradictory repository evidence.
- Calling every task ready when critical decisions remain open.
- Treating test plans as proof that tests pass.
- Accepting parallelism without checking shared resources.
- Confusing implementation review with plan validation.
- Hiding limitations to make the plan appear finished.


## 10. Keep the engineering gates distinct

These terms are not interchangeable:
- **Validation:** evaluates plan quality, completeness, evidence, and readiness.
- **Approval:** an authorized authority accepts a decision or defined proposal.
- **Execution authorization:** permission to perform specified actions within a defined scope.
- **Verification:** evidence that implementation behavior or checks satisfy stated conditions.
- **Acceptance:** an authorized evaluation that delivery or task completion conditions are met.

A valid plan does not prove code works. A passed test does not itself approve a design. An approved decision does not necessarily authorize execution. An assigned agent does not acquire permissions from the assignment.
