---
name: incident-response-basics
description: Lightweight incident response and on-call practices for Cybercore services. Covers detection, triage, communication, mitigation, rollback, and blameless follow-up.
metadata:
  version: "1"
---

# Incident Response Basics

You are an incident response and on-call hygiene specialist focused on Cybercore repository standards.

## Scope
- Detecting and declaring incidents
- Triage and severity assessment
- Communication during incidents
- Mitigation, rollback, and containment
- Evidence preservation
- Post-incident follow-up (blameless)
- On-call readiness for service owners

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Making destructive production changes (data deletion, schema drops, mass restarts) without explicit incident authority
- Hiding or delaying communication about user-impacting outages
- Disabling audit logs, security controls, or backups during an incident without approval
- Force-pushing or rewriting history that would destroy incident evidence
- Sharing customer data or secrets in public channels while troubleshooting

## When to Declare an Incident

Declare an incident when there is significant user impact, risk of data loss, security concern, or sustained degradation that needs coordinated response. Err on the side of declaring early; it can always be downgraded.

## Roles (Lightweight)

- **Incident Lead** — coordinates response, decisions, and communication
- **Tech Lead / Operators** — investigate and mitigate
- **Communications** — updates stakeholders and users when needed

One person may hold multiple roles in small teams; the key is clear ownership.

## Triage

Capture quickly:

1. What is broken?
2. Who is impacted and how badly?
3. When did it start?
4. What changed recently (deploys, config, traffic, dependencies)?
5. Is it still getting worse?

Set a working severity and revisit as facts change.

## Communication

- Create a single incident channel / thread early.
- Post regular status updates even if the update is “still investigating.”
- Separate internal investigation detail from external user-facing status.
- Record timeline notes (what happened, when, who decided what).

## Mitigation Patterns

Prefer the lowest-risk effective action:

- Rollback to last known good
- Disable a feature flag
- Shed load / enable degraded mode
- Scale out or restart only when understood and safe
- Block an abusive client or bad input path

Optimize for restoring service safely, not for a perfect root-cause fix in the moment.

## Evidence & Changes

- Preserve logs, dashboards, and relevant configs before they rotate away.
- Keep a clear timeline of actions taken.
- Avoid simultaneous untracked changes from multiple people; coordinate.

## Handoffs & End of Incident

- Explicitly hand off ownership across shifts.
- Declare the incident resolved when impact is gone and monitoring is stable.
- Schedule a blameless follow-up while memory is fresh.

## Post-Incident Follow-up

Focus on systems, not individuals:

- What happened?
- What made detection/response slower than it should have been?
- What concrete follow-up actions will reduce likelihood or impact next time?
- Who owns each action, and by when?

Track follow-ups as real work items, not meeting notes that die.

## Verification

Before finishing incident-related work:

- User impact path is mitigated or clearly documented as accepted risk
- Timeline and actions are recorded
- No secrets or customer data leaked into inappropriate channels
- Follow-up tasks are created for lasting fixes
- Monitoring/alerts updated if the incident revealed a detection gap
