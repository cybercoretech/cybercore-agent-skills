# Brief Template and Assumptions Log

## Short brief (most changes)

```markdown
**What:** one or two sentences in the user's terms
**Why:** the purpose, as they stated it
**In scope:** bullets
**Out of scope:** bullets
**Done when:** testable acceptance criteria
**My calls:** decisions I made and why (override any of them)
**Open:** anything still unresolved
```

## Full brief (large or multi-part work)

```markdown
# <Title>

## Intent
What this is and why it matters now. Quote the user where possible.

## Users and context
Who uses it, where, and how often.

## Goals
- Outcomes that define success

## Non-goals
- Things deliberately left out

## Anti-goals
- Results that would count as failure even if the feature works

## Constraints
- Platforms, compatibility, performance, security, deadlines, things that must not change

## Acceptance criteria
- [ ] Concrete, testable checks

## Decided by the user
- Each decision and its date or message

## My calls
- Each decision I made, with the reason, open to override

## Open questions
1. Most important first, with my recommended answer

## Next step
"Confirm this brief and I'll write the implementation plan."
```

Keep the user's decisions and your proposals in separate sections. A brief that blurs them invites the user to approve things they never chose.

## Assumptions log (when you cannot ask)

For scheduled, autonomous or unattended runs, keep this log and put it where the user will see it: the PR description, the handoff file, or the final report.

```markdown
## Assumptions (please review)

| # | Assumption | Why I chose it | Impact if wrong | Easy to reverse? |
|---|---|---|---|---|
| 1 | Exports use UTC timestamps | Existing logs use UTC (`src/log.rs`) | Times off by the local offset | Yes, one function |
| 2 | Keep the v1 endpoint working | Two callers in `clients/` still use it | Breaking change for those clients | Yes |
```

Rules for unattended runs:

- Prefer reversible choices; avoid anything destructive.
- Order the log by impact, so the riskiest assumption is read first.
- Never invent requirements to fill a gap you could have recorded as open.
