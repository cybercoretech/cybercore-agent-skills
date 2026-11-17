# Engineering Planning Examples

These examples illustrate how planning depth and task contracts should adapt to different engineering situations. They are patterns, not claims about a particular repository.

## 1. Small bug fix: avoid unnecessary overhead

**Request:** A boundary comparison is off by one.

Appropriate plan:
- Confirm intended boundary semantics from requirements or existing behavior.
- Locate the comparison and related tests.
- Change the narrowest relevant behavior.
- Add a regression test for the boundary.
- Run focused tests.

A single compact task contract is enough.

Anti-pattern: creating a multi-agent project plan, risk register, migration plan, and separate decision records for a localized defect.

## 2. New API feature

**Request:** Add a filtering parameter to an existing API endpoint.

Plan considerations:
- Define parameter semantics, defaults, validation, and error behavior.
- Inspect route, handler, service, data access, and API documentation.
- Identify compatibility requirements and existing consumers.
- Agree on the API contract before parallel client/server work if needed.
- Define tests for valid, invalid, empty, and boundary inputs.

Possible tasks:
1. Confirm API contract and compatibility.
2. Implement request parsing and validation.
3. Implement filtering behavior.
4. Add integration and regression coverage.
5. Update API documentation.

Do not split the client and server into independent tasks until their shared contract is clear.

## 3. Rust workspace refactor

**Request:** Extract shared functionality from several crates into a common crate.

Plan considerations:
- Inspect workspace structure, crate dependencies, public exports, feature flags, and test layout.
- Identify dependency direction and potential cycles.
- Define the new crate's responsibility and public API.
- Identify affected consumers and compatibility constraints.
- Plan incremental migration and workspace-wide validation.

Possible tasks:
1. Map current ownership and dependencies.
2. Define shared crate boundaries and API.
3. Create the crate and move agreed shared functionality.
4. Migrate consumers in bounded groups.
5. Remove obsolete duplication.
6. Run workspace tests, formatting, linting, and relevant compatibility checks.

Anti-pattern: moving files first and discovering afterward that the new crate creates a dependency cycle.

## 4. Plugin system development

**Request:** Introduce a plugin registration and lifecycle system.

Plan considerations:
- Define plugin identity, metadata, interfaces, lifecycle, ownership, and error behavior.
- Inspect existing extension points and runtime boundaries.
- Identify trust and security implications of loading external code.
- Decide discovery, registration, initialization, and shutdown semantics.
- Define compatibility and isolation requirements.

Possible task sequence:
1. Investigate existing extension points.
2. Approve plugin contract and lifecycle model.
3. Implement registry and validation.
4. Implement lifecycle management.
5. Integrate discovery or loading.
6. Add compatibility, failure, and security tests.
7. Document extension contracts.

Do not invent the plugin architecture from a generic template. Ground it in the actual runtime.

## 5. Multi-service feature

**Request:** Add a capability spanning a frontend, API, and background worker.

Plan considerations:
- Map the end-to-end user and data flow.
- Define API and event contracts.
- Identify data ownership and consistency requirements.
- Define failure, retry, and idempotency behavior.
- Plan end-to-end integration.

Possible parallel tasks after contracts are agreed:
- Frontend interaction.
- API implementation.
- Worker implementation.

Integration tasks:
- Contract compatibility.
- End-to-end tests.
- Observability and operational validation.

Anti-pattern: three agents independently inventing request and event schemas.

## 6. Multi-agent project

**Request:** Delegate a substantial feature across several agents.

Plan considerations:
- Define one authoritative plan.
- Establish stable task IDs and complete contracts.
- Assign one accountable owner per task.
- Identify shared interfaces and files.
- Create parallel groups and synchronization checkpoints.
- Assign integration and independent review responsibility.

The orchestrator should be able to identify ready tasks from prerequisites and contract state, not from arbitrary list order.

Anti-pattern: distributing broad prompts to agents and expecting them to negotiate architecture and merge conflicts without a shared plan.

## 7. Database migration

**Request:** Change a persistent data model used by multiple application versions.

Plan considerations:
- Inspect schema, consumers, deployment order, and data volume where known.
- Define compatibility across mixed application versions.
- Consider expand/contract migration.
- Define backfill, validation, and failure handling.
- Identify irreversible steps and recovery assumptions.
- Define monitoring and rollout gates.

Possible phases:
1. Inspect current schema and consumers.
2. Approve migration and compatibility strategy.
3. Add backward-compatible schema changes.
4. Deploy compatible application changes.
5. Backfill and validate data.
6. Switch consumers.
7. Remove obsolete schema only after the compatibility window.
8. Verify operational state.

Do not call a migration reversible unless the previous state can actually be restored.

## 8. Ambiguous feature request

**Request:** "Make the system smarter."

Do not produce detailed implementation tasks immediately.

Exploratory output:
- Clarify the user-visible outcome.
- Identify the problem being solved.
- Establish constraints and success measures.
- Inspect relevant existing behavior.
- Offer plausible interpretations as alternatives.
- Identify evidence needed to choose an approach.

Create investigation tasks only where they answer specific questions.

Anti-pattern: choosing an architecture and decomposing it into implementation tasks before the desired outcome is understood.

## 9. Context-loss recovery

**Situation:** A new agent must resume a plan after conversation context is lost.

Recovery:
1. Locate the authoritative plan.
2. Read current task and decision states.
3. Inspect repository state for active work.
4. Verify completed claims against current evidence.
5. Recheck prerequisites and blockers.
6. Identify the next eligible task.
7. Report discrepancies and reconcile stale assumptions.

Anti-pattern: assuming every task marked complete in an old note is still present and valid in the repository.

## 10. Changing requirements

**Situation:** The user changes a compatibility requirement after implementation has begun.

Recovery:
- Record the changed requirement and its source.
- Identify affected decisions, tasks, interfaces, and tests.
- Determine whether active work should stop or continue under the old contract.
- Preserve completed work that remains valid.
- Supersede or revise affected tasks with traceability.
- Reassess dependencies and readiness.
- Obtain required approval for the new direction.

Anti-pattern: silently editing task descriptions while agents are working against the previous contract.

## 11. Failed prerequisite

**Situation:** An implementation task discovers that a required upstream interface does not exist.

Correct response:
- Mark the task blocked.
- Record the observed repository evidence.
- Identify the missing prerequisite.
- Determine whether the plan's assumption was wrong.
- Notify the owner or orchestrator.
- Reconcile the dependency and affected tasks.

Do not tell the implementer to invent a replacement interface unless that design freedom was explicitly granted.

## 12. Security-sensitive change

**Request:** Change authentication or authorization behavior.

Plan considerations:
- Map trust boundaries, identities, privileges, and protected resources.
- Identify threat assumptions and abuse cases.
- Inspect existing authorization enforcement and tests.
- Define fail-closed behavior and compatibility requirements.
- Limit sensitive access and delegation.
- Require appropriate independent security review.
- Define negative tests, audit evidence, and rollout monitoring.

A task contract should identify security invariants and explicit stop conditions.

Anti-pattern: delegating broad security-sensitive changes to multiple agents without clear access boundaries, review ownership, or a verified authorization model.

## General lessons

Across all examples:
- Match planning depth to risk and complexity.
- Keep assumptions visible.
- Make task boundaries and dependencies explicit.
- Treat integration as planned work.
- Define observable acceptance criteria.
- Preserve one authoritative plan.
- Reconcile when evidence changes.
- Never confuse a task assignment with authorization.


## 13. Complete machine-readable task contract

This example demonstrates the canonical fields together. Every task, decision, and integration-checkpoint reference used below is defined in this same authoritative example.

```yaml
plan:
  plan_id: "PLAN-PLUGIN-001"
  plan_revision: "1.2.0"
  readiness: "execution_ready"
  status: "active"
  acceptance_criteria:
    - id: "DAC-001"
      condition: "The defined plugin-registration delivery meets its approved requirements"
  acceptance:
    required: true
    status: "pending"
    authority: "release-owner"
    scope: "PLAN-PLUGIN-001 delivery"
    criteria_refs: ["DAC-001"]
    evidence_ref: null
    decided_by: null
    decided_at: null
    decision_ref: null
    conditions: []
    rationale: null

decisions:
  - decision_id: "DEC-002"
    decision_revision: "1.0.0"
    title: "Plugin registration interface"
    status: "approved"
    context: "Registration validation must preserve the published registry interface."
    decision: "Use the approved PluginRegistry registration API without changing its public signature."
    rationale: "The public interface is already an accepted compatibility boundary."
    approver: "Plugin architecture owner"
    approval_scope: "PluginRegistry registration interface"
    approval_conditions: []
    approved_by: "Plugin architecture owner"
    approved_at: "2026-11-16"
    approval_evidence_ref: "DEC-002/revision-1.0.0/approval"
    implementation_verification:
      status: "not_started"
      evidence_ref: null
      verified_by: null
      verified_at: null

tasks:
  - task:
      id: "TASK-009"
      contract_revision: "1.0.0"
      title: "Publish the approved registry contract"
      lifecycle:
        status: "done"
      approval:
        required: true
        status: "approved"
        approver: "Plugin architecture owner"
        scope: "Publish the approved registry contract"
        conditions: []
        decided_by: "Plugin architecture owner"
        decided_at: "2026-11-16"
        decision_ref: "DEC-002/revision-1.0.0"
        evidence_ref: "DEC-002/revision-1.0.0/approval"
        rationale: "The published contract matches the approved interface decision."
      execution_authorization:
        status: "granted"
        authority: "Project owner"
        scope: "Publish the approved registry contract"
        evidence_ref: "AUTH-003"
      ownership:
        accountable_owner: "plugin-feature-lead"
        executor: "contract-author"
        contributors: []
        reviewer: "plugin-architecture-reviewer"
        integrator: "plugin-feature-lead"
      objective: "Publish the approved PluginRegistry registration interface contract."
      scope:
        included: ["Registration interface contract"]
        excluded: ["Registration implementation"]
      acceptance_criteria:
        - id: "AC-009"
          condition: "The published contract matches DEC-002."
      verification:
        status: "passed"
        required_checks: ["Independent contract review"]
        completion_evidence: ["TASK-009/contract-review"]
      acceptance:
        required: false
        status: "not_required"
        authority: null
        scope: "TASK-009 contract publication"
        criteria_refs: ["AC-009"]
        evidence_ref: null
        decided_by: null
        decided_at: null
        decision_ref: null
        conditions: []
        rationale: "No separate formal task-acceptance gate applies."

  - task:
      id: "TASK-010"
      contract_revision: "1.1.0"
      title: "Implement validated plugin registration"
      classification:
        type: "implementation"
        priority: "high"
        complexity: "medium"
        risk: "medium"
        confidence: "high"
      lifecycle:
        status: "ready"
      approval:
        required: true
        status: "approved"
        approver: "Plugin architecture owner"
        scope: "Modify registry validation and focused tests while preserving the public interface"
        conditions: ["Preserve the approved public registration interface"]
        decided_by: "Plugin architecture owner"
        decided_at: "2026-11-16"
        decision_ref: "DEC-002/revision-1.0.0"
        evidence_ref: "DEC-002/revision-1.0.0/approval"
        rationale: "The bounded implementation scope conforms to the approved interface decision."
      execution_authorization:
        status: "granted"
        authority: "Project owner"
        scope: "Modify registry validation and focused tests only"
        evidence_ref: "AUTH-004"
      ownership:
        accountable_owner: "plugin-feature-lead"
        executor: "implementation-agent"
        contributors: []
        reviewer: "independent-reviewer"
        integrator: "plugin-feature-lead"
        suggested_role: "implementer"
        execution_mode: "independent"
      objective: "Reject invalid plugin registrations before registry state changes."
      scope:
        included: ["Registration validation", "Focused tests"]
        excluded: ["Plugin discovery", "Lifecycle redesign"]
      dependencies:
        relationships:
          - id: "DEP-010"
            type: "hard"
            from: "TASK-009"
            to: "TASK-010"
            condition: "Approved registry contract is available"
            status: "satisfied"
            evidence_ref: "TASK-009/contract-review"
          - id: "DEP-011"
            type: "decision"
            from: "DEC-002"
            to: "TASK-010"
            condition: "DEC-002 is approved for the registration interface"
            status: "satisfied"
            evidence_ref: "DEC-002/revision-1.0.0/approval"
        resource_conflicts: []
        parallelism:
          safe: true
          assumptions: ["No other task changes the registration interface"]
          synchronization_point: "INT-010"
      contracts:
        inputs: ["Plugin registration request"]
        outputs: ["Validated registration result or defined error"]
        interfaces: ["Approved PluginRegistry registration API"]
        invariants: ["Invalid plugins never enter registry state"]
      acceptance_criteria:
        - id: "AC-010"
          condition: "Duplicate identifiers are rejected"
          verification: "Focused unit test"
        - id: "AC-011"
          condition: "Valid registrations preserve existing behavior"
          verification: "Regression test"
      verification:
        status: "not_started"
        required_checks: ["Focused unit tests", "Regression tests"]
        completion_evidence: []
      acceptance:
        required: true
        status: "pending"
        authority: "plugin-feature-lead"
        scope: "TASK-010 implementation deliverables"
        criteria_refs: ["AC-010", "AC-011"]
        evidence_ref: null
        decided_by: null
        decided_at: null
        decision_ref: null
        conditions: []
        rationale: null
      failure_handling:
        stop_conditions: ["Approved interface differs from repository evidence"]
        escalation: "Set needs_reconciliation and notify the accountable owner"

integration_checkpoints:
  - checkpoint_id: "INT-010"
    revision: "1.0.0"
    title: "Plugin registration contract integration"
    contributors:
      - task_id: "TASK-009"
        required_deliverable: "Approved PluginRegistry contract"
      - task_id: "TASK-010"
        required_deliverable: "Validated registration implementation and focused tests"
    acceptance_criteria:
      - id: "IC-010"
        condition: "Implementation conforms to the approved registration contract"
      - id: "IC-011"
        condition: "Focused and regression checks pass"
    verification:
      status: "not_started"
      required_checks: ["Contract compatibility review", "Focused and regression tests"]
      completion_evidence: []
    acceptance:
      required: true
      status: "pending"
      authority: "plugin-feature-lead"
      scope: "INT-010 plugin registration integration"
      criteria_refs: ["IC-010", "IC-011"]
      evidence_ref: null
      decided_by: null
      decided_at: null
      decision_ref: null
      conditions: []
      rationale: null
    accountable_owner: "plugin-feature-lead"
    status: "pending"
    failure_handling:
      - "Stop integration progression"
      - "Record incompatibility and reconcile affected task contracts"
```

## 14. Partial task readiness within a structured plan

A plan remains `structured` when some declared work is not yet execution-ready because its contract or governing decision is incomplete. This does not prevent a bounded subset of independently ready tasks from proceeding when their own gates are satisfied:

- `TASK-100` is `ready`: it has a complete contract, satisfied hard prerequisites, required approvals, and explicit execution authorization.
- `TASK-101` is `blocked`: it has a complete contract and a fully defined hard dependency on `TASK-100`, but cannot begin until `TASK-100` produces its named interface. This sequencing blocker does not by itself make the overall plan `structured`.
- `TASK-102` is `ready` with a `soft` dependency: it may proceed against a documented provisional contract because the work is safely isolated; its revalidation gate and failure-conversion rule are explicit.
- `TASK-103` is `proposed`: its contract depends on an unresolved design decision, so the full declared scope is not yet independently validated. This is why the overall plan remains `structured`.
- `INT-100` is a stable integration checkpoint awaiting outputs from `TASK-100` and `TASK-102`; its acceptance gate remains pending.

If `TASK-103` later receives a complete contract, its decision is resolved, and the remaining plan-wide validation passes, the plan may become `execution_ready` even while `TASK-101` remains `blocked` by normal prerequisite sequencing. The orchestrator may dispatch only tasks whose lifecycle, approval requirements, execution authorization, access, and prerequisites all permit the proposed action. A soft dependency does not mean "ignore the dependency"; its assumption, revalidation condition, and failure-conversion rule must be explicit.

## 15. Requirement changes and version reconciliation

**Situation:** Plan revision `1.0.0` allowed compatibility with API version A. A new requirement mandates compatibility with versions A and B.

Correct response:
1. Create plan revision `2.0.0`; retain revision `1.0.0`.
2. Record the source of the requirement change.
3. Mark affected active task contracts `needs_reconciliation`; issue new contract revisions only after analysis.
4. Identify affected decisions, typed dependency records, resource conflicts, and integration checkpoints.
5. Decide explicitly whether each executor must stop, may finish bounded work under the old contract, or is unaffected.
6. Preserve completed work that remains valid and its evidence.
7. Supersede invalid assumptions and decision revisions with traceability.
8. Reassess plan readiness and per-task lifecycle.
9. Notify accountable owners, executors, reviewers, integrators, and orchestrators.
10. Reissue delegation packets pinned to the new revisions and required authorization.

Anti-pattern: changing the acceptance criteria in place while an agent continues executing an earlier contract revision.

## 16. Human and agent responsibility patterns

The same contract model supports different operating arrangements:

- **Human-led, AI-assisted:** human is accountable owner and executor; an agent contributes bounded research, analysis, or review.
- **Agent implementation under human approval:** human retains accountability and approval authority; agent is executor only within explicitly authorized scope.
- **Multiple agents with an orchestrator:** each task has one accountable owner; executors and contributors are assigned by capability and access; integrator owns convergence; orchestrator coordinates but does not grant authority.
- **Mixed team:** humans and agents may hold different roles, but accountability, access, approval, execution authorization, and verification responsibility remain explicit and separately recorded.

Do not assume that an AI agent can access a repository, modify a resource, or perform a verification step simply because the task names that capability.
