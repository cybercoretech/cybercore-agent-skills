# Skill, Prompt, and Instruction Impact Evaluation

A skill or prompt is a behavior-changing system asset. Its value must be measured in the target workload and configuration. More instructions do not automatically produce better behavior.

## 1. Questions to answer

Measure both benefit and harm:

- Does the skill improve task outcomes?
- Does it activate when appropriate and stay inactive when inappropriate?
- Is it discovered and loaded by the target agent platform?
- Does the agent actually follow its useful constraints and procedures?
- Does it conflict with user instructions, higher-priority policy, or other skills?
- Does it anchor the agent to an unsuitable template or workflow?
- Does it add context, tokens, latency, tool calls, or cost?
- Does it generalize across tasks, models, harnesses, and platforms?
- Does it interact positively or negatively with other skills?

## 2. Baseline and treatment

Define:

- Baseline without the candidate skill or with the prior revision.
- Treatment with the candidate skill/revision.
- Exact model, agent platform, harness, instructions, tool set, permissions, environment, memory, and retrieval configuration.
- Task set, task-family strata, budgets, trial design, and graders.
- Expected activation labels: should activate, should not activate, or context-dependent.
- Primary outcome and non-regression/safety gates.

For a clean skill-lift test, hold other behavior-relevant factors stable. If the platform requires a different discovery mechanism, record that as part of the configuration. Do not attribute a discovery failure to the skill's content when the platform never loaded it.

## 3. Measure the stages separately

Distinguish:

1. **Availability:** was the skill installed or configured where the platform could discover it?
2. **Discovery:** did the agent/platform identify it as available?
3. **Activation:** was it selected for the task?
4. **Loading:** was the content actually included in the effective context?
5. **Adherence:** did the agent follow relevant guidance?
6. **Effect:** did behavior or outcome improve or degrade?

A copied skill file proves availability at a path, not discovery, activation, loading, adherence, or benefit. Collect platform evidence at each stage where possible. Mark unobservable stages as unknown.

## 4. Activation metrics

When task labels are reliable, use a confusion matrix:

- True positive: skill should activate and did.
- False positive: skill should not activate but did.
- False negative: skill should activate but did not.
- True negative: skill should not activate and did not.

Precision, recall, and false-activation rate may be useful, but define the positive class and denominator. Context-dependent cases should be separately adjudicated rather than forced into binary labels.

Test realistic activation prompts and near-miss prompts. Do not only test prompts copied from the skill's own description.

## 5. Adherence and interference

Adherence should be evaluated against observable, applicable requirements—not superficial phrase matching. A skill may be followed correctly yet still be harmful if the guidance is wrong or mismatched to the task.

Interference cases include:

- Conflict with explicit user constraints.
- Conflict with higher-priority safety or system instructions.
- Over-triggering on adjacent tasks.
- Under-triggering on intended tasks.
- Obsolete or overly specific procedural guidance.
- Prescribed templates that conflict with the task's actual requirements.
- Duplicated or contradictory instructions across skills.
- Context pressure causing relevant instructions to be omitted.
- Increased tool use or complexity without outcome benefit.

Record the exact instruction conflict and resulting behavior. Do not infer an instruction hierarchy violation without inspecting the effective instruction context.

## 6. Skill lift and harm

Compare task outcomes under matched baseline and treatment conditions. Report absolute differences, uncertainty, task-family variation, safety outcomes, and resource overhead. Include negative effects and neutral results.

Use holdout tasks when skill content has been tuned against a development set. Do not declare a general skill improvement from one task, one model, or one platform. Test the configurations in which the skill is intended to be used.

A skill may be beneficial for one task family and harmful for another. Report conditional results and narrow claims accordingly.

## 7. Composition and portability

For skill combinations, test relevant pairs or sets rather than assuming independent effects. Identify shared terminology, overlapping triggers, conflicting procedures, duplicated content, and combined context pressure.

For portability, distinguish:

- File/template parity.
- Platform discovery support.
- Successful loading.
- Activation behavior.
- Adherence.
- Measured performance effect.

A byte-identical file across platforms establishes only file parity. It does not demonstrate equivalent runtime behavior. Fingerprint the agent platform/version and its skill discovery configuration.

## 8. Recommended experiment matrix

| Condition | Skill | Platform | Purpose |
|---|---|---|---|
| Baseline | Absent | Same target platform | Establish behavior without skill |
| Treatment | Candidate revision | Same platform | Measure direct effect |
| Prior version | Previous revision | Same platform | Measure revision change |
| Near-miss | Candidate available | Same platform | Detect false activation |
| Combination | Candidate + companion skill | Same platform | Detect interaction |
| Portability | Candidate revision | Another platform | Test discovery/loading/adherence/effect |

Only include conditions needed for the decision. Keep trials matched and record differences.

## 9. Report format

Report skill identity/revision, platform and model fingerprint, discovery/loading evidence, expected activation labels, task coverage, baseline/treatment protocol, outcomes and uncertainty, adherence evidence, interference cases, overhead, portability limits, and recommendation.

Possible conclusions include beneficial for defined workload, beneficial with constraints, neutral within measurement limits, harmful for defined workload, platform-specific, inconclusive, or not evaluated. Avoid the binary label “good skill” without scope.
