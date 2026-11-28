---
name: strict-scope-reviewer
description: 'Keep every change to exactly what was asked: no unrequested abstractions, dependencies, configuration options, speculative features or drive-by refactors. Use before and after any code change, and when asked to "keep it minimal", "only change what I asked", "no over-engineering", "review this diff for scope creep", "why did you add that", "remove the bloat", or "YAGNI". Also use when you notice the urge to add a helper class, a new package, a flag "for flexibility", or to tidy code you weren''t asked to touch. Not for reviewing code quality and design (use code-review-and-refactoring).'
metadata:
  version: '1'
---
# Strict Scope & Anti-Bloat Reviewer

Every line in a change must trace back to the request. This skill sets a scope contract
before coding, holds to it while coding, and checks the diff mechanically before anything is
committed.

> [!CAUTION]
> **Do the requested change, completely and correctly, and nothing else.** Not a helper
> "for later", not a dependency "to save time", not a flag "for flexibility", not a cleanup
> of nearby code. Things you notice outside the scope go in a **follow-up list** in your
> report, not in the diff. If the requested change truly cannot work without touching
> something outside scope, **stop and ask** (or, if it is unavoidable and tiny, make it and
> name it explicitly in the report). Doing less than asked is also a failure: minimal
> means *exactly* the request, not a partial one.

---

## Steps

### 1. Write the scope contract before touching code

State it in your working notes (and to the owner for anything non-trivial):

```
Request:      <the ask, in one sentence, in the owner's words>
Done means:   <observable result: test passes, bug no longer reproduces, endpoint returns X>
Will change:  <files or modules, as globs: src/parser/**, tests/parser_*>
Won't change: <neighbouring code, public APIs, dependencies, config, formatting>
Unknowns:     <anything that could force a scope change → ask before proceeding>
```

**Completion criterion:** the contract exists, and every planned file is in "Will change".

---

### 2. The rules while coding

| Rule | Allowed | Not allowed (without an explicit request) |
|---|---|---|
| **Abstractions** | Inline code; a private function when the same logic is needed twice **in this change** | New interface/trait/abstract base, Factory/Manager/Strategy/Registry/Provider classes, plugin systems, generic type parameters with one concrete type |
| **Dependencies** | Standard library; libraries already in the manifest | Any new package, even small, even "standard"; bumping unrelated versions |
| **Configuration** | Hard-coded values that meet the request; existing config | New CLI flags, env vars, config keys, feature flags, optional parameters "for flexibility" |
| **Features** | Exactly the requested behaviour, with its edge cases and errors handled | Support for other formats, modes or platforms "while we're here"; TODOs promising future support |
| **Files** | Editing existing files; a new file when the request needs one (a test file, a requested module) | Splitting a file into several, new folders, new "utils" or "common" modules |
| **Existing code** | Changes needed to make the request work | Renames, reformatting, reordering imports, style fixes, comment rewrites, "cleanup" in untouched code |
| **Tests** | Tests for the requested behaviour; updating tests your change legitimately breaks | Rewriting unrelated tests; a new test framework |
| **Public API** | Unchanged unless the request changes it | New exports, changed signatures, new types "for consumers" |

**The rule of two:** an abstraction needs at least **two real, current call sites in this
change** (not "we'll need it"). One use means inline code.

**The dependency gate:** before adding a package, write down (a) which existing dependency
or standard-library feature was tried, and (b) that the owner asked for or approved the
dependency. Without both, write the code.

**Completion criterion:** every hunk in the diff maps to a line of the scope contract.

---

### 3. Check the diff mechanically

```bash
python3 <this-skill-dir>/scripts/scope_check.py --scope 'src/parser/**,tests/**'   # working tree vs HEAD
python3 <this-skill-dir>/scripts/scope_check.py --staged --scope 'src/parser/**'
python3 <this-skill-dir>/scripts/scope_check.py --base main --scope '...' --max-added 80
```

It reports:
- **ERROR** (exit 1): any file outside `--scope`; any **new** dependency in `package.json`,
  `Cargo.toml`, `pyproject.toml`, `requirements*.txt`, `go.mod`, `Gemfile` or
  `composer.json` (version bumps of existing ones are not counted) unless `--allow-deps`.
- **WARN**:
  - New abstractions (interfaces, traits, abstract and Protocol classes, `*Factory`,
    `*Manager`, `*Strategy`, `*Adapter`, `*Provider`, `*Builder`, `*Registry`, `*Wrapper`,
    `*Helper`, `*Handler`, `*Base` types) and new generic type parameters.
  - New configuration surface (argparse, clap, commander, Go flags, env-var reads, feature
    flags).
  - Speculative wording ("in the future", "extensible", "just in case", "TODO: support…").
  - Whitespace-only hunks.
  - More than 2 new files (`--allow-new-files N`), and added lines over `--max-added N`.
- Untracked files count as new files.

Real run on a deliberately bloated fix ("fix CSV parsing of quoted commas in src/parser"):

```
ERROR  package.json: outside the requested scope (src/parser/**, tests/**); revert or justify
ERROR  package.json: new dependency 'lodash': was it requested? …
ERROR  src/cli/main.py: outside the requested scope …
WARN   (diff): 3 new files (limit 2): src/parser/config.py, src/parser/plugins.py, src/parser/registry.py
WARN   src/cli/main.py: formatting-only hunk …
WARN   src/parser/config.py: new configuration surface: DEBUG = os.environ.get("PARSER_DEBUG")
WARN   src/parser/core.py: new abstraction: class ParserStrategy(ABC): …
WARN   src/parser/core.py: speculative comment/code: """Extensible for future formats."""
WARN   src/parser/core.py: new abstraction: class CsvParserFactory: …
WARN   src/parser/core.py: speculative comment/code: # TODO: support TSV and JSON later
6 file(s), +19 lines: 3 error(s), 7 warning(s)
```

The minimal fix (three lines using the standard `csv` module) passed with 0 errors and
0 warnings.

Each finding gets one of three outcomes: **revert** it, **justify** it in one line tied to
the request (for example "the factory is needed because the request asks for both formats"),
or **ask** the owner. The script uses heuristics: a WARN is a question to answer, and a
clean run doesn't prove the change is minimal. Also review by eye for things it can't see:
new optional parameters, widened types, extra error variants, and new public exports.

**Completion criterion:** the script exits 0 (or every ERROR is resolved by revert or
approval), and every WARN is reverted or justified.

---

### 4. Report scope honestly

End the work with:

```
Scope: changed <files>; matches the request "<request>".
Outside scope: none  |  <file/change> — why it was unavoidable
Follow-ups noticed (not done): <bug in X>, <duplication in Y>, <outdated dep Z>
```

The follow-up list is where good ideas go. It respects the owner's decision about what to do
next, and keeps the diff reviewable.

**Completion criterion:** the report states scope adherence, any exception, and follow-ups.

---

## Excuses agents use, and the answer

| Excuse | Reality |
|---|---|
| "It's only a small helper class" | Small abstractions still add a name, a file and an indirection to learn. Inline it until there are two real uses. |
| "We'll definitely need this later" | Then it will be requested later, with real requirements. Speculative designs guess wrong. |
| "This library saves writing 20 lines" | It adds supply-chain risk, upgrades, licence review and install size forever. Write the 20 lines, or ask. |
| "Making it configurable is more flexible" | Every option is a code path to test and document. Hard-code until someone asks. |
| "While I was there I cleaned it up" | Unrequested edits hide the real change in review and can break things nobody asked you to touch. List it as a follow-up. |
| "The formatter changed those lines" | Run the formatter only on lines you changed, or revert unrelated hunks. |
| "Best practice says to use an interface here" | Best practice is to solve the stated problem simply. Patterns serve needs that exist. |
| "It's more professional / production-ready" | Production-ready means correct, tested and reviewable, not elaborate. |
| "The user will be impressed" | The owner asked for a specific change. Surprises cost review time and trust. |
| "It was faster to rewrite the whole function" | Rewrites hide behaviour changes. Make the targeted edit. |

## Red flags: stop and re-read the request

- You're about to create a file named `utils`, `helpers`, `common`, `base`, `manager` or `factory`.
- You typed `npm install`, `cargo add`, `pip install` or `go get` without being asked.
- You're adding a parameter with a default that no caller passes.
- You're writing "for future use", "extensible", "in case" or "TODO: support" in a comment.
- The diff touches a file you didn't list in the scope contract.
- The diff is several times longer than the change you described.
- You're explaining why the extra work is a good idea instead of doing the requested work.

All of these mean: revert to the contract, and put the idea in the follow-up list.

---

## Reference

### Legitimate reasons to go beyond the literal request (say them out loud)

| Situation | What to do |
|---|---|
| The requested change breaks an existing test or caller | Fix exactly that breakage; name it in the report |
| A security or data-loss bug in the code you're changing | Stop and tell the owner; fix it only with approval (or if trivially part of the change) |
| The request is impossible without a new dependency | Ask, with the dependency's name, size, licence and the alternative you tried |
| The owner asked for "production-ready", "robust" or similar | Clarify which qualities (tests, error handling, logging) and keep to those |

### Script options

| Option | Effect |
|---|---|
| `--scope 'glob,glob'` | Files outside these globs are errors (`**` matches subfolders) |
| `--staged` / `--base REF` | Diff the index vs HEAD, or the working tree vs REF |
| `--allow-deps` | New dependencies become allowed (approved by the owner) |
| `--allow-new-files N` | New-file warning threshold (default 2) |
| `--max-added N` | Added-lines budget |
| `--json` | Machine-readable findings after the report |
