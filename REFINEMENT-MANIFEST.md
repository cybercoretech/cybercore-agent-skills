# Engineering Planning refinement manifest

Refined the applicable canonical Markdown files and reviewed all seven as a coherent set. Their terminology and examples were checked together. This manifest records the consistency refinements applied after the independent semantic review.

Core consistency changes:
- Plan readiness is canonicalized as `exploratory`, `structured`, or `execution_ready`; partial progress is represented at task level rather than by alternate plan-readiness values.
- Plan readiness, plan status, task lifecycle, approval, execution authorization, verification, and acceptance remain separate dimensions. Approval gates record their requirement, authority, scope, conditions, current state, decision-maker, time, and evidence; a known pending gate blocks the governed action without automatically lowering plan readiness.
- Task lifecycle progression and correction paths are defined; `done` requires required verification and task-level acceptance gates to be resolved.
- A shared acceptance record is defined for task and plan/delivery scope, including authority, scope, criteria references, decision evidence, decision-maker, timestamp, conditions, and rationale.
- Verification outcomes use a canonical status vocabulary and remain separate from acceptance decisions.
- Decision lifecycle is limited to `proposed`, `approved`, `rejected`, and `superseded`; implementation verification is recorded separately.
- Typed dependency relationships use `status` consistently; soft dependencies define an explicit failure-conversion rule.
- Integration checkpoints have stable identities, revisions, explicit status vocabulary and progression, plus separate verification and acceptance records.
- The complete task-contract example defines every referenced task, decision, dependency endpoint, and integration checkpoint used in that example.
- Canonical task-contract and dependency examples use the explicit task `done` lifecycle state for completed prerequisites; pending approval examples identify the required approval authority.
- Typed dependency examples resolve external endpoints to explicit external-dependency records rather than leaving endpoint IDs implicit.
- Partial-readiness examples use canonical plan readiness while preserving individually ready tasks and independent authorization gates.
- Existing ownership, executor/contributor/reviewer/integrator responsibilities, resource-conflict modeling, revision-pinned delegation, independent validation, qualitative severity, review coverage, and limitation disclosure are retained.
