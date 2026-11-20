---
name: plain-writing
description: Write and edit prose so it reads as clear, specific, human writing instead of generic AI text. Applies plain-language principles (reader first, concrete words, short active sentences, one idea per sentence) and removes common machine-writing patterns such as inflated vocabulary, filler openers, hedging chains, "not just X but Y" constructions, padded lists of three, decorative emoji and headings on everything, while keeping every fact, number, name and command intact. Use when drafting or revising READMEs, documentation, pull request and commit descriptions, release notes, announcements, emails, error messages and interface copy, or when asked to "make this sound less like AI", "simplify", "tighten" or "rewrite in plain English". Not for deciding what documentation a project needs (use documentation-and-adrs).
metadata:
  version: "2"
---

# Plain Writing

You write so the reader understands quickly and trusts what they read. Generic machine-sounding prose costs attention and credibility: readers skim it, doubt it, or miss the one sentence that mattered. Plain writing is not dumbed down; it is precise.

## Scope

- Drafting prose: docs, READMEs, pull requests, commit bodies, release notes, announcements, emails, interface copy and error messages
- Editing existing text for clarity while keeping its meaning and voice
- Removing machine-writing patterns
- Writing for readers who skim, read on phones, or read in a second language

Document structure (what sections a README or decision record needs) belongs to `documentation-and-adrs`; response length in conversation to the `concise-output` rule.

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**

- Changing the meaning of legal, policy, licence, security or safety text while "simplifying" it. Flag unclear passages instead of rewriting their substance.
- Altering quotes, code, commands, file paths, version numbers, names, figures or dates during an edit
- Adding facts, claims, statistics or examples that were not in the source or verified
- Using this skill to disguise AI authorship where disclosure is required (coursework, publications, platforms or employers that require it). Plain writing is about clarity, not evasion.

## Principles

1. **Know the reader and the one thing they need.** Before writing, name who reads it and what they must know or do afterwards. Put that first.
2. **Concrete beats abstract.** "Builds in 40 seconds instead of 6 minutes" beats "significantly improves build performance".
3. **Plain words.** "Use", not "leverage"; "help", not "facilitate"; "start", not "commence". Keep technical terms when they are the precise name of something.
4. **Short sentences, one idea each.** Split sentences that join ideas with "and", "which" or semicolons. Vary length naturally; do not make every sentence the same shape.
5. **Active voice with a clear actor.** "The installer backs up your files", not "Files are backed up".
6. **Say it once.** No summary that repeats the paragraph above it, no closing paragraph that restates the opening.
7. **Structure only where it helps.** Lists for steps and parallel items, tables for comparisons, headings for documents people navigate. A short answer needs none of them.
8. **Keep the voice.** When editing someone's text, fix clarity and leave their tone, terminology and opinions.

## Patterns to remove

The full list with replacements is in `references/ai-tells.md`. The most common:

- **Inflated words:** delve, leverage, utilize, seamless, robust, cutting-edge, game-changing, harness, unlock, elevate, tapestry, landscape, realm, pivotal, crucial (when nothing is at stake)
- **Filler openers and closers:** "In today's fast-paced world", "It's worth noting that", "Let's dive in", "In conclusion", "I hope this helps"
- **Hedging chains:** "may potentially help to somewhat improve"; commit to the claim or state the real uncertainty once
- **Formula constructions:** "not just X, but Y", "whether you're A or B", "X isn't merely Y; it's Z"
- **Padded triplets:** three adjectives or three parallel clauses where one carries the meaning
- **Decoration:** emoji on every bullet or heading, bold scattered through sentences, headings over two-line sections, every paragraph turned into bullets
- **Vague praise and intensifiers:** "powerful", "comprehensive", "incredibly", "truly", "very"
- **Dash overuse:** long dashes used as the default way to join clauses; prefer commas, colons, parentheses or two sentences

Removing these words is not enough: replace them with the specific fact they were standing in for, or delete the sentence if there was none.

## Editing process

1. **Read the whole text** and write down its purpose and reader in one line.
2. **Mark every fact** that must survive: numbers, names, commands, versions, dates, links, warnings.
3. **Cut** sentences that say nothing specific, repeat earlier text, or exist only to transition.
4. **Replace** inflated words and formula constructions with plain, specific wording.
5. **Restructure** so the most important point comes first, steps are numbered, and comparisons are tables.
6. **Read it aloud** (or as if aloud): stumbles mark sentences to split or reword.
7. **Check the facts** you marked are all present and unchanged.
8. **Report** what kind of changes you made if the user asked for an edit, and flag anything you were unsure how to simplify without changing meaning.

`references/before-after.md` shows edits of a README introduction, a pull request description, release notes, an error message and an announcement.

## Interface copy and errors

- Buttons say what happens: "Save changes", "Delete project", not "OK" or "Submit"
- Errors say what happened, why if known, and what to do next, without blaming the user
- Empty states explain what belongs here and how to add it
- Keep words consistent: one name for one thing across the product

## Common failure modes

| Failure | Better |
|---|---|
| Swapping "leverage" for "use" but keeping the empty sentence | Delete it, or replace it with the actual fact |
| Simplifying a licence clause and changing what it allows | Leave the clause; flag it as hard to read |
| Rewriting someone's voice into yours | Fix clarity, keep their tone |
| Turning every paragraph into bullets | Prose for reasoning, lists for steps |
| Adding a friendly closing summary | End when the content ends |
| Dropping a number or command while tightening | Check every marked fact survived |

## Verification

- [ ] The reader and purpose are clear, and the most important point comes first
- [ ] Every number, name, command, path, version, date, link and warning from the source is present and unchanged
- [ ] No new facts or claims were added
- [ ] Inflated words, filler openers, formula constructions and decoration are gone, replaced by specifics or removed
- [ ] Sentences carry one idea each, mostly in active voice
- [ ] Legal, policy and security text keeps its meaning (unclear parts flagged, not rewritten)
- [ ] When editing, the author's voice and terminology are preserved
