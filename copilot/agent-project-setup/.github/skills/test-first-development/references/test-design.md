# Test Design

## Test doubles: when each fits

| Double | What it is | Use when |
|---|---|---|
| **Real implementation** | The actual code, set up cheaply | It is fast and deterministic (pure logic, in-memory or temporary database, temp directory). Prefer this. |
| **Fake** | A working, simplified version (in-memory store, local stub server) | The real thing is slow, external or costly, but behaviour matters |
| **Stub** | Returns canned answers | You need a dependency to answer a certain way (an error, an edge value) |
| **Spy or mock** | Records calls so you can assert on them | The interaction itself is the behaviour (an email is sent once, a retry happens) |

Rules of thumb:

- Never mock the code under test.
- Mock at boundaries you own (your own client interface), not deep inside third-party libraries.
- If a test needs many mocks, the design is probably too coupled; consider extracting pure logic.
- A local fake server is better than a mocked HTTP library for testing real request handling.

## Determinism

| Source of flakiness | Fix |
|---|---|
| Time (`now()`, timeouts, dates) | Inject a clock, or freeze time in the test framework |
| Randomness | Fixed seed, or inject the random source |
| Sleeps waiting for async work | Await the result, wait on an event, or poll with a deadline |
| Test order and shared state | Fresh fixtures per test; no globals mutated across tests |
| Ports and files | Bind to port 0 and read the assigned port; use unique temporary directories |
| Network | Local fakes only; never the real internet in unit or integration tests |
| Parallel runs | No shared paths, environment variables or databases between tests |

A flaky test must be fixed or quarantined with an issue and an owner. Never retry it into passing.

## Characterization tests

Use them before changing code that has no tests:

1. Choose representative inputs, including edge cases (empty, huge, unicode, negative, malformed).
2. Record current outputs as expected values.
3. Mark any output that looks like a bug and ask the user before preserving it.
4. Change the code; any changed output is either intended (update the test deliberately and say so) or a regression.

Snapshot or golden-file tests are a form of characterization. Review snapshot diffs like code; never accept them in bulk without reading.

## Naming

Name tests as behaviours, so a failure reads like a broken promise:

- `empty_input_yields_no_records`
- `test_trailing_comma_is_ignored`
- `it("rejects expired tokens")`

Avoid `test1`, `test_parse` or names that describe implementation (`calls_helper_twice`).

## Coverage

Coverage shows which code no test executes; it does not show that behaviour is checked. Use it to find untested paths, not as a target to hit with assertion-free tests.
