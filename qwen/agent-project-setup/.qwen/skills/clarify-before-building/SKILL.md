---
name: clarify-before-building
description: Find out what the user actually wants before writing code. Reads the repository and its docs first, asks only the questions whose answers would change what gets built (one or a few at a time, each with a recommended answer), plays the requirements back as a short brief, and gets confirmation before implementing. Use when a request is new, vague, underspecified, or large; when it conflicts with existing docs or code; before features, refactors, migrations, or UI work; or when the user says "build", "add", "make", or "change" something without saying why or what done looks like. Skip it for small, fully specified changes and when the user says to just proceed.
metadata:
  version: "1"
---

# Clarify Before Building

You make sure the thing you are about to build is the thing the user wants. Agents are fast at building and weak at noticing that their picture of the request is thinner than it feels. A few minutes of sharp questions prevents hours of confident work in the wrong direction.

## Scope

- Deciding whether a request needs clarification at all, and how much
- Reading the repository, docs, issues and earlier conversation before asking anything
- Asking high-value questions, each with a recommended answer
- Playing requirements back as a short, confirmable brief
- Recording assumptions when the user cannot or will not answer

Out of scope: writing the full design or task plan (hand off to `engineering-planning`), and investigating unknown failures (`deep-investigation`).

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**

- Starting irreversible or destructive work (deleting data, migrating production schemas, force-pushing, rewriting history, mass file changes) on an assumption the user has not confirmed
- Building something that conflicts with a stated safety, security, or repository policy: name the conflict and ask
- Asking the user to paste secrets, tokens, or private keys as part of "requirements": point to the secret-handling path instead (`security-guidelines`)
- Presenting your own guesses as things the user said: every assumption in a brief is labelled as yours

## Decide how much to clarify

Match the effort to what is unknown, not to how big the request sounds.

| Situation | What to do |
|---|---|
| Small and fully specified ("rename `foo` to `bar` in `src/x.rs`") | No questions. Do it and say what you did. |
| Clear goal, one open decision that changes the result | Ask that one question, with your recommendation. |
| New feature, vague request, or several open decisions | Short interview (below), then a brief to confirm. |
| Large project or several independent projects | Say so, agree on an order, and clarify the first one only. |
| The user says "just do it", "your call", or "dive in" | Stop asking. State your significant assumptions in one or two lines and proceed. |
| You cannot reach the user (scheduled run, autonomous task) | Do not stall. Choose reversible defaults, record every assumption where the user will see it (PR description, handoff file, final report), and flag the ones that most affect the result. |

## Look before you ask

Never ask what the repository or conversation already answers. Before the first question:

1. Read what the user pointed at: files, issues, specs, earlier messages, handoff notes.
2. Read the code and docs the change would touch: README, ADRs, contributing guides, existing patterns for the same kind of feature.
3. Note what you found that bears on the request: how the relevant part works today, what the change would touch, constraints (frameworks, conventions, tests, CI), and anything that contradicts the request.

If you find a conflict, a cheaper path, or a constraint the user probably has not considered, lead with it. That is often the most valuable thing you can say.

## Ask well

- **Only ask questions whose answers change what gets built.** "Which colour?" matters for a logo, not for a database migration.
- **Ask about the why first.** If the purpose is unknown, ask one open question about it, in the user's own terms, with no options attached. Knowing why lets you make the many small decisions nobody mentions the way the user would.
- **Then one decision at a time, biggest first.** In a live conversation, ask one question per message. When answers are slow (async review, issue threads), batch at most three, numbered, most important first.
- **Recommend an answer.** For a decision with nameable options, sketch each option concretely with its trade-off and say which you would pick and why. A proposal the user can correct beats an open-ended question.
- **Build on the last answer.** Use what the user just told you, or what you found in the code, to ask about a consequence they may have missed ("Signups close Friday and two members joined this week. Do late joiners get a vote?").
- **Say why you are asking** when it is not obvious: what the answer would change.
- **Make your own calls on process.** Where files go, how to structure the work, which tests to run: decide, and say so. Do not ask permission for routine engineering judgment.
- **Use plain words.** Match the user's vocabulary; no methodology jargon.

What to cover, roughly in this order (skip anything already known):

1. **Purpose:** why this, why now, who it is for, what success looks like.
2. **Scope:** what is in, what is explicitly out, and anything that would make it a failure even if it technically works.
3. **Constraints:** platforms, compatibility, performance, security, deadlines, things that must not change.
4. **Acceptance:** how the user will judge it done; turn this into testable criteria.
5. **Details the user cares about:** look, wording, edge cases, defaults.

`references/question-bank.md` has strong opening questions for common request types (feature, bug, refactor, UI, API, data change, performance, automation).

## Know when to stop

Stop asking when either is true:

- Every remaining open point is something a competent engineer could decide without changing what gets built. Decide those yourself and list them as your calls.
- The user signals they are done answering. Proceed on stated assumptions.

Three good questions usually beat ten. If you are past five questions on a modest change, you are interviewing, not clarifying: summarise and propose.

## Play it back

Before building, give the user a brief they can confirm in one reply. Keep it short; a modest change fits in ten lines.

```markdown
**What:** one or two sentences in the user's terms
**Why:** the purpose, as they stated it
**In scope:** bullets
**Out of scope:** bullets (include anything they ruled out)
**Done when:** testable acceptance criteria
**My calls:** decisions I made and why (they can override)
**Open:** anything still unresolved (ideally nothing)
```

Mark clearly which points came from the user and which are your proposals. End by asking what is wrong or missing. Do not start implementing until the user confirms, unless they told you to proceed without confirmation. A confirmed brief is the input to `engineering-planning` for larger work.

`references/brief-template.md` has a fuller template for large work and an assumptions log for runs where you cannot ask.

## Common failure modes

| Failure | Better |
|---|---|
| Asking what the README already says | Read first; cite the file instead |
| A menu of options before knowing why | One open question about purpose, then options |
| Ten questions in one message | One at a time, or at most three when async |
| Asking about routine engineering choices | Decide, and list them as your calls |
| Silently guessing on a decision that changes the result | Ask, or label the assumption in the brief |
| Re-asking something the user already decided | Treat their decisions as settled |
| Treating "sounds good" to an idea as approval of a brief they have not seen | Show the brief; approval covers only what was shown |
| Clarifying forever | Stop when remaining choices would not change the outcome |

See `references/examples.md` for good and bad exchanges.

## Verification

Before you start building:

- [ ] You read the referenced files and relevant code and docs, and did not ask anything they answer
- [ ] You know why the user wants this, in their words, or recorded that they declined to say
- [ ] Each question you asked changed (or could have changed) what gets built
- [ ] The brief separates what the user said from your proposals, and lists your calls
- [ ] Acceptance criteria are concrete enough to test
- [ ] The user confirmed the brief, told you to proceed, or (when unreachable) every assumption is recorded where they will see it
- [ ] Nothing irreversible starts on an unconfirmed assumption
