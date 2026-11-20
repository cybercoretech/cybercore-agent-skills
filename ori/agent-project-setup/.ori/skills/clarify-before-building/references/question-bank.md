# Question Bank

Strong opening questions by request type. Use them as starting points, never as a script: skip anything the repository or conversation already answers, and adapt the wording to the user's project. Each entry notes what the answer changes.

## New feature

- "What should someone be able to do once this exists that they can't today?" Changes the core behaviour and the acceptance test.
- "Who uses it: you, your team, or the public?" Changes polish, permissions, docs and error handling.
- "What would make this a failure even if it technically works?" Surfaces anti-goals: too slow, too noisy, breaks a workflow.
- "Is there something you've seen elsewhere that does this well, or badly?" Prior art shortcuts many decisions.

## Bug report

- "What did you expect, and what happened instead?" Defines the fix and the regression test.
- "Does it happen every time, or only sometimes? Since when?" Separates logic bugs from races, data or environment changes.
- "Can you share the exact error, input or steps?" Only ask if logs and code didn't already show it.
- "Is a workaround in place that the fix must not break?" Protects users already relying on the current behaviour.

## Refactor or cleanup

- "What's painful about this code today?" Decides what the refactor must improve (readability, speed, testability, coupling).
- "Must the public interface stay the same?" Decides whether callers change.
- "How much risk is acceptable: one big change or small safe steps?" Decides the delivery shape.

## UI or visual change

- "What should someone notice or do first on this screen?" Drives hierarchy and layout.
- "Is there a design, brand or existing screen to match?" Avoids inventing a new style.
- "Which devices and themes matter (phone, desktop, dark mode)?" Changes the layout and testing.
- Offer a quick text sketch or mockup when the look itself is the user's to decide.

## API or interface

- "Who calls this, and from where?" Decides auth, versioning, error format, rate limits.
- "Is this public and versioned, or internal and free to change?" Decides compatibility rules.
- "What should happen on invalid input or partial failure?" Defines the error contract.

## Data or schema change

- "Is there production data this touches? How much?" Decides migration strategy, downtime and rollback.
- "Can old and new versions run side by side during the rollout?" Decides expand/contract versus one-step change.
- "What must never be lost or changed?" Sets the hard constraint. Irreversible steps need explicit confirmation.

## Performance

- "Slow for whom, doing what, and how slow is it now?" Turns "make it faster" into a measurable target.
- "What target would count as fixed?" Sets the acceptance criterion.
- "Is there a trade-off you won't accept (memory, cost, accuracy)?" Bounds the solution space.

## Automation or scripts

- "How often does this run, and who starts it?" Decides scheduling, idempotence and logging.
- "What should happen when it fails halfway?" Decides retries, rollback and alerts.
- "Does it touch anything shared or irreversible?" Decides dry-run modes and confirmation gates.

## When the purpose is unknown

Ask one open question in the user's terms, with no options attached, and say what the answer would change:

> "If it's mostly for people deciding whether to visit, I'd lead with opening hours and today's menu; taking orders is a different site. What do you want someone to do when they land on it?"
