---
name: adr-writer
description: Write concise Architectural Decision Records (ADRs) in docs/adr/ that explain why a technical trade-off was chosen, what was rejected, and when to revisit it. Use when asked to "write an ADR", "document this decision", "record why we chose X", "architecture decision record", "decision log", "supersede an ADR", "update the ADR index", "lint ADRs", or when a change picks between real alternatives (framework, database, protocol, hosting, API shape, data model) that future maintainers will question. Not for structuring documentation in general (use documentation-and-adrs).
metadata:
  version: '1'
---
# Architectural Decision Record (ADR) Writer

Records **why** a significant technical choice was made: the context and forces, the options
weighed, the decision, and its consequences. One short markdown file per decision, numbered,
immutable once accepted, and replaced only by a new ADR that supersedes it.

> [!CAUTION]
> An ADR is evidence, not marketing. Record only facts you verified (from the code, docs,
> measurements or the owner) and label assumptions as assumptions. Never invent benchmarks,
> costs, user numbers or quotes to make a choice look stronger. Never rewrite the decision of
> an accepted ADR: supersede it with a new one, so the history stays true.

---

## Steps

### 1. Decide whether this needs an ADR

Write one when **two or more** are true:
- The choice is **hard or expensive to reverse** (database, framework, protocol, hosting,
  public API shape, data model, licensing, security boundary).
- There were **real alternatives** and someone will later ask "why not X?".
- It affects **more than one component, repo or team**.
- It sets a **convention** others must follow (error handling, versioning, testing policy).

Don't write one for reversible, local choices (a library helper, a variable name, a
refactor), or for things already dictated (the owner said "use X", nothing to weigh). Put
those in the commit message or PR description.

**Completion criterion:** you can name the decision in one sentence and at least one
credible alternative.

---

### 2. Follow the repo's existing convention

```bash
ls docs/adr docs/decisions doc/adr adr 2>/dev/null       # where ADRs live already
head -12 "$(ls docs/*/0001-*.md 2>/dev/null | head -1)"  # their heading and status style
```

- **Existing ADRs win:** keep their folder, number width, heading style (`# ADR-0002: …`),
  status format and section names, even if they differ from the template below.
- No ADRs yet: create `docs/adr/` with four-digit numbering (`0001-short-slug.md`).
- If the repo has a broader documentation skill or guide (for example
  `documentation-and-adrs`), follow it for wider docs and use this skill for the ADR itself.

**Completion criterion:** you know the folder, the numbering and the format the new ADR must
match.

---

### 3. Gather the context (facts, not opinions)

Collect before writing:
- **The problem and forces:** what needs deciding and why now; requirements (scale, latency,
  budget, compliance, offline, team skills); constraints already fixed by earlier ADRs
  (link them).
- **Evidence:** relevant code paths, current metrics, measurements, documentation for each
  option (current versions; check docs rather than memory), licence terms, maintenance
  status.
- **The real options:** two to four, including "keep what we have / do nothing" when viable.
- **Who decides:** the owner. An agent drafts; the status stays `Proposed` until the owner
  accepts.

**Completion criterion:** every claim you plan to write has a source, or is marked as an
assumption.

---

### 4. Write it (concise, about one page)

```bash
python3 <this-skill-dir>/scripts/adr.py new "Use PostgreSQL with sqlx for shared state"
# → docs/adr/0002-use-postgresql-with-sqlx-for-shared-state.md (number and slug computed)
```

Sections, in order:

| Section | Write | Length |
|---|---|---|
| `# ADR-NNNN: Title` | The decision as a short statement ("Use PostgreSQL with sqlx for shared state") | One line |
| Status / Date | `Proposed` (a draft), ISO date | Two bullets |
| **Context** | The forces: problem, constraints, requirements, relevant numbers. No solution yet. | 2–6 sentences |
| **Decision** | "We will …" in active voice, with the scope and what's out of scope. (Some repos call this **Proposal** while it's proposed.) | 1–4 sentences |
| **Considered options** | Each real option with honest pros and cons, and why the losers lost | 2–4 short items |
| **Consequences** | What gets easier, what gets harder, new risks, follow-up work, and **the revisit trigger** | 3–8 bullets |

Writing rules:
- **Plain, specific words:** "p95 write latency 40ms at 200 req/s" beats "fast"; "adds a
  managed database bill" beats "some cost".
- **Negative consequences are mandatory.** A decision with no downside wasn't a trade-off.
- **A revisit trigger** makes the ADR useful later: "Revisit if write volume exceeds one
  node, or if we need offline sync."
- **Link, don't paste:** benchmarks, specs and long analyses go in linked documents; the
  ADR summarises them.
- About a page (well under 200 lines). If it grows, you're writing a design doc; split
  that out and link it.
- Delete the template's guidance comments before review.

A good, short example:

```markdown
# ADR-0002: Use PostgreSQL with sqlx for shared state

- **Status:** Accepted
- **Date:** 2026-11-27
- **Supersedes:** [ADR-0001](0001-use-sqlite-for-local-state.md)

## Context

The daemon moved from one machine to three, and all three must see the same job queue.
SQLite (ADR-0001) is file-local, so the queue cannot be shared without a network layer we
would have to build. We already run PostgreSQL 17 for the dashboard.

## Decision

We will store shared state (jobs, leases, audit log) in the existing PostgreSQL instance and
access it with sqlx using compile-time checked queries. Per-machine caches stay in SQLite.

## Considered options

1. **PostgreSQL + sqlx (chosen):** already operated; transactions and `SKIP LOCKED` fit a
   job queue; checked queries catch schema drift at build time. Costs: a network dependency.
2. **SQLite + Litestream replication:** keeps one-file simplicity, but replicas are
   read-only, so only one machine could write.
3. **Redis queue:** fast, but no relational audit log, and a new service to run.

## Consequences

- Positive: one writer model for all machines; the audit log can be queried with SQL.
- Negative: the daemon needs the database to start; offline mode is gone for shared jobs.
- Follow-up: connection-pool sizing; a migration path for existing SQLite queues.
- Revisit if: we need offline-first operation, or queue load exceeds one database node.
```

**Completion criterion:** every section is present, the negatives are real, and a revisit
trigger exists.

---

### 5. Status lifecycle and superseding

```
Proposed ──► Accepted ──► Deprecated            (no longer applies; nothing replaced it)
    │            └──────► Superseded by ADR-M   (a newer ADR replaced it)
    └──► Rejected                               (considered and declined; keep the file)
```

```bash
python3 <this-skill-dir>/scripts/adr.py status 2 accepted                   # after owner approval
python3 <this-skill-dir>/scripts/adr.py new "Move queue to NATS" --supersedes 2
# → new ADR links "Supersedes: ADR-0002"; ADR-0002 becomes "Superseded by ADR-0003"
python3 <this-skill-dir>/scripts/adr.py status 4 superseded --by 7
```

- Accepted ADRs are **immutable** in substance. Fixing typos and broken links is fine;
  changing the decision means a new ADR.
- Keep rejected ADRs: they answer "did we consider X?" forever.
- Never reuse a number, even after deleting a draft.

**Completion criterion:** the status reflects reality, and supersede links go both ways.

---

### 6. Index and lint

```bash
python3 <this-skill-dir>/scripts/adr.py index      # writes the table into docs/adr/README.md
python3 <this-skill-dir>/scripts/adr.py lint       # exit 1 on errors; use in CI
```

`index` maintains a table (ADR, title, status, date) between
`<!-- adr-index:start -->` / `<!-- adr-index:end -->` markers, keeping any text around them.

`lint` checks:
- **Errors:** filenames (`NNNN-slug.md`), duplicate numbers, status in the allowed set,
  ISO dates, the required sections (Context, Decision or Proposal, Consequences), and
  superseded ADRs naming an existing successor.
- **Warnings:** numbering gaps, mixed number widths, an H1 not matching the number, no
  options/alternatives section, accepted ADRs still titled "Proposal", leftover template
  comments, over 200 lines, and a successor that doesn't link back.

It accepts both the bullet status style (`- **Status:** Accepted`) and the Nygard style
(`## Status`), and it auto-detects `docs/adr` or `docs/decisions`.

**Completion criterion:** `lint` exits 0, and the index lists the new ADR.

---

### 7. Review and land

- Open the ADR in the **same PR** as the change it justifies, or before it for large
  decisions, so reviewers judge the reasoning together with the code.
- PR description: the decision in one line, plus a link to the ADR.
- Status stays `Proposed` until the owner accepts; flip it to `Accepted` in the PR once they
  do (or in a follow-up commit if it lands as a draft).
- Link the ADR from the code where the decision bites (a comment near the queue setup:
  `// Why PostgreSQL: docs/adr/0002-…`).

**Completion criterion:** the PR links the ADR, the code links where relevant, and the
owner decided the status.

---

## Reference

### Templates in the wild

| Format | Shape | Use when |
|---|---|---|
| **Nygard (original)** | Title, Status, Context, Decision, Consequences | Minimal, quick decisions |
| **MADR** | Adds considered options, decision drivers, pros/cons per option | Weighed choices; the default here (trimmed) |
| **Y-statement** | "In the context of …, facing …, we decided for …, to achieve …, accepting …" | One-paragraph decisions, or a summary line inside an ADR |

### Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| ADR written after the fact as justification | Options are straw men | Write it while deciding; list the alternative you nearly chose |
| No negatives in Consequences | Not a trade-off; readers stop trusting ADRs | State the costs plainly |
| Editing an accepted ADR's decision | History lies | Supersede with a new ADR |
| Five-page ADR | Nobody reads it | One page; link a design doc |
| Vague context ("for scalability") | Can't tell later if conditions changed | Numbers and named constraints |
| No revisit trigger | Decisions become dogma | "Revisit if …" |
| ADR for every small choice | Noise hides the important ones | The §1 test |
