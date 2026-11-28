---
name: doc-manpage-builder
description: 'Generate crisp, accurate CLI documentation from the program itself: README quickstarts, usage and option tables, configuration references and man pages built from the real --help output and example config, with a drift check that fails when the docs and the CLI disagree. Use when asked to "write a README", "document the CLI flags", "generate a man page", "add a configuration reference", "docs are out of date", "document the config file", "quickstart", "usage section", or when flags or config keys changed. Not for deciding what to document or writing guides (use documentation-and-adrs).'
metadata:
  version: '1'
---
# Self-Contained Documentation & Manpage Builder

Documentation copied by hand from code goes stale the day a flag changes. This skill treats
the program as the source of truth: it parses the CLI's own `--help`, reads the commented
example config, generates the README sections and a man page, and checks for drift in CI.
The human-written parts (the pitch, install, quickstart, examples) stay short and tested.

> [!CAUTION]
> Document only what the program actually does. Every command in a README must be run and
> verified before it's written down; every flag must come from `--help` or the code, never
> from memory or another tool's docs. Never invent output, benchmarks or platforms. If the
> framework already has a native doc generator, use it and keep this skill's checks.

---

## Steps

### 1. Find the sources of truth

```bash
tool --help ; tool -h ; tool <subcommand> --help     # the real flags
tool --version
ls config.example.* *.example.toml docs/ man/ 2>/dev/null
tool --print-default-config 2>/dev/null || tool +default-config 2>/dev/null   # if the CLI can print its defaults
```

Then check for a **native generator** and prefer it for the man page and completions:

| Framework | Native generator |
|---|---|
| Rust clap | `clap_mangen` (man), `clap_complete` (completions), `clap-markdown` |
| Python argparse | `argparse-manpage`, `sphinx-argparse` |
| Python click / typer | `click-man`, `typer … utils docs` |
| Go cobra | `cobra/doc` (`GenManTree`, `GenMarkdownTree`) |
| Node commander / oclif | `oclif readme`; commander has none (use this skill) |

The bundled `docgen.py` covers everything else and handles the README tables, config
reference and drift check for any of them.

**Completion criterion:** you know where flags, defaults and config keys are defined, and
whether a native generator exists.

---

### 2. README structure (crisp)

Write the human parts by hand, generate the reference parts:

```markdown
# tool
One sentence: what it does and for whom.

## Install
<real commands per platform, each tested: cargo install tool / pipx install tool / brew …>

## Quickstart
<three commands at most, from nothing to a visible result, with real expected output>

<!-- docgen:cli:start --> … generated usage, arguments, options, commands … <!-- docgen:cli:end -->

<!-- docgen:config:start --> … generated configuration reference … <!-- docgen:config:end -->

## Examples
<two to five real tasks, each one command plus one line of explanation>

## Exit codes · ## License
```

Rules:
- The pitch, install and quickstart fit on **one screen**. Reference material comes after.
- **Run every command** before documenting it, in a clean temp dir or container, and paste
  the real output (trimmed).
- No feature lists that repeat the options table, and no marketing adjectives.

**Completion criterion:** someone new reaches a working result by copying the quickstart.

---

### 3. Generate the usage and options section

```bash
D=<this-skill-dir>/scripts/docgen.py
python3 $D parse  --cmd "tool --help"                          # inspect the parsed model (JSON)
python3 $D readme --cmd "tool --help"                          # preview
python3 $D readme --cmd "tool --help" --readme README.md --write   # write between markers
```

The parser understands:
- clap short help and clap long help (descriptions on the next lines, with paragraphs and
  example bullets kept with their option).
- argparse, click, and cobra's `Available Commands:` and `Flags:`.
- Custom headings such as ripgrep's `OUTPUT MODES:`, uppercase `USAGE:` with the usage on
  the next line, and "`tool +sub …   description`" command lines.
- Environment variables mentioned as `[env: NAME=]`, `$NAME` or "env var NAME".

Tested against real tools, with parsed options matching the help exactly:

| Help output | Options parsed / in help |
|---|---|
| `rg -h` (custom formatter) | 108 / 108 |
| `fd --help` (clap long) | 49 / 49 |
| `bat -h` | 28 / 28 |
| `fd -h` (clap short) | 25 / 25 |
| argparse demo | 4 / 4, plus 1 argument and 1 env var |
| cobra-style demo | 3 / 3, plus 2 commands |
| `cyberterm --help` (custom `+commands`) | 18 / 18 commands |

Regenerating replaces the block between `<!-- docgen:cli:start -->` and
`<!-- docgen:cli:end -->` in place; everything outside it is untouched. For subcommands with
their own flags, run `readme` per subcommand (`--cmd "tool sub --help"`) and keep each in its
own section.

**Completion criterion:** the README's options table matches `--help` (step 6 proves it).

---

### 4. Generate the man page

```bash
python3 $D man --cmd "tool --help" --name tool --section 1 --version 1.4.0 \
    --examples docs/man-examples.txt --out man/tool.1
groff -man -Tutf8 -ww man/tool.1 >/dev/null     # must print no warnings
MANWIDTH=80 man -l man/tool.1                   # preview
```

The page has NAME, SYNOPSIS, DESCRIPTION (with paragraphs), ARGUMENTS, OPTIONS, COMMANDS,
ENVIRONMENT (from env vars found in the help), EXAMPLES (from `--examples`, shown verbatim)
and EXIT STATUS. Text is escaped for roff: hyphens become `\-` and Unicode becomes roff
escapes, so pages are valid without a preprocessor. Generated pages for `rg`, `fd`,
`cyberterm` and the demo all passed `groff -ww` with zero warnings.

Conventions:
- Sections: **1** user commands, **5** file formats (a config file page, `tool.toml(5)`),
  **8** admin and daemon commands.
- Edit EXIT STATUS to the program's real codes; the generator writes a generic line.
- Install through the package (`/usr/share/man/man1/`), or per user
  (`~/.local/share/man/man1/`, then `mandb -u` or just `man tool`). AUR and Debian packages
  compress pages themselves.
- Generate the page in the build or CI, not by hand, so it never drifts.

**Completion criterion:** `groff -ww` reports nothing, and `man -l` shows every option.

---

### 5. Generate the configuration reference

The comment directly above each key in the example config **is** its documentation. Write
those comments once, and generate the table:

```bash
python3 $D config config.example.toml                                   # preview + undocumented keys
python3 $D config config.example.toml --readme README.md --write        # docgen:config markers
python3 $D config settings.json --title "Settings"                      # JSON works too (no comments)
```

From Cyberterm's real `+default-config` (221 lines), it produced all **66 of 66** keys
(matching `tomllib`), with dotted table paths (`font.size`), types, defaults exactly as
written, and descriptions from the comments. The file's header comment was correctly not
attached to the first key, and it reported the **28 keys that had no comment**:

```
| `font.size` | float | `9.0` | Points, like Ghostty/Kitty/Alacritty. Ctrl+= / Ctrl+- / Ctrl+0 zoom live. |
66 keys; 28 without a comment: font.family, window.width, window.height, …
```

- Make a program that can print its own default config (`tool --print-default-config`) the
  source, and generate the example file from it, so code, example and docs share one origin.
- Fix the "without a comment" list by adding comments to the source, not to the README.
- Multi-line arrays and inline tables are rendered from the parsed value.

**Completion criterion:** every key appears with its default, and every key has a description.

---

### 6. Check for drift (run in CI)

```bash
python3 $D check --cmd "tool --help" --readme README.md --man man/tool.1   # exit 1 on drift
```

- **MISSING:** a long flag in `--help` that the docs don't mention.
- **STALE:** a flag in the docs (inside the `docgen:cli` block if present, otherwise the
  whole file) that no option or mention in `--help` supports, such as a renamed or removed
  flag. Flags the help mentions only in prose or alias lists (`--no-hidden`, aliases) count
  as live.
- Man pages are read with roff escapes removed (`\fB`, `\-`).

Real runs:
- Freshly generated docs for `fd`, `rg` and the demo passed with 0 problems.
- After adding `--strict` and removing `--delimiter` from the demo, `check` reported 4
  problems (missing and stale, in both the README and the man page), back to 0 after
  regenerating.
- Renaming a flag shows as one MISSING plus one STALE.

**Completion criterion:** `check` exits 0 in CI on every change to flags or docs.

---

### 7. Verify

- Run the quickstart and every example in a clean environment (temp `HOME`, fresh container)
  and compare the output to what the README shows.
- `groff -man -Tutf8 -ww` silent; `man -l` reviewed by eye once.
- `check` exits 0; `config` reports no undocumented keys.
- Links in the README resolve; the version in the man page matches the release.

#### Final checklist

- [ ] Pitch, install and quickstart fit on one screen, and every command was run.
- [ ] Usage and options generated from `--help` (or a native generator).
- [ ] Man page generated, lint-clean, with real exit codes and examples.
- [ ] Config reference generated from the commented example config; every key described.
- [ ] Drift check in CI.
- [ ] No invented flags, output or platforms.

**Completion criterion:** every checklist item checked.

---

## Reference

### Script commands

| Command | Does | Writes? |
|---|---|---|
| `parse --cmd C` | Parsed model as JSON | No |
| `man --cmd C --name N [--section S] [--version V] [--examples F] [--out F]` | roff man page | `--out` file |
| `readme --cmd C [--readme F] [--write]` | Usage, arguments, options, commands, env tables | Only with `--write` |
| `config FILE [--readme F] [--write] [--title T]` | Config reference from TOML or JSON | Only with `--write` |
| `check --cmd C [--readme F] [--man F]` | Drift between `--help` and docs | No |

Exit codes: 0 ok · 1 drift found · 2 bad usage, unreadable help, or invalid TOML/JSON.

### Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Options table typed by hand | Stale after the next flag change | Generate it; `check` in CI |
| Quickstart never run | The first thing users try fails | Run it in a clean environment |
| README as a feature brochure | The reader can't find how to start | Pitch, install and quickstart first |
| Config documented only in the README | Comments and docs disagree | Comments in the example config are the source |
| Man page written in Markdown and never converted | No `man tool` | Generate roff |
| Defaults stated in docs differently from code | Silent behaviour surprises | Print defaults from the program |
