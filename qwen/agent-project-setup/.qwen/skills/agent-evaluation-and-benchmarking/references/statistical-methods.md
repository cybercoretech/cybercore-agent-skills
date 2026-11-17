# Statistical Methods for Agent Evaluation

Use statistical methods that match the decision, sampling design, outcome type, and degree of randomness. This document is a practical selection guide, not a substitute for specialist statistical review in high-stakes settings.

## 1. Start with the estimand

State what quantity the evaluation is trying to estimate. Examples:

- Probability that a randomly selected workload task succeeds under a fixed configuration.
- Difference in success probability between baseline and candidate on a defined task population.
- Probability that all attempts in a required sequence succeed.
- p95 end-to-end latency under stated concurrency.
- Expected cost per accepted task, including retries and tools.
- Rate of a specified safety violation per eligible exposure.

Specify the target population and operating conditions. A rate on a curated benchmark is not automatically an estimate of production performance.

## 2. Preserve denominators

Report counts as well as rates:

- Eligible tasks.
- Valid benchmark items.
- Executed runs.
- Passed, failed, errored, timed out, cancelled, skipped, and unevaluable runs.
- Exclusions and reasons.
- Number of independent trials per task.

Do not count invalid benchmark items as agent failures. Do not quietly remove difficult cases after observing results. Predefine exclusions and retain a complete accounting.

## 3. Repeated trials and uncertainty

Repeat stochastic tasks. The correct number of trials depends on baseline probability, desired precision, smallest practically important effect, task heterogeneity, and cost.

For a binary outcome, provide a suitable confidence interval for the observed proportion. Avoid normal approximations when counts are small or rates are near zero or one; use an appropriate interval method and state it. When task items are heterogeneous, distinguish uncertainty across runs on fixed tasks from uncertainty about the broader task population.

Repeated trials of the same item are not equivalent to testing many independent items. Treat task and run as separate sources of variation where possible. Consider hierarchical or mixed-effects analysis when the design supports it.

## 4. Paired comparisons

When baseline and candidate can be tested on the same task items, a paired design often reduces noise caused by task difficulty. Randomize or counterbalance order if caching, rate limits, shared state, or provider load can affect results.

For binary paired outcomes, use a method appropriate to paired discordant results rather than comparing two independent proportions as though all runs were unrelated. For continuous measures, inspect paired differences and distribution shape.

Do not assume pairing is valid if the baseline and candidate see different initial states, prompts, tool access, or order effects.

## 5. pass@k and pass^k

These metrics answer different operational questions.

- `pass@k`: probability that at least one of k attempts succeeds. This may represent workflows where retrying or selecting the best attempt is allowed.
- `pass^k`: probability that every one of k attempts succeeds. This reflects consistency requirements where every attempt must work.

State the estimator, whether attempts are independent, whether selection among attempts is allowed, and the target deployment behavior. Do not report a pass@k estimate from one observed run without a justified estimator. Do not describe pass^k as average success.

## 6. Comparisons and practical significance

Predefine the primary metric and the smallest effect that would change the decision. Report:

- Baseline and candidate values.
- Absolute and relative differences where meaningful.
- Uncertainty interval for the difference.
- Task-level and subgroup results.
- Practical importance and operational consequence.
- Any multiple-comparison or selection adjustment.

A statistically detectable improvement may be operationally trivial. A practically important improvement may remain uncertain with a small sample. Keep significance, magnitude, and decision importance distinct.

When many models, metrics, task families, or prompts are compared, control or explicitly discuss multiplicity and selection bias. Avoid highlighting only the strongest subgroup after inspecting results.

## 7. Latency, cost, and throughput

Latency is commonly skewed. Report median and relevant tail percentiles, sample counts, timeout rates, and measurement boundaries. Specify whether queue time, model inference, tool execution, retries, and human handoffs are included.

Cost needs an explicit accounting boundary: input/output tokens, cached tokens, model charges, external tools, browser services, container/runtime time, storage, and retries as applicable. Report cost per attempted task and per accepted task when both are useful.

Throughput comparisons must specify concurrency, resource caps, queueing behavior, and failure rates. Do not compare a sequential baseline with a highly concurrent candidate without describing the difference.

## 8. Safety and rare events

A zero observed violation does not prove zero risk. Report the number of relevant exposures and the uncertainty around rare-event rates. Use targeted adversarial cases and hard release gates for prohibited behaviors. Statistical aggregation must not make a single catastrophic or unauthorized event disappear.

Where the consequences are severe, define acceptance thresholds and exposure requirements with domain experts; do not invent a universal minimum sample size.

## 9. Drift and change-point detection

For continuous monitoring, preserve time order, workload mix, system fingerprints, and deployment events. Compare like-for-like cohorts and use baselines that account for seasonality, task mix, and external conditions where relevant.

A change-point alert is a signal for investigation, not proof of cause. Confirm with task-level evidence and controlled tests. Monitor false alarms and detection delays.

## 10. Inconclusive results

Use `inconclusive` when:

- Trial count is insufficient for the target effect or confidence.
- Benchmark validity is uncertain.
- Configuration differences are confounded.
- Data is missing or selectively excluded.
- Results are unstable across relevant task strata.
- The evaluator is not calibrated for the claim.

Do not round uncertainty away or convert inconclusive results into pass/fail using an arbitrary point estimate. State what additional evidence would resolve the question.
