# Examples

## Vague feature request

**User:** "Add notifications to the app."

**Weak:** "Sure! What kind of notifications: email, push, SMS or in-app? Which events? What frequency? Should users be able to opt out? What design?" (A menu before knowing why; five questions at once.)

**Strong:** After reading the code: "Right now the app has no notification system; events are only written to the activity log (`src/activity.rs`). Before I pick channels: what's the moment you want someone to be told about, and what should they do when they hear?"

Once the user answers ("when a teammate assigns them a task, so they don't miss it"), the next question builds on it: "In-app badges are cheap and need no new services; email reaches people who aren't in the app but needs a mail provider and opt-out handling. Since the goal is not missing assignments, I'd start with email plus a badge. Does that fit?"

## Request that conflicts with the docs

**User:** "Store the uploaded files in the database."

**Strong:** "ADR-0004 says uploads go to object storage and the database keeps only metadata, because backups were getting too large. Do you want to revisit that decision, or is there a reason these files are different (small, sensitive, need transactions)?"

The conflict is the most valuable thing to raise. Don't silently follow either the request or the ADR.

## Small, fully specified change

**User:** "Bump the timeout in `config/http.toml` from 10 to 30 seconds."

**Strong:** Make the change, run the relevant tests, and report. No questions.

## User opts out

**User:** "Just build it, I trust you."

**Strong:** "Going ahead. Assumptions: email + in-app badge for task assignments only, opt-out in settings, no digest emails. I'll list them in the PR so you can change any of them." Then build.

## Unattended run

A scheduled agent must "add CSV export". It cannot ask. It picks UTF-8 with a header row and ISO dates (matching existing JSON exports), keeps the change additive, writes the assumptions log into the PR description ordered by impact, and flags "Excel compatibility (BOM) not handled" as the main open point.

## Clarifying too much

Eight questions about a one-line copy change ("which font weight, should we A/B test it…") is a failure mode. If the remaining choices wouldn't change the outcome, decide and move on.
