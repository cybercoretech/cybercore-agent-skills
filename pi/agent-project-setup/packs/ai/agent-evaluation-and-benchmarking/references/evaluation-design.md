# Evaluation Design

This reference defines how to turn an evaluation request into a defensible experiment. The main skill defines the governing principles; use this document when designing a substantial evaluation or benchmark program.

## 1. Evaluation design brief

Create a brief before selecting tools or running tasks. Include:

```yaml
evaluation_design:
  id: EVAL-DESIGN-001
  revision: 1
  decision_question: "Does the candidate configuration meet the defined repository-maintenance workload?"
  intended_decision: compare
  target_users: [engineering_team]
  workload:
    description: "Bounded repository changes with tests and evidence"
    task_families: [code_change, debugging, testing, recovery]
    operating_conditions: [local_repository, restricted_network]
    autonomy_level: supervised
  consequences:
    incorrect_outcome: high
    unsafe_side_effect: unacceptable
  required_dimensions:
    - task_success
    - artifact_correctness
    - instruction_adherence
    - recovery
    - safety
    - cost
    - latency
  hard_gates:
    - no_changes_outside_target_repository
    - no_unapproved_external_side_effects
  exclusions:
    - production_deployment
  decision_rules:
    demonstrated: "All hard gates pass and predeclared workload thresholds are met"
    inconclusive: "Evidence is insufficient or benchmark validity is unresolved"
```

This is illustrative, not a universal schema. Adapt fields to the workload and keep required dimensions measurable.

## 2. Decision classes

Choose the primary decision:

- **Capability discovery:** determine which task families a system can handle.
- **Configuration comparison:** select between models, prompts, skills, tools, or harnesses.
- **Regression detection:** determine whether a change degraded an existing capability.
- **Release or autonomy gate:** determine whether a defined workload can be performed under stated restrictions.
- **Failure diagnosis:** explain a failed run or recurring failure pattern.
- **Intervention validation:** establish whether a repair improves the target outcome.
- **Production monitoring:** detect drift, changes in task mix, and new failure patterns.

One evaluation may support secondary decisions, but define one primary outcome to avoid post-hoc metric selection.

## 3. Task family and coverage design

Build a workload matrix. Example:

| Family | Normal | Boundary | Adversarial | Recovery | Risk |
|---|---:|---:|---:|---:|---|
| Repository edit | Yes | Missing file | Conflicting instruction | Failed test | Medium |
| Tool use | Yes | Optional argument | Malformed tool result | Timeout | Medium |
| Research | Yes | Conflicting sources | Prompt injection | Source unavailable | High |
| Multi-agent | Yes | Delayed worker | Conflicting outputs | Worker failure | Medium |
| Skill use | Expected activation | Near-miss | Competing skill | Load failure | Medium |

Do not use a table to imply that every cell must be populated. Choose cases according to observed workload and risk. Record why categories are included or excluded.

For each task, define:

- Stable task ID and revision.
- User-facing instruction and hidden evaluator requirements, kept separate.
- Initial environment and fixture version.
- Inputs, available tools, permissions, network policy, budgets, and timeout.
- Expected state or acceptable outcome set.
- Forbidden effects and invariants.
- Verification procedures and grader revisions.
- Difficulty/risk labels and sampling stratum.
- Known ambiguity, exclusions, and validity status.

An evaluation task should not reveal hidden grader rules unless the intended task does. Ensure task difficulty comes from the target capability, not accidental environment defects.

## 4. Baseline and candidate design

Define the baseline as an exact configuration, not a vague product name. Capture all relevant component revisions. A candidate may change one component or a defined set of components.

For a simple question, change one factor while holding the rest stable. If effects may depend on combinations, design a factorial or interaction-aware comparison. Avoid changing model, prompt, skill, tools, and environment simultaneously and then attributing the result to one of them.

Preserve baseline artifacts and ensure both configurations receive equivalent task content, permissions, time, tools, context availability, and evaluation criteria. Document unavoidable differences.

## 5. Online, offline, replay, and simulation

Select the execution mode deliberately:

- **Offline grading:** evaluate stored outputs or trajectories. Useful for grader development, but cannot reveal behavior that was never captured.
- **Trace replay:** replay a recorded interaction where tools and environment can be faithfully simulated. State which responses are replayed rather than live.
- **Sandbox execution:** run the agent in a fresh controlled environment with fixtures and bounded permissions.
- **Live integration:** exercise real external services only when explicitly authorized and protected by test accounts, isolation, and cleanup.
- **Simulation:** model a system or tool to test bounded behaviors. State what the simulation does not represent.

A replay is not automatically equivalent to a fresh execution. Nondeterministic model responses, changing external data, time, rate limits, and hidden state can invalidate exact replay assumptions.

## 6. Evaluation protocol and stopping rules

Specify before execution:

- Number of tasks and trials per task or stratum.
- Randomization and ordering method.
- Sampling frame and selection process.
- Concurrency and resource limits.
- Timeout and retry policy.
- Tool/network access and permissions.
- Model and evaluator settings.
- Grader and verification procedures.
- Primary and secondary metrics.
- Exclusion rules and item-invalidity handling.
- Stopping rule, budget limit, and early termination conditions.
- Human adjudication procedure.

Do not stop early merely because the current result looks favorable. Sequential analysis requires a predeclared method and stopping rule. If the budget forces early termination, report that the result may be underpowered.

## 7. Risk-based evaluation depth

Increase evaluation rigor with impact, autonomy, irreversibility, exposure, and uncertainty. A low-risk drafting assistant does not need the same gate as an agent with repository write, deployment, financial, or user-contact permissions.

High-impact systems should receive explicit negative tests for unauthorized actions, approval bypass, data leakage, wrong-target writes, partial failures, recovery, and false completion reports. The tests must run in isolated environments and must not reproduce harmful real-world effects.

## 8. Design review checklist

Before declaring an evaluation ready, ask:

- Does the evaluation answer a real decision question?
- Does its task set represent the intended workload?
- Are inputs and initial states controlled and versioned?
- Are baseline and candidate configurations fully fingerprinted?
- Are graders independent enough for the claims being made?
- Are hard safety gates explicit?
- Are task exclusions and invalidity rules defined?
- Are sample size and statistical methods defensible?
- Are cost and latency measured on comparable boundaries?
- Is there a holdout set where tuning or benchmark familiarity is possible?
- Can the run be reproduced or are limitations clearly recorded?
- Are data handling and execution permissions approved?

A failed review should return the design to `designed`, `draft`, or `audited` as appropriate; do not run an invalid experiment just to obtain a score.
