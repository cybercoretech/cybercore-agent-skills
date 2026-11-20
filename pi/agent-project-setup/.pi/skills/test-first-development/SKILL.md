---
name: test-first-development
description: Write the failing test first, watch it fail for the right reason, make it pass with the smallest change, then refactor with the tests green (red, green, refactor). Use when implementing a feature or behaviour change, when fixing a bug (reproduce it with a failing regression test before touching the code), when changing code that has no tests (pin current behaviour with characterization tests first), or when the user asks for TDD or test-driven work. Works in any language; covers choosing the test level, deterministic tests, and reporting test evidence honestly.
metadata:
  version: "1"
---

# Test-First Development

You change code by first stating, as an executable test, what it should do. A test you have watched fail proves two things a test written afterwards cannot: that it checks the behaviour you meant, and that your change is what made it pass.

## Scope

- The red, green, refactor cycle for features and behaviour changes
- Reproducing bugs as failing regression tests before fixing them
- Characterization tests for untested code before changing it
- Choosing the lowest test level that proves the behaviour
- Keeping tests deterministic, fast and independent
- Reporting test evidence honestly

Test standards per stack (required CI checks, tooling, test data rules) live in `testing-qa`; this skill is the workflow.

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**

- Deleting, skipping, weakening or rewriting an existing test so that new code passes. If a test looks wrong, say why and ask.
- Changing an assertion to match the current output when you have not confirmed the current output is correct
- Tests that call real external services, production systems, paid APIs, real email or notifications, or real user data
- Disabling, muting or bypassing CI checks or required test jobs
- Claiming tests pass without having run them in this session

## When to work test-first

| Situation | Approach |
|---|---|
| New behaviour, feature or API | Full cycle, one behaviour at a time |
| Bug fix | Reproduce with a failing test first, then fix |
| Change to untested code | Characterization tests first, then the cycle |
| Exploratory spike to learn whether something works | Spike without tests, throw it away, then rebuild test-first |
| Pure visual tweak, generated code, config value | Test-first adds little; verify another way and say how |
| Emergency mitigation in production | Mitigate first, then add the regression test before closing |

When you skip test-first, say so and say how you verified the change instead.

## The cycle

1. **Pick one behaviour.** The smallest slice that is observable from the outside: one input, one rule, one edge case. Write it down as a sentence: "parsing an empty file returns no records".
2. **Red: write one test for it.** Name the test after the behaviour. Use the public interface, not internals.
3. **Run it and watch it fail for the right reason.** The failure must be the assertion about the new behaviour, not a typo, missing import or compile error unrelated to the behaviour. If it passes already, either the behaviour exists or the test checks the wrong thing: find out which before continuing.
4. **Green: make it pass with the smallest reasonable change.** Do not build the next three behaviours yet. Hard-coding is acceptable only as a step: the next test should force the real logic.
5. **Run the relevant suite,** not just the new test, so you know nothing else broke.
6. **Refactor with the tests green.** Remove duplication, improve names and structure. Run the tests after each refactoring step. Refactoring changes structure, never behaviour.
7. **Repeat** with the next behaviour. Commit at green points, so every commit builds and passes.

Keep the loop short: minutes, not hours. If a step grows large, the behaviour you picked was too big; split it.

## Fixing a bug

1. **Reproduce it** from the report, logs or user steps. If you cannot reproduce it, stop and say what you tried (see `deep-investigation`).
2. **Write a test that fails because of the bug,** at the lowest level that shows it. Its failure message should describe the bug.
3. **Watch it fail.** This proves the test catches the bug.
4. **Fix the cause,** not the symptom.
5. **Watch it pass,** run the related suite, and keep the test permanently as a regression test.

## Changing untested code

Before changing behaviour in code without tests, pin what it does today:

1. Write **characterization tests** that record current outputs for representative inputs, including odd ones.
2. They pass by construction. Treat them as a safety net, not a specification: if current behaviour is a bug, note it and ask before preserving or changing it.
3. Now refactor or change the code with the net in place, using the normal cycle for new behaviour.

## Choosing the test level

Prefer the **lowest level that proves the behaviour**:

- **Unit** for pure logic, parsing, calculations and rules. Fast, precise failures.
- **Integration** where the behaviour lives at a boundary: database queries, file formats, HTTP handlers, process execution, serialization.
- **End-to-end** for a few critical user journeys only. Slow and brittle when overused.

Use real implementations where they are fast and deterministic (an in-memory or temporary database, temporary directories). Replace only what is slow, nondeterministic, external or dangerous (network, clock, randomness, paid services). `references/test-design.md` covers test doubles and when each fits.

## What makes a good test

- **Tests behaviour, not implementation.** It survives a refactor that keeps behaviour the same.
- **One reason to fail.** A failure points at one behaviour.
- **Readable as a specification.** Name it as a sentence; arrange, act, assert.
- **Deterministic.** No sleeps for timing, no wall-clock dependence, fixed random seeds, no order dependence between tests, no shared mutable state.
- **Independent.** Each test sets up what it needs, in temporary locations it cleans up.
- **Fast.** The suite you run every cycle should finish in seconds.

A test that is flaky is a bug. Fix the cause (usually timing, ordering or shared state); never retry it into passing. See `references/test-design.md`.

## Reporting evidence

- Show the failing run (red) and the passing run (green) for the new test, or summarise them with the exact command and result.
- Report the full relevant suite result, including skips, and say why anything was skipped.
- If you could not run tests (missing toolchain, no permission), say so plainly; do not imply they passed.

`references/cycle-examples.md` walks the cycle in Rust, Python and TypeScript; `references/runners.md` lists how to run a single test and the suite per ecosystem.

## Common failure modes

| Failure | Better |
|---|---|
| Writing the code, then a test that mirrors it | Test first, from the behaviour |
| Test never seen failing | Run it red before writing the code |
| Several behaviours in one test | One behaviour per test |
| Mocking everything, including the code under test | Use real fast implementations; fake only the slow or external |
| Editing a failing test to pass | Decide whether the test or the code is wrong; ask if unsure |
| `sleep` to wait for async work | Await the event, poll with a deadline, or inject a clock |
| Huge green step that implements a whole feature | Split into smaller behaviours |
| Refactoring while red | Get to green first, then refactor |

## Verification

- [ ] Each new behaviour has a test that was run and seen failing for the right reason before the implementation
- [ ] Each bug fix has a regression test that failed before the fix and passes after
- [ ] No existing test was deleted, skipped or weakened without the user's agreement
- [ ] The relevant suite passes, and skips are explained
- [ ] Tests are deterministic and do not touch external services, production or real user data
- [ ] Refactoring happened only at green, and the suite is still green
- [ ] Test evidence reported matches commands actually run in this session
