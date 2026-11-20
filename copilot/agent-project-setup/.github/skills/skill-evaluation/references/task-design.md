# Designing Effect-Test Tasks

## Three kinds of task

| Kind | Purpose | Example for `test-first-development` |
|---|---|---|
| **Target** | The skill should change the outcome | "Fix: totals crash on a trailing comma" in a small repo; check that a regression test exists and failed before the fix |
| **Control** | Same domain, the skill should not matter | "Update the version string in `Cargo.toml`"; checks that nothing else changed |
| **Holdout** | Target-like tasks never used while writing or tuning the skill | Different bugs in a different repo |

Keep development tasks (used while writing the skill) separate from holdout tasks, and report only holdout results.

## Turning a skill into criteria

Start from the skill's own **Verification** checklist. Each item that is observable in outputs becomes a criterion:

| Skill checklist item | Criterion | Check |
|---|---|---|
| "A regression test failed before the fix" | The new test fails on the original code | Exact: run the test against the original commit in the task's verifier |
| "No existing test was weakened" | Existing tests unchanged | Exact: diff of test files |
| "Asked about purpose before coding" | First reply asks why before proposing code | Model-judge rubric on the transcript |
| "Brief separates user decisions from proposals" | Brief has separate sections | Model-judge rubric, or `file_contains` on a structured output |

Prefer exact checks. Use model-judge rubrics only for qualities that exact checks cannot see, write the rubric so a careful reviewer would agree with it, and get consent before sending outputs to a judge.

## Task inputs

- Small, self-contained repositories or files as task inputs, so runs are fast and repeatable
- The request phrased as a user would phrase it, through an environment variable or an input file
- No answers or hints in the inputs; expected results live only in the verifier
- No secrets; credentials come from the runner's grant mechanism

## How many tasks and repeats

- Ten or more distinct holdout tasks for the Workbench to compute intervals and reliability (fewer gives descriptive results only)
- Three or more repeats per task, because agent behaviour varies between runs
- Control tasks in proportion to how widely the skill activates: a broadly triggering skill needs more control coverage

## Avoiding teaching to the test

- Write criteria from the skill's purpose, not from its exact wording
- Do not let the skill mention task-specific details from the evaluation
- If a criterion can be satisfied by a phrase ("I will now ask a question"), make it require the behaviour instead
