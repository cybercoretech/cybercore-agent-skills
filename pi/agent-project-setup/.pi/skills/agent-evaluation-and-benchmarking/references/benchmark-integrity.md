# Benchmark Integrity and Grader Audit

A benchmark can produce precise-looking but invalid results. Audit the benchmark before using its score to make decisions. Examine four coupled elements: task specification, execution environment, ground truth, and evaluation protocol/grader.

## 1. Task specification audit

Check whether each task has:

- A clear, coherent objective and sufficient context.
- An unambiguous definition of acceptable outcomes, including valid alternatives.
- Explicit constraints and prohibited side effects.
- Inputs and references available to the agent at the intended time.
- A difficulty level aligned with the capability being measured.
- No accidental dependence on unstated conventions or hidden evaluator knowledge.
- No instruction conflicts that make the task impossible unless conflict handling is the intended capability.

Classify defects such as ambiguous, underspecified, contradictory, out of scope, duplicate, unsolvable, or dependent on unavailable information.

## 2. Environment audit

Verify:

- Initial state and fixtures are correct and reproducible.
- The environment actually exposes the intended tools, files, services, and permissions.
- Dependency versions and external endpoints are recorded.
- Network policy matches the task design.
- Timeouts and resource limits do not accidentally make the task impossible.
- Shared state, caching, hidden state, and order effects are controlled or documented.
- The evaluator and agent receive only the information each is intended to receive.
- Cleanup and isolation work between tasks.

Environment failure should not be mis-scored as agent inability. Preserve logs and classify affected items as environment-defective until repaired and revalidated.

## 3. Ground-truth audit

Inspect whether reference answers, expected artifacts, hidden states, or reference trajectories are:

- Correct and internally consistent.
- Current for the dataset and environment revision.
- Complete enough to distinguish acceptable alternatives.
- Independent of the exact agent implementation being tested.
- Free of accidental leakage into agent-visible materials.
- Valid for the task's intended scope and assumptions.

For repository tasks, verify the base commit, issue relevance, tests, and whether the reference change actually satisfies the stated request. For research tasks, verify sources and facts independently. For browser or tool tasks, verify the target state rather than relying exclusively on a recorded click sequence.

## 4. Grader and protocol audit

A grader should measure the stated acceptance criteria, not incidental style or similarity to one reference trajectory.

For deterministic graders:

- Test positive, negative, boundary, and malformed cases.
- Check that a valid alternative solution is not rejected.
- Check that incorrect shortcuts cannot pass.
- Verify the grader targets the correct environment and artifact.
- Ensure setup and teardown do not alter the result.

For model-based graders:

- Use a clear rubric with observable criteria.
- Separate dimensions rather than asking for one vague quality score.
- Test against expert-labeled calibration examples.
- Measure disagreement and inspect false positives/negatives.
- Blind the judge to system identity when feasible and relevant.
- Control judge model/version, prompt, temperature, and context.
- Check position, verbosity, style, and reference-answer bias.
- Preserve judge explanations as hypotheses, not ground truth.

For human graders:

- Provide shared rubrics and calibration examples.
- Use blinded review when practical.
- Measure inter-rater agreement where more than one reviewer is used.
- Adjudicate disagreements and preserve rationale.
- Avoid asking reviewers to infer facts absent from the evidence.

A judge's output is not automatically correct because it is structured or confident.

## 5. Contamination and leakage

Assess whether benchmark tasks, solutions, tests, hidden references, or grading rules may have appeared in model training, public repositories, agent context, previous runs, or tuning data.

Use holdout sets, controlled access, task rotation, and fresh variants where appropriate. Record provenance and exposure history. Do not claim a benchmark is uncontaminated unless that has been established; use `unknown` where it has not.

Be alert to reward hacking and shortcuts: hard-coded answers, exploiting grader assumptions, modifying tests, searching for hidden expected outputs, or satisfying a superficial assertion without achieving the intended state.

## 6. Item validity and benchmark-level validity

Use the canonical item validity states from the main skill. Quarantine invalid items from performance denominators while preserving their IDs, evidence, reason, and correction history.

Benchmark-level audit should report:

- Number and proportion of items in each validity state.
- Coverage by task family, difficulty, and risk.
- Grader calibration and known blind spots.
- Reproducibility and environment health.
- Contamination/leakage assessment.
- Exclusions and benchmark revision history.

A benchmark can be partially usable. Narrow the claim to valid items and disclose the limitation rather than silently presenting the full benchmark as sound.

## 7. Benchmark repair and versioning

Do not modify a benchmark item in place after it has generated results. Create a new revision and preserve the old item and its validity finding. Re-run affected comparisons when a correction changes the expected behavior, environment, reference, or grader materially.

Changes to graders can change historical scores even when agent behavior is unchanged. Record evaluator revisions and, where appropriate, re-score stored outputs under both old and new graders to quantify grader-induced differences.

## 8. Audit report template

```yaml
benchmark_audit:
  benchmark_id: example-suite
  revision: 3
  audit_status: reviewed_with_findings
  task_specification: reviewed_supported
  environment: reviewed_with_findings
  ground_truth: unable_to_verify
  grader_protocol: reviewed_with_findings
  contamination: unknown
  valid_items: 72
  quarantined_items: 5
  excluded_items: 3
  findings:
    - id: BENCH-FIND-001
      severity: major
      category: environment_defect
      affected_items: [TASK-014, TASK-019]
      evidence_refs: [EVID-112, EVID-119]
      disposition: quarantined
  limitations:
    - "Ground-truth review is incomplete for two task families."
```

The values are illustrative. Do not use `reviewed_supported` unless the cited evidence supports it.
