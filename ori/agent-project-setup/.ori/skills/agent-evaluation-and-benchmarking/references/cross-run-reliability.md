# Cross-Run Reliability Analysis

This reference covers patterns that appear across many executions. The objective is to discover recurring systemic weaknesses without confusing frequency, correlation, or temporal coincidence with causality.

## 1. Normalize before comparing

Before clustering or trend analysis, verify that records share compatible semantics and identify their differences:

- Run/event schema version.
- Agent, harness, model, prompt, skill, tool, and environment fingerprints.
- Benchmark/task revision and workload family.
- Verifier/grader revision.
- Permissions, budgets, concurrency, and network conditions.
- Exposure: whether the component was actually used or eligible to affect the run.
- Outcome definitions and exclusion rules.

Do not combine incompatible records merely because they contain similar error strings.

## 2. Failure signatures

A failure signature should summarize stable, observable characteristics, such as:

- Violated invariant or acceptance criterion.
- Error/failure category.
- Relevant event sequence or state transition.
- Tool and adapter outcome.
- Missing or incorrect artifact/state.
- Detection, containment, or reporting gap (classified separately).
- Affected task family and operating conditions.
- Component revision and exposure.

Keep raw evidence references. A signature is a grouping aid, not a diagnosis. Version signature algorithms and preserve the features used so cluster membership can be reviewed.

Avoid clustering only on free-text agent explanations, judge-generated summaries, or provider error messages. These may be noisy or manipulable. Use semantic clustering as a candidate-discovery tool, then require evidence review.

## 3. Cohort and exposure analysis

Define cohorts deliberately: same task family, comparable difficulty, same evaluation protocol, similar permissions and environment, and known component revisions. Count eligible exposures, not just total runs.

A tool adapter used in 80% of runs will naturally appear in many failures. Compare its failure rate among exposed runs with an appropriate comparison cohort. Consider task mix, model, harness, skill, permissions, date, and external service state as potential confounders.

Report:

- Exposed run count and failure count.
- Rate and uncertainty.
- Matched or adjusted comparison group.
- Task-family distribution.
- Missing data and exclusions.
- Relevant revision/date intervals.

If cohort sizes or confounders prevent a fair comparison, say so. Do not rank components by raw failure count alone.

## 4. Recurrence, association, regression, and cause

Use these terms precisely:

- **Recurrence:** a similar failure signature appears in multiple runs.
- **Association:** a failure is more frequent in a cohort with a component or condition.
- **Regression:** performance worsens after a change under comparable conditions.
- **Causal contribution:** evidence supports that a condition or asset produces or materially increases the failure.
- **Confirmed cause:** direct mechanistic evidence establishes the mechanism, or a suitably controlled and replicated intervention supports the causal claim.

A failure beginning after a deployment is a temporal association. It becomes a regression claim only after comparable baseline and candidate conditions are examined. It becomes a causal claim only with stronger evidence.

## 5. Asset blast-radius analysis

Construct an asset-to-run/task relationship index for versioned components:

- Model/configuration.
- System prompt and task templates.
- Skills and instruction packages.
- Tool definitions and adapters.
- Memory/retrieval datasets and indexes.
- Planner/router/orchestrator.
- Environment images and dependencies.
- Graders, verifiers, and reference datasets.

For a candidate asset revision, answer:

- Which runs and tasks used it?
- Which task families were exposed?
- What changed between revisions?
- Did failure rate, safety, cost, or latency shift?
- Which other components changed at the same time?
- Which candidate regressions have been independently reproduced?
- What is the known and unknown blast radius?

Do not infer exposure merely because a skill or tool was installed; collect activation or invocation evidence when available.

## 6. Drift and change-point investigation

Monitor workload-specific signals such as:

- Task success and partial completion.
- Error and timeout rates.
- Tool selection and argument validity.
- Recovery and retry behavior.
- False completion reports and verification gaps.
- Safety/authorization violations.
- Cost per attempted and accepted task.
- Median and tail latency.
- Human escalation/intervention rate.
- Skill activation and adherence.

Define alert windows, minimum exposure, thresholds, and false-alarm handling. Account for task mix and seasonality. A statistical change-point or anomaly alert should create an investigation, not automatically declare a regression or identify a cause.

## 7. Interaction effects

A component may work alone and fail in combination. Evaluate interactions among:

- Skill and system prompt.
- Multiple skills.
- Model and tool schema.
- Model and harness.
- Memory and retrieval policy.
- Planner and tool permissions.
- Retry behavior and rate limits.
- Agent and environment image.

Use factorial or focused pairwise designs when interaction risk is material. Do not claim that individually positive component effects guarantee a positive combined effect.

## 8. Cluster lifecycle and triage

A failure cluster should have a stable ID and revision, signature version, member run/task IDs, cohort, observed interval, exposure denominator, affected assets, hypothesis links, evidence coverage, owner, triage state, and resolution references.

Suggested triage states:

- `new`
- `triaged`
- `investigating`
- `provisional_cause`
- `confirmed_cause`
- `mitigated`
- `resolved`
- `monitoring`
- `reopened`
- `invalid_cluster`

Keep triage status distinct from individual run outcomes and attribution status. A cluster may be resolved operationally while its historical cause remains unresolved.

## 9. Cross-run report

A useful report includes:

1. Cohort definition and time window.
2. Exposure and denominator counts.
3. Cluster/signature summary.
4. Task-family and configuration distribution.
5. Revision and deployment timeline.
6. Rates with uncertainty and comparison method.
7. Candidate blast radius.
8. Attribution status and competing hypotheses.
9. Recommended controlled investigation/intervention.
10. Limitations and unobserved populations.

Do not describe a pattern across sampled runs as universal behavior outside the sampled cohort.
