---
name: skill-router
description: 'Meta-skill that decides which skill(s) to use when several match a prompt: an ordered set of priority rules (explicit request, guards, process before implementation, project over generic, specific over general, repo evidence, ask on real ties), plus a router script that ranks installed skills for a prompt and finds overlapping or shadowed skills. Use when more than one skill seems to apply, when unsure which workflow to follow, when adding a new skill, or when asked "which skill should handle this", "skills conflict", "wrong skill was used", or "audit my skills for overlap".'
metadata:
  version: '1'
---
# Skill Router & Conflict Resolver

With hundreds of skills installed, several will match almost any prompt. Loading the wrong
one sends the work down the wrong workflow; loading all of them wastes context and produces
contradictory instructions. This skill fixes the order of precedence, says how to combine
skills, and provides a router that ranks candidates and audits the skill set for overlaps.

> [!CAUTION]
> The owner's instructions (CLAUDE.md, rules files, the current message) **outrank every
> skill**. The router is advisory: it ranks by text and configured hints, not by
> understanding. When its pick contradicts the request, follow the request. Use **one
> primary skill**, at most two supporting skills and the relevant guards; never load a stack
> of five overlapping skills "to be safe".

---

## The priority rules (apply in order; stop at the first that decides)

| # | Rule | Example |
|---|---|---|
| 0 | **Owner instructions and safety rules win** over any skill | A rules file says "never push": no skill's "push the branch" step applies |
| 1 | **An explicitly named skill wins** (`/name`, "use the X skill") | "use /adr-writer" → `adr-writer`, even if `documentation-and-adrs` scores higher |
| 2 | **Guards always layer on top**: discipline skills that constrain how work is done, never what work | Any code change → also `strict-scope-reviewer`; git history operations → also `git-guardrails` |
| 3 | **Process before implementation**: when the task needs a workflow first (debugging, planning, investigation, design direction), that skill is primary and domain skills support it | "the test fails since yesterday" → `root-cause-debugging` primary, the language skill supporting |
| 4 | **Project-specific beats generic**: owner, private or repo-local skills (`cybercore-*`, the repo's own `.claude/skills/`) beat general catalogue skills for the same job | A repo-local `deploy` skill beats a generic deployment skill for that repo |
| 5 | **Specific beats general**: the skill whose triggers name the exact task wins; a skill's "Not for … (use X)" line is binding | "self-host fonts" → `foss-font-bundler`, not a general performance skill |
| 6 | **Repo evidence decides between equals**: the tooling and conventions already in the repo pick the skill | A repo with release-please → its changelog flow, not a hand-rolled one |
| 7 | **Real tie with different workflows → ask one question** (or combine, if they're compatible) | "make the docs better" → README quickstart, or man page, or an ADR? Ask. |

**Combining:** primary = the workflow you follow; supporting = reference material you consult
for one part; guards = constraints on every step. If two candidates would each dictate the
workflow, they don't combine: pick one by the rules above.

---

## Steps

### 1. Route the prompt

For a clear match, just follow the rules. When several skills plausibly apply, run the router:

```bash
python3 <this-skill-dir>/scripts/route.py route "the parser test is failing after yesterday's change, find out why"
```

```
PRIMARY    root-cause-debugging               top match, tier 'process'
```

```bash
python3 <this-skill-dir>/scripts/route.py route "fix the crash when the config file is empty"
```

```
PRIMARY    root-cause-debugging               top match, tier 'process'
OVERLAY    strict-scope-reviewer              discipline skill, always layered on (rule 2)
```

How it decides:
- **Scoring:** word overlap weighted by rarity across all installed skills (so "fonts" counts
  more than "build"), plus a bonus for multi-word quoted trigger phrases in a description
  ("self-host fonts"), plus **intent hints** from `routing.toml`.
- **Rules:** an explicit `/name` wins (rule 1); guards are added from their activation words
  (rule 2); near-ties within 10% are broken by tier (process, then project, then domain) and
  by folder order (rules 3–4); `[prefer]` pairs apply (rule 5); and a near-tie between two
  skills of the same tier prints `ASK?` (rule 7).
- **Folders:** it reads `~/.claude/skills` and `~/.agents/skills` by default (earlier
  folders win ties and name clashes); change them with `--dirs` or `SKILL_ROUTER_DIRS`
  (comma-separated), for example to put a private skills folder first.

Tested on ten prompts against a machine with about 1,140 installed skills (about 0.3
seconds each), with the right primary every time:
- Two different bug reports → `root-cause-debugging`, with the scope guard added for the
  code fix.
- Fonts, ADRs (both scored and named with `/adr-writer`), commits and changelog, design
  tokens, Cloudflare and DNS, a neon palette, a landing page and a man page → their own
  skills.
- An unrelated prompt ("bake a sourdough loaf") → `no skill matches`.

**Completion criterion:** one primary skill (or a deliberate question to the owner), plus
any guards and at most two supporting skills.

---

### 2. Load and follow

- Load the **primary** skill fully and follow its workflow.
- Load **supporting** skills only for the step they help with (for example a framework
  reference while implementing).
- Apply **guards** throughout and check them before finishing (the scope check, the git
  safety rules).
- Name your choice in one line when it isn't obvious: "Using `root-cause-debugging`, with
  `rust-development` for the Rust parts."

**Completion criterion:** the work follows one workflow, and the guards were checked.

---

### 3. Keep the skill set conflict-free

Run after adding, renaming or installing skills:

```bash
python3 <this-skill-dir>/scripts/route.py conflicts --focus ~/my-skills   # one folder vs everything installed
python3 <this-skill-dir>/scripts/route.py table --focus ~/my-skills       # routing table for review
```

| Finding | Meaning | Fix |
|---|---|---|
| `SHADOWED 'name' has N different versions` | The same skill name is installed from different sources with different content; which one an agent sees depends on folder order | Keep one version (re-copy from the source of truth), or rename one |
| `OVERLAP 0.46 a <-> b` | Descriptions are similar (TF-IDF cosine similarity at or above `--min`, default 0.35) | Add "Not for X (use b)" to the narrower skill's description, or a `[prefer]` entry |
| `same trigger phrases: …` | Two skills quote the same trigger | Give the phrase to one skill only |

A real run (0.4 seconds for 24 skills against about 1,140 installed) found 8 overlaps,
including two skills with 0.46 similarity and two shared trigger phrases ("skeleton loader",
"scroll animations"), plus one **shadowed** skill installed with different content in
`~/.claude/skills` and `~/.agents/skills`.

**Completion criterion:** no SHADOWED findings, and every OVERLAP is resolved or
deliberately accepted.

---

### 4. Tune the rules (`routing.toml`)

The bundled `scripts/routing.toml` holds shared rules. Put personal rules (your own skill
folders, preferences for private skills) in `~/.config/skill-router/routing.toml`, which is
applied on top. Lists are merged and tables are updated key by key.

```toml
process = ["debug", "investigat", "plan", "brainstorm", "review", "audit", "diagnos", "verif", "root-cause"]
project_prefixes = ["cybercore-", "omarchy-"]
project_dirs = ["~/my-private-skills"]   # skills here count as project-specific (rule 4)

[overlays]                      # guards: never primary, added when these words appear
strict-scope-reviewer = ["implement", "fix", "refactor", "feature", "code", "patch", "bug"]
git-guardrails = ["push", "force", "reset", "rebase", "delete branch"]

[prefer]                        # generic = specific, applied when both match
systematic-debugging = "root-cause-debugging"
documentation-and-adrs = "adr-writer"

[intents]                       # strong signals beyond word overlap
root-cause-debugging = ["bug", "failing", "crash", "regression", "flaky", "find out why"]
foss-font-bundler = ["font", "fonts", "woff2", "@font-face", "fontsource"]
```

- When a prompt routes wrongly, add an **intent** for the right skill, or a **prefer** pair,
  then re-run `route` on that prompt. Testing showed why intents matter: words like "failing"
  and "crash" appear in so many of the ~1,100 descriptions that plain overlap ranked a
  requirements skill above the debugging skill until the intent was added.
- Keep overlays to true guards. A workflow skill marked as an overlay can never be primary,
  which was the other bug found while testing.
- Unknown skill names in the file are ignored, so one file can serve several machines.

**Completion criterion:** the prompts that routed wrongly now route correctly, and the
earlier test prompts still do.

---

## Composition patterns

| Task | Primary | Supporting | Guards |
|---|---|---|---|
| Fix a bug | `root-cause-debugging` | language/framework skill | `strict-scope-reviewer` |
| New page or site | `web-design-and-frontend-craft` | `css-grid-motion-system` (layout, motion), `foss-font-bundler` (fonts) | `strict-scope-reviewer` |
| Theme or palette work | `design-token-theme-switcher` (structure) or `cyberpunk-neon-palette` (colours) | the other one | |
| Ship a change | `conventional-commit-changelog` | `doc-manpage-builder` if flags changed | `git-guardrails` |
| Record a decision | `adr-writer` | `documentation-and-adrs` (repo-wide doc rules) | |
| Backups and mirrors | `forge-mirror-sync` | `git-workflow` | `git-guardrails` |
| DNS and Workers changes | `cloudflare-dns-iac` | `ci-cd-pipelines` (deploy jobs) | |
| Rust release hygiene | `cargo-supply-chain-msrv-auditor` | `rust-release-and-cross-compile` | |

`git-guardrails` is listed as a guard because many setups install one; the router ignores
names that aren't installed.

## Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Loading every matching skill | Contradictory instructions, wasted context | One primary, ≤ 2 supporting, plus guards |
| Picking by the first keyword | "test" in a bug report routes to a testing skill instead of debugging | Rules 3 and 5; intents |
| Two copies of a skill with the same name | Behaviour depends on folder order | `conflicts`, then keep one |
| Following a skill over the owner's instruction | Rule 0 violated | The owner wins, always |
| Treating the router's pick as final | It ranks text, not intent | Sanity-check against the request; ask on real ties |
