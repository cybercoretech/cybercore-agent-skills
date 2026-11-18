# Failure Attribution and Intervention Validation

This reference defines the Failure Attribution Engine's conceptual method. It is useful with manual trace review, custom scripts, existing observability platforms, or the in-development CyberCore Agent Evaluation Workbench.

## 1. Attribution objectives

A useful investigation answers three distinct questions:

1. **Localization:** where did the first decisive failure or missed containment opportunity occur?
2. **Causal explanation:** which component, condition, interaction, or assumption produced or materially contributed to the observed failure?
3. **Repair prioritization:** which intervention is most likely to prevent recurrence with acceptable side effects?

The earliest decisive event and the best repair target may differ. A faulty tool response may be the first decisive event, while a missing validation layer is the best repair target. Record both.

## 2. Distinguish observations from explanations

- **Anomaly:** an unexpected but not necessarily harmful event.
- **Error:** an action or state that violates a requirement, contract, or invariant.
- **Failure:** an expected outcome is not achieved or a prohibited outcome occurs.
- **Detection gap:** an intended detector, monitor, or verifier did not recognize a relevant error or violation.
- **Containment gap:** an issue was detected or otherwise observable to an enforcing control, but the required prevention, blocking, or containment mechanism did not stop or limit its effects.
- **Reporting gap:** a material action, state, violation, or outcome was omitted, delayed, or inaccurately represented to an intended recipient or downstream system.

These gaps are distinct and may coexist. Assign each only when its expected control or reporting obligation is defined and evidence shows that it failed. A missed detection does not by itself establish a containment gap; an inaccurate report does not establish that the underlying issue was undetected.

A run may contain many errors and still recover to a valid outcome. A run may appear successful while containing a prohibited action. Record intermediate errors, recovery, final state, and safety violations separately.

Do not classify every unusual action as a failure. Define the violated condition and evidence.

## 3. Attribution taxonomy

Use one or more contributing categories; do not force a single label when the evidence supports multiple causes.

| Category | Examples |
|---|---|
| Model behavior | Reasoning error, instruction interpretation, unsupported claim, unstable tool choice |
| Task/instruction | Ambiguity, contradiction, missing precondition, incorrect task scope |
| System prompt/policy | Conflicting rule, missing constraint, poor prioritization |
| Skill/instruction asset | Incorrect guidance, stale procedure, over-triggering, interference |
| Context management | Truncation, missing context, ordering, summarization loss |
| Memory/retrieval | Stale result, wrong retrieval, indexing issue, provenance loss |
| Planning/orchestration | Incorrect decomposition, dependency, routing, handoff, retry, or stopping logic |
| Tool selection | Wrong tool or omitted required tool |
| Tool contract/adapter | Schema mismatch, mapping bug, incorrect working directory, serialization |
| Tool execution | Tool runtime error, timeout, partial side effect, invalid result |
| Permissions/authorization | Missing capability, excessive privilege, approval bypass, wrong identity |
| Environment | Dependency, fixture, filesystem, network, resource, or state defect |
| External dependency | Provider outage, rate limit, changing data, unavailable service |
| Benchmark/ground truth | Invalid task, reference, fixture, or expected outcome |
| Grader/verifier | False pass/fail, wrong target state, incomplete assertion, judge drift |
| Detection | Missed violation, detector/verifier failed to recognize an observable error |
| Containment | Expected prevention, authorization, blocking, or containment control failed to stop or limit an issue |
| Reporting | False completion claim, omitted material action, inaccurate status propagation |
| Multi-agent interaction | Conflicting outputs, lost handoff, ownership gap, integration failure |
| Unknown | Evidence is insufficient or competing explanations remain unresolved |

These are diagnostic categories, not judgments of responsibility. A model-related category does not imply that changing the model is the correct repair.

## 4. Reconstruct the execution before assigning cause

Collect and order observable evidence:

- User/task request and applicable requirements.
- System fingerprint and relevant asset revisions.
- Initial environment and state.
- Agent-visible events, messages, and tool calls.
- Tool arguments, results, errors, and timing.
- State changes and external effects.
- Retry, recovery, handoff, and escalation behavior.
- Verification steps and actual final state.
- Agent completion report.
- Independent evaluator result.

Identify the first decisive failure event, later propagation, recovery attempts, and applicable detection, containment, and reporting gaps. Do not infer hidden model reasoning from a trace. Treat missing spans or unavailable payloads as missing evidence, not as proof that an event did not occur.

## 5. Causal graph model

Use a directed graph to represent causal hypotheses and evidence. A graph may have multiple candidate causes and multiple paths to the observed failure.

### Node types

- `event`: an observed action, result, or state transition.
- `condition`: a configuration or environment condition.
- `invariant`: a required property or constraint.
- `anomaly`: unexpected event not yet shown to violate a requirement.
- `error`: a demonstrated violation.
- `failure`: unmet objective or prohibited outcome.
- `detection_gap`: an intended detector, monitor, or verifier did not recognize a relevant error or violation.
- `containment_gap`: an expected prevention, blocking, or containment control failed to stop or limit an issue that was detected or otherwise observable to that control.
- `reporting_gap`: a material action, state, violation, or outcome was omitted, delayed, or inaccurately represented.
- `asset`: a versioned model/configuration/prompt/skill/tool/environment component.
- `hypothesis`: a proposed causal explanation not yet established.

### Relationship types

- `caused`: evidence supports a direct causal relationship.
- `contributed_to`: materially increased the likelihood or severity of the outcome.
- `enabled`: made the failure path possible.
- `amplified`: increased scope, severity, or recurrence.
- `propagated_to`: carried an error into a downstream state.
- `prevented_recovery`: blocked a plausible recovery path.
- `escaped_detection`: links an error/failure node (source) to the `detection_gap` node (target) representing the control that did not recognize it. This is a diagnostic relationship, not by itself a causal claim.
- `escaped_containment`: links an error/failure node (source) to the `containment_gap` node (target) representing the control that did not stop or limit it. This is a diagnostic relationship, not by itself a causal claim.
- `misreported_as`: links an observed fact, error, or failure node (source) to the `reporting_gap` node (target) representing its omission or inaccurate representation. This is a diagnostic relationship, not by itself a causal claim.
- `manifested_as`: appeared as an observed downstream symptom.
- `correlated_with`: statistical association only; not a causal claim.
- `preceded`: temporal ordering only; not a causal claim.

Do not use `caused` merely because A occurred before B. A causal graph may contain a separate correlation or temporal association edge, but those edges must not be counted as causal evidence. Keep causal edges directed and acyclic; represent feedback or recurrent behavior as separate time-indexed events rather than creating a causal cycle.

### Minimum node fields

```yaml
node_id: NODE-014
node_type: event
label: "Filesystem write completed in unexpected workspace"
observed_at: "2026-11-16T18:24:11Z"
source_refs: [EVID-014]
asset_refs: [ASSET-WORKSPACE-ADAPTER-R1]
evidence_quality: direct
certainty: observed
```

### Minimum edge fields

```yaml
edge_id: EDGE-009
source_node: NODE-014
target_node: NODE-018
relationship: contributed_to
supporting_evidence: [EVID-014, EVID-018]
rationale: "The target repository remained unchanged after the write operation."
confidence: medium
alternatives: ["Concurrent cleanup may also explain the missing artifact."]
```

The values are illustrative. Every material edge needs an evidence reference and concise rationale. A graph with an unsupported edge is a hypothesis map, not a confirmed causal graph.

## 6. Confidence and attribution status

Keep confidence, evidence quality, and attribution status distinct.

- `low`: weak or incomplete evidence; plausible alternatives remain.
- `medium`: multiple observations support the hypothesis, but alternatives or confounders remain.
- `high`: strong direct/mechanistic evidence and limited plausible alternatives.

Do not present these labels as calibrated probabilities unless calibration has been measured. Use explicit evidence links and explain why confidence was assigned.

Attribution lifecycle:

- `uninvestigated`: no substantive diagnosis yet.
- `investigating`: evidence collection and hypothesis development underway.
- `provisional`: one or more plausible explanations have support but are not established.
- `confirmed`: direct mechanistic evidence establishes the mechanism, or a suitably controlled and replicated intervention supports the causal claim.
- `refuted`: evidence contradicts the hypothesis.
- `unresolved`: evidence is insufficient, irrecoverable, or conflicting.

A temporal association, LLM-generated explanation, or single uncontrolled replay cannot by itself confirm a cause. A single intervention run may strengthen a hypothesis but does not satisfy the replicated-intervention standard. In high-stakes cases, require independent review in addition to the applicable confirmation evidence.

## 7. Competing hypotheses and counterfactual discipline

Maintain more than one hypothesis when evidence permits. For each hypothesis, record:

- What it predicts.
- Supporting and contradicting evidence.
- Alternative explanations and confounders.
- Evidence missing to discriminate it from alternatives.
- A safe test or intervention that could change confidence.
- Expected repair mechanism and potential side effects.

Counterfactual questions such as “would the task have succeeded without this skill?” are not answered merely by imagining a different trace. They require controlled comparison, a defensible replay, or an explicit statement that the counterfactual cannot be established.

## 8. Repair target ranking

Rank candidate interventions using more than confidence alone. Consider:

- Expected reduction in target failures.
- Number and criticality of affected workloads.
- Strength of causal evidence.
- Feasibility and reversibility.
- Side-effect and regression risk.
- Implementation and operational cost.
- Blast radius and approval requirements.

Do not fabricate a numeric priority score. If a formula is used, publish the components, weights, uncertainty, and sensitivity. A low-cost containment control may be the immediate priority while a deeper root-cause correction remains under investigation.

## 9. Controlled intervention protocol

1. Preserve baseline evidence, fingerprints, benchmark revision, and environment.
2. Define the targeted causal hypothesis and expected mechanism.
3. Identify the exact versioned asset or component to change.
4. Assess permissions, privacy, external effects, sandbox, and rollback.
5. Obtain required human approval.
6. Define control and treatment conditions, task set, trial design, budgets, and primary metrics.
7. Change only the intended factor unless an interaction design is explicitly planned.
8. Run the original failing tasks and relevant adjacent regressions.
9. Independently verify actual outcomes and safety invariants.
10. Analyze uncertainty, task strata, side effects, cost, and latency.
11. Update attribution status and record whether the hypothesis was supported, refuted, or unresolved.
12. Preserve the intervention and results as immutable versioned records.

A successful intervention strengthens a causal claim only when the design rules out plausible alternatives. If the intervention changes multiple components, do not attribute the observed effect to one of them without further experiments.

## 10. Failure Attribution Report

```yaml
attribution_report:
  id: ATTR-00482
  revision: 1
  run_id: RUN-00482
  failure_ids: [FAIL-008]
  status: provisional
  decisive_event_refs: [EVENT-014]
  detection_gap_refs: [GAP-003]
  containment_gap_refs: []
  reporting_gap_refs: []
  hypotheses:
    - hypothesis_id: HYP-001
      category: tool_contract_adapter
      claim: "Workspace path resolution selected the wrong repository root."
      confidence: medium
      supporting_evidence: [EVID-014, EVID-018]
      contradicting_evidence: []
      alternatives: [HYP-002]
      next_test: "Run a controlled adapter test with an explicit target path."
  repair_candidates:
    - asset_ref: ASSET-WORKSPACE-ADAPTER-R1
      proposed_action: "Correct workspace-root resolution and add a contract test."
      expected_effect: "Writes target the requested repository."
      validation_plan_ref: INTERVENTION-001
  limitations:
    - "The original process environment was not fully captured."
```

The three gap-reference fields are independent; include only applicable, evidence-supported references and use empty arrays where none were identified. This is illustrative. Do not populate fields without evidence.

## 11. Attribution quality checklist

- Is the failure independently verified?
- Is the decisive event distinguished from the final symptom?
- Are tool, environment, task, grader, permission, and orchestration causes considered?
- Are multiple causes and interactions represented where appropriate?
- Are detection, containment, and reporting gaps classified independently rather than collapsed into one label?
- Are causal edges supported by evidence and distinct from correlation?
- Are alternative explanations and missing telemetry recorded?
- Is confidence calibrated or clearly qualitative?
- Is the repair target tied to a versioned asset?
- Is the intervention controlled, approved, and reversible where possible?
- Did validation include original cases, adjacent regressions, and safety gates?
- Are unresolved findings preserved rather than forced into a conclusion?
