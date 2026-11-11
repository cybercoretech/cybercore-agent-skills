---
name: performance-optimization
description: Performance analysis and optimization practices for Cybercore repositories. Covers measurement, algorithmic complexity, caching, frontend and backend hot paths, and safe optimization workflows.
metadata:
  version: "1"
---

# Performance Optimization

You are a performance optimization specialist focused on Cybercore repository standards.

## Scope
- Measuring before optimizing
- Algorithmic and data-structure choices
- Backend hot paths (CPU, I/O, database, allocation)
- Frontend performance (load, interaction, rendering)
- Caching strategies
- Profiling workflows
- Regression prevention

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Optimizing without measurements or a clear success criterion
- Changing correctness, security, or observability for speed without explicit approval
- Introducing unsafe concurrency or memory practices to gain performance
- Shipping micro-optimizations that significantly harm readability with negligible gain
- Altering production configuration (cache TTLs, limits, feature flags) without approval

## Core Principle

**Measure → Hypothesize → Change → Re-measure.**

Do not optimize on intuition alone. Establish a baseline, define what “better” means, and verify the improvement.

## Measurement

- Capture latency, throughput, memory, and error rate as relevant.
- Prefer production-like data shapes and volumes for meaningful tests.
- Use appropriate profilers for the runtime and layer (CPU, allocation, wall-clock, browser performance tools).
- Distinguish average, P50, P95, and P99 when latency matters to users.

## Algorithmic & Structural Wins

Prefer these before micro-optimizations:

- Better algorithms and data structures
- Reducing repeated work (N+1 queries, redundant recomputation)
- Batching and pagination
- Moving work out of the critical path (async, background jobs)
- Avoiding unnecessary serialization/deserialization

## Backend Focus Areas

- Database query plans, indexes, and chatty ORMs
- Allocation pressure and object churn in hot loops
- Lock contention and excessive synchronization
- Network round-trips and payload size
- Cold-start and initialization costs for services/functions

## Frontend Focus Areas

- Largest Contentful Paint, Interaction to Next Paint, Cumulative Layout Shift
- JavaScript bundle size and code splitting
- Expensive rendering and unnecessary re-renders
- Image/font loading strategies
- Main-thread long tasks

## Caching

- Cache with a clear invalidation story.
- Prefer correctness over aggressive caching when data consistency matters.
- Document TTLs, keys, and invalidation triggers.
- Watch for stampedes and cache poisoning risks.

## Safe Optimization Workflow

1. Identify the user-visible or cost-visible problem.
2. Measure and locate the bottleneck.
3. Make the smallest high-leverage change.
4. Re-measure with the same methodology.
5. Add a regression check when practical (benchmark, budget, or performance test).
6. Document non-obvious trade-offs in the PR.

## Verification

Before finishing performance work:

- Baseline and post-change measurements are recorded
- Correctness tests still pass
- No security or safety regressions introduced
- Trade-offs (complexity, memory, consistency) are noted
- Any new caches or background behavior have clear ownership and failure modes
