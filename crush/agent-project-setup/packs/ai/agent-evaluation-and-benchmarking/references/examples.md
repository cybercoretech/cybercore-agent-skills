# Evaluation Examples and Anti-Patterns

These examples illustrate methodology. IDs, results, confidence labels, and data are synthetic and must not be reported as real measurements.

## 1. Coding agent reports success but changes the wrong workspace

**Task:** Update a configuration loader, add tests, run the relevant suite, and do not modify files outside the target repository.

**Observed:** The agent reports success and the test command exits zero. Independent inspection finds no changes in the target repository.

**Investigation:** The trace shows a filesystem adapter writing to a different workspace. The test command also executes in that workspace. A verifier that checks only the process exit code accepts the run.

**Attribution:**

- Decisive failure: write target does not match the requested repository.
- Contributing component: workspace path resolution.
- Detection gap: verification does not inspect the target repository state.
- Reporting gap: the completion report implies the requested artifact was created in the target repository without evidence of that state.
- Containment gap: do not assign one solely from the failed verification; assign it only if evidence shows that an expected write-boundary, permission, or sandbox control should have blocked the out-of-scope write and failed.
- Alternative to investigate: concurrent cleanup or fixture reset.

**Repair:** Test adapter path resolution, add target-state artifact verification, and require acceptance evidence before success reporting. Replay in an isolated environment and verify no out-of-scope files changed.

Do not blame model reasoning unless evidence shows the model selected the wrong path despite receiving correct adapter/environment information.

## 2. Skill impact is mixed

A skill increases adherence to a repository-specific testing procedure but causes failures on tasks requiring a different build system because its examples are too prescriptive.

**Evaluation design:** Matched baseline and treatment runs; tasks stratified by the intended repository family and adjacent near-miss tasks; exact skill revision recorded; discovery and loading evidence captured.

**Findings:** The skill benefits the target family but causes interference in the adjacent family. Overall mean hides the conditional effect.

**Decision:** `demonstrated_with_constraints` for the intended repository family, not universally beneficial. Revise activation description and instructions, then validate on a holdout set.

## 3. Cross-run cluster suggests an adapter regression

Across several hundred runs, filesystem failures increase after an adapter update. The adapter is used by multiple models and skills.

**Initial conclusion:** Association and temporal regression candidate only.

**Next steps:** Compare exposed cohorts with matched task families, verify the adapter revision in each run fingerprint, inspect event signatures, and run a controlled adapter A/B experiment. If the treatment restores behavior across repeated trials without side effects, causal confidence increases.

Do not assert causation solely because the failures began after deployment.

## 4. Benchmark task is defective

A browser benchmark task expects a result from a page that is unavailable in the provided environment. Multiple agents fail the same task.

**Audit:** Environment defect; ground truth may be correct but is not reachable under the task's conditions.

**Action:** Quarantine the task from agent performance denominators, preserve the failure evidence, repair the environment in a new revision, and rerun affected comparisons. Do not score the agents as incapable based on an invalid item.

## 5. Safety gate overrides task success

An agent correctly completes a workflow but sends a real message without required approval.

**Outcome:** Task objective may have been achieved, but the run fails the safety/authorization gate.

**Report:** Record completion and prohibited side effect separately. Do not average the unauthorized action away. Investigate permissions, tool gateway, approval logic, and agent behavior.

## 6. Inconclusive model comparison

Two configurations have similar observed success rates, but the task sample is small and confidence intervals overlap a practically important difference.

**Decision:** `inconclusive` rather than “equivalent.” Define additional sampling or a better-matched workload. Absence of a detected difference is not proof of equivalence.

## 7. Causal graph fragment

```yaml
nodes:
  - node_id: CONDITION-1
    node_type: condition
    label: "Workspace adapter configured with stale root"
    source_refs: [EVID-1]
  - node_id: EVENT-1
    node_type: event
    label: "Write completed outside target repository"
    source_refs: [EVID-2]
  - node_id: FAILURE-1
    node_type: failure
    label: "Required artifact absent from target repository"
    source_refs: [EVID-3]
  - node_id: GAP-1
    node_type: detection_gap
    label: "Completion gate accepted command exit code without target inspection"
    source_refs: [EVID-4]
  - node_id: REPORT-GAP-1
    node_type: reporting_gap
    label: "Completion report implied the target artifact was saved without target-state evidence"
    source_refs: [EVID-5]
edges:
  - edge_id: EDGE-1
    source_node: CONDITION-1
    target_node: EVENT-1
    relationship: contributed_to
    supporting_evidence: [EVID-1, EVID-2]
    confidence: medium
  - edge_id: EDGE-2
    source_node: EVENT-1
    target_node: FAILURE-1
    relationship: manifested_as
    supporting_evidence: [EVID-2, EVID-3]
    confidence: high
  - edge_id: EDGE-3
    source_node: FAILURE-1
    target_node: GAP-1
    relationship: escaped_detection
    supporting_evidence: [EVID-3, EVID-4]
    confidence: high
  - edge_id: EDGE-4
    source_node: FAILURE-1
    target_node: REPORT-GAP-1
    relationship: misreported_as
    supporting_evidence: [EVID-3, EVID-5]
    confidence: high
```

For `escaped_detection`, the source is the error/failure that went unrecognized and the target is the `detection_gap` that represents the missed control. `misreported_as` similarly links the underlying fact or failure to the reporting gap. These are diagnostic relationships, not causal edges by themselves. Validate the semantics of every edge; `manifested_as` is not interchangeable with a causal relationship.

## 8. Anti-patterns

- **One-run leaderboard:** a single attempt is reported as reliable capability.
- **Agent self-grading:** agent's own “done” message is the only verifier.
- **Prompt blame by default:** every failure is attributed to the prompt/model without checking tools, environment, or graders.
- **Text-only clustering:** failures are grouped solely by similar explanations or error messages.
- **Correlation presented as root cause:** a revision happened before a failure, therefore it is declared responsible.
- **Invalid benchmark items counted as failures:** task/environment/grader defects are ignored.
- **Average hides unsafe behavior:** high task success offsets a prohibited action.
- **Uncontrolled repair:** several assets change at once, then one is credited for improvement.
- **No holdout:** a benchmark is repeatedly tuned until the score looks good.
- **Stale passport:** a capability claim is reused after material configuration changes.
- **Invented certainty:** missing traces or tiny samples are converted into high-confidence diagnoses.

## 9. Minimum evaluation report example

```yaml
evaluation_report:
  id: REPORT-001
  decision: inconclusive
  evaluation_id: EVAL-001
  system_fingerprint: SYS-REV-4
  benchmark_revision: SUITE-REV-2
  valid_items: 38
  invalid_items: 2
  executed_runs: 76
  outcomes:
    passed: 54
    failed: 15
    errored: 4
    timed_out: 3
  primary_metric:
    name: task_success_rate
    value: 0.7105
    uncertainty_method: "method documented in report"
    interval: [0.60, 0.80]
  hard_gates:
    unauthorized_side_effects: 0
    privacy_violations: 0
    result: passed
  limitations:
    - "The benchmark does not represent production workload frequency."
    - "The sample is insufficient to distinguish the predeclared small effect."
  next_action: "Expand the matched task sample and repeat the candidate comparison."
```

The numbers and interval are fictional placeholders. Never copy them into a real report.
