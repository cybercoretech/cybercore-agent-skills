---
name: skill-evaluation
description: Test whether an agent skill actually helps before shipping or changing it. Runs trigger tests (does it activate on the right requests and stay quiet on near misses), then an effect test that compares the same agent with and without the skill (or old versus new revision) on tasks where it should matter and control tasks where it should not, using the CyberCore Agent Evaluation Workbench when available. Covers holdout tasks, adherence checks, token and cost overhead, comparisons declared in advance, and an honest, scoped verdict. Use when writing, revising, choosing, or removing a skill, rule or system prompt; when asked whether a skill is worth it; or before publishing skills to others.
metadata:
  version: "1"
---

# Skill Evaluation

You find out whether a skill makes an agent better at the work it is meant for, without making it worse elsewhere, and you say exactly how far the evidence goes. Many public skills do not help; a skill is a hypothesis until it has been measured.

## Scope

- Trigger tests: activation on intended requests, silence on near misses
- Effect tests: with versus without the skill, or revision versus revision
- Designing tasks where the skill should matter, control tasks, and holdout tasks
- Checking adherence and overhead (tokens, cost, time)
- Running the comparison with the Workbench and reporting a scoped verdict

The measurement methodology (stages from availability to effect, activation confusion matrices, interference, portability) lives in `agent-evaluation-and-benchmarking` and its `references/skill-impact.md`. Writing the skill itself is `prompt-engineering-for-agents`. This skill is the hands-on workflow.

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**

- Running evaluations that make billed model API calls without the user agreeing to the expected number of trials and an approximate cost. Use a fake API or a dry run to check the pipeline first.
- Putting API keys or other secrets into task inputs, suite files or skills. Grant them through the runner's credential mechanism.
- Sending task outputs to a model judge without the user's consent (the judge sees agent output)
- Publishing claims ("this skill improves X by Y%") beyond the tasks, agent, model and platform actually tested
- Tuning the skill against the same tasks you then report as evidence; reported results come from holdout tasks

## Workflow

### 1. State the hypothesis

One sentence per claim: "With `clarify-before-building`, the agent asks about purpose before coding on vague feature requests, and builds the requested thing more often." Name the target agent platform, model and task family. Decide in advance what result would make you drop or change the skill.

### 2. Trigger tests (cheap, run first)

Build a small prompt set (`references/trigger-tests.md`):

- **Should activate:** realistic requests the skill is for, written in users' words, not copied from the description
- **Should not activate:** adjacent requests where it would be noise
- **Near misses:** requests that share words with the description but need something else
- **Context-dependent:** cases where activation depends on the repository or conversation; judge these separately

Run each on the target platform and record evidence that the skill was loaded (the platform's skill-invocation log, a transcript, or a marker the agent writes). If loading is not observable, record "unknown", not "activated". Fix the description and rerun until false activations and misses are acceptable. A skill that never loads cannot help, and one that loads everywhere taxes every task.

### 3. Design the effect test

- **Target tasks** where the skill should change the outcome, with checks a verifier can apply: exact checks where possible, model-judge rubrics for qualities like "asked about purpose first". Turn the skill's own verification checklist into criteria.
- **Control tasks** from the same domain where the skill should make no difference. They catch harm: slower, noisier or wrong behaviour caused by the skill.
- **Holdout split:** tasks used while writing or tuning the skill are development tasks. Report results only from tasks you did not tune against.
- **Repeats:** run each task several times (at least three) so reliability is visible, and use enough distinct tasks for intervals (ten or more for a computed result).

`references/task-design.md` covers writing tasks and criteria.

### 4. Run it with the Workbench

When the CyberCore Agent Evaluation Workbench is available, express the test as a **task suite** with two agents that differ only in the skill (`references/workbench-suite.md`):

- `BASELINE`: the agent without the skill, or with the previous revision
- `TREATMENT`: the same agent, model and settings with the skill installed
- the same tasks, repeats, runner, network allowlist and verifier for both
- a `compare` entry so the comparison is frozen in advance and can be confirmatory
- optional readiness gates: no loss on control tasks, a cost ceiling, a consistency floor

Then: `workbench run suite.json --dry-run`, the run itself, `workbench compare`, `workbench failures`, `workbench summary` (reliability and cost), and `workbench report` for the write-up. Without the Workbench, keep the same structure by hand: matched conditions, fixed tasks and criteria decided before running, and repeats.

### 5. Check adherence and overhead

- **Adherence:** did the agent do what the skill says when it applied? Read a sample of transcripts or outputs; a pass with the skill ignored is not evidence for the skill.
- **Overhead:** extra tokens (the skill's own size plus behaviour changes), time per trial and cost, from the Workbench's speed and cost lines or the platform's usage logs.
- **Interference:** conflicts with user instructions, other skills or safety rules seen in transcripts.

### 6. Decide and report

Use a scoped verdict: **beneficial** for the tested workload, **beneficial with constraints**, **neutral** within measurement limits, **harmful** for the tested workload, **platform-specific**, or **inconclusive**. Report:

- skill name and revision; agent platform, version and model
- trigger test results (activation and false activation)
- target and control outcomes with intervals, reliability and the comparison's inference (confirmatory or exploratory)
- adherence observations, overhead and interference
- what was not tested (other platforms, models, task families)

Never call a skill simply "good". If the result is neutral, say so: removing an unhelpful skill is a valid outcome.

## Iterating on a skill

1. Change one thing at a time (description, a rule, a reference), keeping a revision number in `metadata.version`.
2. Rerun trigger tests after any description change.
3. Rerun the effect test old versus new on holdout tasks before shipping a revision.
4. Keep the suite files with the skill, so the next revision can be compared the same way.

## Common failure modes

| Failure | Better |
|---|---|
| Testing only prompts copied from the description | Users' words, plus near misses |
| Assuming a copied file means the skill loaded | Record loading evidence, or "unknown" |
| Reporting results on tasks the skill was tuned on | Holdout tasks only |
| No control tasks | Include tasks where the skill should not matter |
| One run per task | Several repeats; check reliability |
| "Pass rate went up" with the skill ignored in transcripts | Check adherence before crediting the skill |
| Ignoring the token cost of a long skill | Report overhead next to the benefit |
| A general claim from one model and one platform | Scope the verdict to what was tested |

## Verification

- [ ] The hypothesis and the drop-or-change criterion were written before running
- [ ] Trigger tests covered should-activate, should-not-activate and near-miss requests, with loading evidence or "unknown"
- [ ] Baseline and treatment differ only in the skill (or revision)
- [ ] Target, control and holdout tasks are defined; reported results come from holdout tasks
- [ ] Each task ran several times; intervals and reliability are reported
- [ ] Billed model calls were agreed with the user before running
- [ ] Adherence, overhead and interference were checked
- [ ] The verdict is scoped to the platform, model and tasks tested
