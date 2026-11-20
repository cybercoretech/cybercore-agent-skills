# Trigger Tests

Trigger tests check whether the agent platform selects the skill for the right requests. They are cheap and should run before any effect test.

## Building the prompt set

Aim for roughly 10 to 20 prompts per category for a first pass.

| Category | Write | Example for `clarify-before-building` |
|---|---|---|
| Should activate | Realistic requests in users' words | "add notifications to the app", "can you make the dashboard better" |
| Should not activate | Adjacent work where the skill is noise | "rename `foo` to `bar` in `src/x.rs`", "fix the typo on line 12" |
| Near miss | Shares vocabulary, needs something else | "clarify this error message for users" (copy editing, not requirements) |
| Context-dependent | Activation depends on repository or conversation state | "build the export" after a full spec was already agreed |

Rules:

- Do not copy phrases from the skill's description into the prompts; that tests string matching, not real usage.
- Include short and long, formal and casual phrasings.
- Keep the set fixed once you start comparing description revisions.

## Recording evidence of loading

| Evidence | Strength |
|---|---|
| The platform logs or shows a skill invocation for that prompt | Strong |
| The transcript shows the skill's content in the agent's context | Strong |
| The agent writes a marker you asked for in the skill ("SKILL: name") to its output | Medium; the marker instruction itself changes behaviour slightly |
| Behaviour that matches the skill | Weak; other instructions may cause it |
| The skill file exists in the right folder | Availability only, not loading |

If no strong or medium evidence is possible, record the result as unknown.

## Scoring

Treat "should activate" as the positive class:

| | Activated | Did not activate |
|---|---|---|
| Should activate | true positive | miss (false negative) |
| Should not activate or near miss | false activation | true negative |

Report the miss rate and the false-activation rate with their denominators. Judge context-dependent cases individually and report them separately.

## Fixing activation

- **Misses:** the description lacks the trigger situations users actually describe. Add the situations ("when a request is vague or new"), not more synonyms.
- **False activations:** the description is too broad, or shares words with adjacent work. Add an explicit "skip when" sentence and narrow the scope.
- After each description change, rerun the whole fixed set, not only the failing prompts.

## With the Workbench

Trigger tests fit a suite with one task per prompt. The agent writes its skill-invocation log (or transcript) to `/workspace/output`, and a `file_contains` check per task asserts the expected activation. For should-not-activate tasks, have the agent write its log to a per-skill file (for example `skills-used/clarify-before-building`) and check it with `file_absent`. `workbench failures` then lists exactly which prompts misfired.
