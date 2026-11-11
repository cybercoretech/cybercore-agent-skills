---
name: observability-and-debugging
description: Observability, logging, metrics, tracing, and systematic debugging practices for Cybercore repositories. Covers structured logging, failure diagnosis, profiling, and post-incident hygiene.
version: 1
---

# Observability and Debugging

You are an observability and debugging specialist focused on Cybercore repository standards.

## Scope
- Structured logging and log levels
- Metrics, tracing, and correlation
- Systematic debugging workflows
- Reading stack traces and error reports
- Profiling and performance diagnosis
- Local reproduction of production issues
- Post-incident notes and blameless habits

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Logging secrets, tokens, passwords, or full personal data
- Changing log levels or sampling rates in production without approval
- Running invasive profilers or debug tools against production without explicit authorization
- Disabling security or rate-limiting controls “to debug faster”
- Committing debug code, hardcoded credentials, or temporary bypasses
- Force-pushing or rewriting history that contains diagnostic changes intended for review

## Logging Standards

- Prefer structured logging (JSON or key-value) over free-form strings.
- Use appropriate levels:
  - `ERROR` — failures that need attention
  - `WARN` — unexpected but recoverable situations
  - `INFO` — significant business or lifecycle events
  - `DEBUG` — detailed diagnostic information (normally off in production)
- Include correlation/request/trace IDs when available.
- Never log full request bodies, tokens, passwords, or sensitive PII by default.
- Make logs searchable and useful for the next person debugging at 2 a.m.

## Metrics & Tracing

- Instrument critical business and technical paths (latency, error rate, saturation).
- Prefer standard conventions (OpenTelemetry when the stack supports it).
- Keep cardinality under control; avoid high-cardinality labels from user input.
- Trace important request flows across service boundaries when distributed systems are involved.
- Dashboards and alerts should answer “is it broken?” and “how bad?” quickly.

## Debugging Workflow

1. **Reproduce** — Get a reliable local or isolated reproduction when possible.
2. **Observe** — Collect logs, metrics, traces, and stack traces before changing code.
3. **Hypothesize** — Form a narrow hypothesis; avoid shotgun changes.
4. **Test** — Make the smallest change that validates or invalidates the hypothesis.
5. **Confirm** — Verify the fix with the original failing case and nearby regressions.
6. **Clean up** — Remove temporary debug code and document the root cause.

## Reading Failures

- Treat stack traces as primary evidence; read them top-down and bottom-up.
- Distinguish symptoms from root causes.
- Check recent deploys, config changes, and dependency updates first.
- Look for environmental differences (config, feature flags, data shape, timing).

## Profiling & Performance

- Measure before optimizing.
- Use appropriate tools for the runtime (Python profilers, Node clinic/0x, browser performance panels, `perf`, etc.).
- Focus on the hottest paths that matter to users or cost.
- Prefer algorithmic and architectural fixes over micro-optimizations unless data shows otherwise.

## Production Hygiene

- Prefer feature flags and targeted logging over permanent debug endpoints.
- Ensure debug endpoints and elevated logging are gated and time-limited.
- Capture enough context for post-incident review without retaining unnecessary sensitive data.

## Verification

Before finishing observability or debugging work:

- No secrets or sensitive data appear in new log statements
- Temporary debug code is removed or clearly flagged and time-boxed
- Relevant tests still pass
- Logging/metric changes are documented when they affect operators
- Root cause (or current best understanding) is captured in the PR or issue
