---
name: root-cause-debugging
description: 'A strict debugging protocol: reproduce the bug with a failing test first, isolate one variable at a time until the root cause is proven, fix only that cause, and prove the fix (the test fails on the old code and passes on the new) before touching anything else. Use for any bug report, failing test, crash, regression, wrong output, flaky test or "it stopped working", and whenever you are tempted to try a quick fix to see if it helps. Not for adding tests to new features (use test-first-development) or open-ended investigations without a reproducible bug (use deep-investigation).'
metadata:
  version: '1'
---
# Root-Cause Debugging Protocol

Bugs get fixed once and stay fixed when the cause is proven, not guessed. This protocol makes
the bug reproducible as a failing test, narrows it down by changing one thing at a time,
fixes the root cause with a minimal change, and proves mechanically that the test fails
without the fix and passes with it.

> [!CAUTION]
> **Iron law: no fix without a failing reproduction, and no "fixed" without proof.**
> Don't change code to "see if it helps". Don't make several changes at once. Don't silence
> the symptom (catch-all exceptions, retries, sleeps, skipped or loosened tests) and call it
> a fix. Don't touch unrelated code while debugging, even if it looks wrong; write it down as
> a follow-up. If you can't reproduce the bug, you are still in the investigation step:
> gather evidence, don't guess.

---

## Steps

### 1. Pin down the bug report

Write down, before anything else:
- **Expected vs actual:** the exact wrong output, error message and stack trace (copied, not
  paraphrased).
- **Trigger:** inputs, steps, data, user, platform, configuration.
- **Environment:** versions (runtime, dependencies, OS), build mode, feature flags.
- **History:** when it last worked and what changed since (deploys, dependency bumps,
  config, data). `git log --since=<date>` and the lockfile diff are evidence.
- **Scope of damage:** one user or all, always or sometimes (sometimes = timing, state or
  data dependent).

**Completion criterion:** someone else could try to reproduce it from your notes alone.

---

### 2. Reproduce it

1. Reproduce **manually** first, following the trigger exactly.
2. Shrink it: remove steps, data and configuration until the smallest reproduction remains
   (halve the input, drop fields, use defaults).
3. **Can't reproduce?** Don't fix anything yet. Compare environments (versions, config,
   data, time zone, locale, concurrency), add temporary logging around the suspected path,
   and collect evidence from where it does happen (logs, core dumps, request IDs). Ask the
   owner for missing details.
4. **Intermittent?** Run it in a loop (`for i in $(seq 50); do <cmd> || break; done`), under
   load, with fixed random seeds, and with timing changes. A failure rate is evidence.

**Completion criterion:** a reproduction that fails on demand (or a measured failure rate
for intermittent bugs).

---

### 3. Write the failing regression test FIRST

- Use the **smallest test level** that captures the bug: unit, then integration, then
  end-to-end.
- Name it after the behaviour, not the ticket: `test_average_of_empty_list_returns_zero`.
- Assert the **correct** behaviour (what should happen), not the current wrong one.
- **Run it and watch it fail for the right reason:** the failure output must show the bug's
  symptom (the wrong value, the same exception), not an import error, a typo or a missing
  fixture.

```bash
python3 -m unittest tests.test_stats -q        # or: cargo test name / npx vitest run file / go test -run Name
# expect: the symptom, e.g. ZeroDivisionError or "AssertionError: None != 0"
```

No automated test is possible (a hardware, visual or third-party outage)? Write the closest
executable reproduction script, document the manual steps exactly, and say so in the report.

**Completion criterion:** a committed-quality test that fails, with output showing the
bug's symptom.

---

### 4. Isolate: one variable at a time

Keep a hypothesis log:

```
H1: average() divides by len(xs) without guarding empty input
    prediction: average([]) raises ZeroDivisionError; average([1]) works
    test: run both → result: confirmed / refuted
```

Techniques, in order of cost:

| Technique | Use when | How |
|---|---|---|
| **Read the stack trace and the code path** | There's an error | Start at the frame in your code nearest the failure; read the inputs it received |
| **Minimize the input** | Large or complex input | Halve it repeatedly while it still fails (delta debugging) |
| **Binary search in history** | It worked at some commit | `git bisect` with the regression test (below) |
| **Binary search in code** | A long pipeline | Check intermediate values at the midpoint; recurse into the half that's wrong |
| **Diff environments** | Works here, fails there | Compare versions, config, env vars, data, OS, locale, time zone; change **one** to match, re-test |
| **Instrument** | Unclear state | Temporary logging or a debugger breakpoint at the suspected line; remove it after |

**`git bisect` with a test that doesn't exist in old commits:** keep the test outside the
tree so every checkout can run it. Bisect moves HEAD and needs a clean tree; stash with the
owner's OK and always finish with `git bisect reset`.

```bash
cp tests/test_stats.py ../regress_test.py          # any path OUTSIDE the repo
git bisect start <bad-commit> <good-commit>
# copy under a name that never existed in history, run, delete: every checkout stays clean
git bisect run sh -c 'cp ../regress_test.py tests/test_regress_tmp.py && python3 -m unittest tests.test_regress_tmp -q; r=$?; rm -f tests/test_regress_tmp.py; exit $r'
git bisect reset
```

Tested: on a seven-commit history, this found the commit that removed the empty-list guard
in three steps and left the tree clean.

Rules: change **one** thing per experiment, predict the result before running it, and
record the outcome. If an experiment changes nothing, revert it before the next one.

**Completion criterion:** a hypothesis confirmed by experiment that explains **every**
observed symptom.

---

### 5. Name the root cause, not the symptom

Ask "why?" until the answer is a decision in the code, data or configuration that you can
change:

```
Symptom:    the dashboard shows "NaN" for new teams
Why?        average() raised, and the caller rendered the fallback NaN
Why?        average() divides by len([]) for teams with no data
Root cause: average() has no defined result for empty input; callers assume it always returns a number
```

Then check for the **same defect pattern elsewhere** (`grep` for similar code), and list the
matches as follow-ups. Fix them now only if they're in the requested scope.

**Completion criterion:** a one-paragraph root-cause statement that the evidence supports.

---

### 6. Fix the cause minimally

- Change the smallest amount of code that removes the root cause. Follow the existing style,
  and add no new abstractions or dependencies.
- Fix at the cause, not at every symptom site, unless the contract itself is the problem
  (then fix the contract and its callers deliberately).
- **Not a fix:** wrapping in `try/except: pass`, adding retries or sleeps, widening a timeout,
  skipping or deleting the test, changing the test to accept the wrong behaviour. If a
  temporary mitigation is needed in production, label it clearly as a mitigation, keep the
  bug open, and still find the cause.
- Remove all temporary logging and breakpoints.

**Completion criterion:** the diff contains only the fix and the regression test, with no
debug leftovers.

---

### 7. Prove the fix mechanically

```bash
python3 <this-skill-dir>/scripts/prove_fix.py --test "python3 -m unittest tests.test_stats -q" \
    --expect-fail "ZeroDivisionError" --repeat 3
```

`prove_fix.py` creates a **temporary git worktree** at the base commit (your working tree
is never touched), copies the changed test files into it, runs the test command there (it
must **fail** every time, with `--expect-fail` in the output) and in your working tree (it
must **pass** every time), then removes the worktree. Real verdicts from testing:

| Situation | Verdict |
|---|---|
| Test + correct fix | `PROVEN: the regression test fails without the fix and passes with it.` (exit 0) |
| Test only, no code change | `not proven: there is no code change besides tests, so nothing was fixed` |
| Test passes on old code | `NOT PROVEN: the test PASSES on the old code: it does not reproduce the bug` |
| Fix doesn't work | `NOT PROVEN: the test FAILS on the fixed code: the fix does not work` |
| Old code fails for another reason | `NOT PROVEN: old code failed for a DIFFERENT reason … (missing deps? use --setup or --link)` |
| Flaky | `NOT PROVEN: FLAKY on fixed code: passed 3/8 runs` |

Options:
- `--base REF`: compare against another commit (for example the release where the bug appeared).
- `--tests GLOBS`: which changed files count as tests.
- `--setup "npm ci"`: prepare the old-code worktree.
- `--link node_modules,.venv`: symlink dependency folders into it instead of reinstalling.
- `--repeat N`: runs per side (raise it for intermittent bugs).
- `--keep`: keep the worktree for inspection.

Then run the **whole relevant test suite**, not just the new test, to catch regressions the
fix introduced, plus the original manual reproduction from step 2.

**Completion criterion:** `prove_fix.py` exits 0, the full suite passes, and the manual
reproduction no longer shows the bug.

---

### 8. Report

```
Bug:         <symptom, one line>
Root cause:  <the paragraph from step 5>
Evidence:    <the experiment(s) that confirmed it; bisect result if used>
Fix:         <files and what changed>
Proof:       prove_fix.py → PROVEN (old 3/3 failed with <symptom>, fixed 3/3 passed); full suite: N passed
Follow-ups:  <same pattern found in X; flaky test Y noticed; not changed>
```

**Completion criterion:** the report lets a reviewer verify the claim without re-debugging.

---

## Excuses, and the answer

| Excuse | Reality |
|---|---|
| "The fix is obvious, a test is overkill" | Obvious fixes are wrong often enough. The test also stops the bug coming back. |
| "Let me just try this change and see" | Unstructured changes hide the cause and pile up side effects. Form a hypothesis, predict, test. |
| "I'll change these three things at once to save time" | When it works you won't know which change mattered, and the other two are now unexplained diffs. |
| "It passes now" (after an unrelated change) | Then the cause isn't understood. Intermittent bugs "pass" by chance. Prove it. |
| "Adding a retry/sleep fixed it" | It hid a race or ordering bug. Find the race. |
| "The test is wrong, I'll update it to match" | Only if the test asserts behaviour that is truly not required, and say so explicitly. Never to make a bug pass. |
| "While debugging I fixed some other things" | Separate them: they muddy the proof and the review. List them as follow-ups. |
| "Can't reproduce, but this change should fix it" | Unverifiable. Keep investigating, or ship clearly labelled diagnostics, not a guess. |

## Red flags: stop and go back a step

- You're editing code before a failing test exists.
- The test failed with an import error, a typo or a missing fixture, and you moved on.
- More than one hypothesis is being tested by the current change.
- The diff contains files unrelated to the root cause.
- The fix contains `except: pass`, `catch {}`, `sleep`, `retry`, `@skip` or a loosened assertion.
- You can't state the root cause in one paragraph.
- `prove_fix.py` says anything other than `PROVEN`.

---

## Reference

### Common root-cause families (check these early)

| Family | Typical sign |
|---|---|
| Unhandled edge input | Empty, null, zero, negative, huge, Unicode, time zone, leap day |
| State and ordering | Works alone, fails in a suite; first run differs from second |
| Concurrency | Intermittent; changes with load or logging |
| Environment drift | Works locally, fails in CI or production; dependency or config versions differ |
| Contract mismatch | Caller and callee disagree on units, encoding, nullability or error handling |
| Stale caches and builds | Clean build fixes it; generated files out of date |
| Recent change | `git bisect` finds it in minutes |

### Script exit codes

`0` proven · `1` not proven (no reproduction, fix fails, wrong failure reason, flaky, or
no code change) · `2` bad usage, no changed test files, or `--setup` failed.
