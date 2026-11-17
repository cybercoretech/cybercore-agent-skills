# Multi-Agent Orchestration Model

## 1. Purpose

This reference defines how a plan coordinates multiple agents without depending on a specific orchestration product.

The plan must communicate task ownership, prerequisites, boundaries, outputs, synchronization, and escalation in a form an orchestrator can interpret consistently.

## 2. Decide whether multiple agents help

Use multiple agents when work has genuinely separable responsibilities, parallel research value, or specialist requirements.

Do not delegate merely to increase agent count.

Before splitting work, ask:
- Are the outcomes independently useful?
- Can each task have a bounded change surface?
- Can interfaces be agreed before implementation?
- Can owners work without repeatedly editing the same resources?
- Is integration cost lower than the expected benefit?
- Is there enough context to avoid duplicated discovery?

If not, use one owner with sequential subtasks.

## 3. Ownership model

Every task should have one accountable owner. Other agents may contribute, review, or provide specialist input, but responsibility for the deliverable must remain clear.

Distinguish:
- **Suggested role:** capability that appears suitable.
- **Assigned owner:** actual person or agent responsible.
- **Contributor:** assists the owner.
- **Reviewer:** independently evaluates work.
- **Integrator:** reconciles outputs and validates the combined result.
- **Orchestrator:** manages task eligibility, assignment, synchronization, and reporting.

Role labels do not grant permissions or access.

### Accountability versus execution

Model these responsibilities separately:
- `accountable_owner`: one person or agent accountable for the task outcome and handoff.
- `executor`: the person or agent performing the work; may be different from the accountable owner.
- `contributors`: participants with explicit bounded contributions.
- `reviewer`: responsible for review; specify whether independence is required.
- `integrator`: accountable for combining contributions at an integration boundary.
- `orchestrator`: coordinates eligibility, assignment, synchronization, and reporting; does not gain authority to alter contracts or grant permission merely by orchestrating.

The integrator owns the combined result and integration evidence, but does not automatically have authority to change contributing task contracts. Contract changes require reconciliation by the appropriate decision/plan authority.

## 4. Delegation packet

A delegation packet should include:
1. Plan ID and exact plan revision.
2. Task ID and exact task-contract revision.
3. Relevant decision IDs and exact decision revisions.
4. Delegation timestamp or update marker, when available.
5. Execution authorization reference and authorized scope; do not infer authorization from assignment.
6. Task objective and complete contract.
7. Authoritative requirements, context, and repository evidence.
8. Included and excluded scope.
9. Prerequisites and current typed dependency states.
10. Shared resources, integration checkpoint IDs, and coordination strategy.
11. Expected deliverables and acceptance/verification requirements.
12. Stop conditions, escalation path, and handoff/reporting requirements.

Do not delegate using only a short title when important context exists elsewhere. Link authoritative sources rather than copying inconsistent fragments.

### 4.1 Capability, access, and authorization matching

Do not equate role labels with suitability or permission. Evaluate separately:

- **Capability match:** relevant technical skills, language/framework expertise, architecture familiarity, and ability to perform the task.
- **Repository and tool access:** whether the candidate can access the required repository, files, environments, and tools.
- **Modification permissions:** whether the candidate is permitted to read, write, execute, or change the specific resources.
- **Verification capability:** whether the candidate can run or inspect the required checks and produce evidence.
- **Context and resource fit:** token/context limits, available time, execution environment, and whether the candidate has the necessary project context.
- **Security boundary fit:** whether the task's data sensitivity, credentials, trust level, and isolation requirements permit the assignment.
- **Execution authorization:** explicit permission from the appropriate authority for the requested actions and scope.

Only after these dimensions are checked should assignment be made. A capability match does not prove access; access does not grant permission; assignment does not grant execution authorization.

## 5. Execution modes

Use an explicit execution mode:

- `independent`: task can proceed without coordination beyond normal integration.
- `sequential`: task must wait for a prerequisite.
- `coordinated`: tasks can proceed concurrently under an agreed interface or shared contract.
- `integrative`: task combines, reconciles, or validates outputs from other tasks.

Do not label work independent if it modifies a shared interface or resource without coordination.

## 6. Shared files and interfaces

Before parallel implementation, identify:
- Shared source files.
- Public interfaces and schemas.
- Generated files and lockfiles.
- Configuration and dependency manifests.
- Database schemas and migrations.
- Test environments and fixtures.
- Cross-cutting invariants.

Choose an explicit strategy:
- One owner controls the shared resource.
- One task establishes the contract before others begin.
- Work is sequenced.
- Separate branches or isolated worktrees are used with an integration owner.
- A narrow interface boundary allows independent work.

Avoid multiple agents independently designing the same interface.

## 7. Communication and synchronization

Define when agents must communicate:
- Before changing a shared contract.
- When an assumption is contradicted.
- When a prerequisite fails.
- When scope must change.
- When an acceptance criterion cannot be met.
- At a planned integration checkpoint.
- When a task is ready for review.

Use checkpoints with explicit entry conditions and expected evidence. Avoid constant status chatter that adds no decision value.

## 8. Failure and escalation

An agent should stop and escalate when:
- A required prerequisite is absent or invalid.
- Repository evidence contradicts an approved decision.
- The requested change exceeds assigned scope.
- A security or data-integrity risk was not accounted for.
- A shared interface must change.
- Acceptance criteria are impossible or contradictory.
- Another task has changed a dependency or shared resource incompatibly.

The orchestrator should:
1. Record the issue and affected task IDs.
2. Mark affected work blocked or needing reconciliation.
3. Preserve valid completed work.
4. Identify the decision owner or investigation required.
5. Update contracts and dependencies after resolution.
6. Reissue work when the contract materially changes.

Do not instruct an agent to conceal the problem or improvise a new architecture simply to keep execution moving.

## 9. Integration responsibility

Assign an integrator when multiple contributions must be combined.

The integration task should define:
- Required inputs and their owners.
- Expected interface compatibility.
- Merge or assembly strategy.
- Required tests and checks.
- Conflict resolution responsibility.
- Acceptance evidence.
- Failure and rollback/escalation path.

Integration is real engineering work. Do not assume it happens automatically when individual tasks finish.

## 10. Orchestration-neutrality

The task model must remain usable with different tools and systems. Do not hard-code assumptions about a specific agent framework, issue tracker, workflow engine, or task-file format.

A host may map contract fields into its own schema, but must preserve their semantics. If the host cannot represent an important field, retain it in linked plan context rather than silently dropping it.

## 11. Anti-patterns

Avoid:
- Delegating before requirements and interfaces are clear.
- Assigning several agents as joint owners with no accountable lead.
- Giving agents overlapping write scopes without coordination.
- Spawning agents for trivial tasks.
- Asking every agent to inspect the entire repository independently.
- Treating agent completion messages as verification evidence.
- Assuming parallel tasks need no integration.
- Letting an orchestrator infer authorization from task assignment.
- Silently changing task contracts while work is running.


## 12. Revision-pinned coordination

Every delegation and handoff must identify the exact plan revision, task-contract revision, and decision revisions it relies on. Before execution or resumption, compare those revisions with the authoritative current versions.

If a relevant revision changed:
1. Determine whether the change affects the delegated scope, interface, assumptions, dependencies, acceptance, or authorization.
2. Stop or continue only under the explicit reconciliation decision.
3. Notify the accountable owner, executor, reviewer, integrator, and orchestrator as applicable.
4. Reissue the delegation against the new revisions when necessary.
5. Preserve the old packet and completion evidence for traceability.

An orchestrator may identify a mismatch and request reconciliation; it may not silently rewrite a task contract or broaden an executor's authority.
