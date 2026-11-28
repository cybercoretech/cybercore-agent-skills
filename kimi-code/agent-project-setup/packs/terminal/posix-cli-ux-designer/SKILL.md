---
name: posix-cli-ux-designer
description: 'Enforce consistent POSIX-compliant CLI contracts: --help output, exit codes, stdin/stdout piping, and --json machine-readable flags. Use when asked to "design CLI arguments", "standardize --help", "fix exit codes", "add pipe support", "machine-readable output", "POSIX argument conventions", "--json flag", or "audit CLI UX". Not for implementing Rust CLI parsing and config (use rust-config-and-cli).'
metadata:
  version: '1'
---
# POSIX-Compliant CLI Argument & UX Designer

Enforces a consistent, POSIX-compliant CLI contract across argument parsing, help output,
exit codes, stdio piping, and machine-readable flags — so every invocation behaves
predictably whether driven by a human, a shell script, or a CI pipeline.

> [!IMPORTANT]
> Treat the CLI surface as a **public API**. Breaking any of the contracts below
> (exit codes, flag names, output format) is a breaking change — even for internal tools.
> Design it right once; fix it and you break every caller.

---

## Steps

### 1. Audit existing CLI surface

Before adding or changing anything, inventory what already exists:

- List every subcommand, flag, and positional argument currently accepted.
- Record the current exit code for each known code path (success, error, usage fault).
- Note whether `--help` / `-h` is implemented and what it prints.
- Confirm whether the tool reads stdin and whether it writes machine-readable output.
- Identify every place the tool writes to stdout vs. stderr.

**Completion criterion:** a flat inventory table is complete, one row per flag/subcommand,
with columns: `name | type | default | description | exit-codes reachable`.
No design decisions are made in this step.

---

### 2. Standardize argument conventions

Apply all POSIX/GNU conventions uniformly. No exceptions within a single tool.

#### Flag taxonomy

| Form | Rule |
|---|---|
| Short option | Single dash + single letter: `-v`, `-o FILE`. POSIX mandates one letter only. |
| Long option | Double dash + word: `--verbose`, `--output FILE` or `--output=FILE`. GNU extension; use it. |
| Flag (boolean) | Present = true, absent = false. Never `-flag=true` or `--no-flag=false`. |
| Negation | `--no-<name>` to invert a default-true flag (e.g. `--no-color`). |
| Value option | `-o FILE` or `--output=FILE` or `--output FILE`. All three forms must work if any does. |
| Accumulation | Repeated flag accumulates: `-v -v` → verbosity 2. Use this pattern for `--verbose`. |
| Separator | `--` ends flag parsing; everything after is a positional. Always honor it. |

#### Naming rules

- Use lowercase kebab-case for all long options: `--dry-run`, `--output-format`, not `--dryRun`.
- **Universal reserved flags** — these names are owned by convention; never repurpose them:

  | Flag | Canonical meaning |
  |---|---|
  | `-h`, `--help` | Print help and exit 0 |
  | `-V`, `--version` | Print version string and exit 0 |
  | `-v`, `--verbose` | Increase verbosity (accumulating) |
  | `-q`, `--quiet` | Suppress non-error output |
  | `-n`, `--dry-run` | Simulate without side effects |
  | `--json` | Machine-readable JSON output on stdout |
  | `--color` / `--no-color` | Force / suppress ANSI color; also respect `$NO_COLOR` |
  | `-o`, `--output` | Write output to file instead of stdout |
  | `-f`, `--force` | Skip confirmation prompts |
  | `--config` | Path to config file |

- Short options beyond `-h`, `-V`, `-v`, `-q`, `-n`, `-o`, `-f` are **opt-in** — add them
  only when the flag is typed repeatedly in interactive use. Avoid `-x`, `-y`, `-z` as
  general purpose; they carry existing POSIX/shell semantics.

#### Positional arguments

- Zero or one mandatory positional per subcommand is the safe limit for discoverability.
- Two or more positionals require a clear, documented order. Prefer named flags instead.
- When a positional is optional and stdin is the alternative, document that explicitly in `--help`.

**Completion criterion:** every flag in the inventory conforms to the taxonomy and naming
rules, or has a documented exception with rationale.

---

### 3. Write compliant `--help` output

`--help` and `-h` must both trigger help and exit 0. Structure the output as follows:

#### Required sections, in order

```
USAGE
  <tool> [OPTIONS] [ARGS]
  <tool> <subcommand> [OPTIONS] [ARGS]    ← only if subcommands exist

DESCRIPTION
  One to three sentences. What the tool does, not how. No jargon.

SUBCOMMANDS                               ← omit if no subcommands
  <name>    <one-line description>

OPTIONS
  -h, --help          Show this help message and exit.
  -V, --version       Show version and exit.
  -v, --verbose       Increase output verbosity. Repeatable.
  -q, --quiet         Suppress informational output.
      --json          Emit machine-readable JSON on stdout.
      --no-color      Disable ANSI color output.
  [tool-specific options follow, alphabetical by long name]

ARGUMENTS                                 ← omit if no positionals
  <name>    <description> [default: X]

ENVIRONMENT
  NO_COLOR=1          Disable color (https://no-color.org).
  <TOOL>_CONFIG       Path to config file (overridden by --config).

EXIT CODES
  0    Success
  1    General / runtime error
  2    Usage error (bad arguments or flags)
  [tool-specific codes follow]

EXAMPLES
  $ <tool> --help
  $ <tool> --version
  [2–4 realistic examples, progressively complex]
```

#### Formatting rules

- Align option descriptions at a consistent column (typically column 20–24). Use spaces, not tabs.
- Line-wrap at **80 columns**. No line exceeds 80 characters.
- Use `<angle brackets>` for required placeholders, `[square brackets]` for optional ones.
- Never emit color codes in `--help` output — it must be pipeable to `less`, `grep`, and `man`.
- Write to **stdout**, not stderr. Help is not an error.

> [!NOTE]
> `--help` → stdout + exit 0.
> An unknown flag (`--typo`) → stderr error message + exit 2. Never print help on bad flags;
> print only "unknown option '--typo'. Try '--help' for usage."

**Completion criterion:** `--help` output passes all formatting rules, covers all required
sections, and exits 0. Run `<tool> --help | wc -L` to verify max line width ≤ 80.

---

### 4. Enforce exit codes

Every exit path must map to exactly one code. Define the full table before writing any handler.

#### Standard codes

| Code | Meaning | When to use |
|---|---|---|
| `0` | Success | Desired work completed with no errors |
| `1` | General error | Runtime failure (I/O error, assertion, unhandled exception) |
| `2` | Misuse / usage error | Unknown flag, missing required argument, invalid value type |
| `126` | Permission denied | File or command not executable (POSIX reserved) |
| `127` | Command not found | External dependency missing (POSIX reserved) |
| `130` | Interrupted | Killed by SIGINT (Ctrl-C); script convention, not set manually |

#### Tool-specific codes (3–125)

Reserve codes 3–125 for tool-specific semantics when the caller must distinguish outcomes.
Document them in `--help` and in the README. Common allocations:

| Code | Conventional meaning |
|---|---|
| `3` | No results / nothing to do (not an error, not full success) |
| `4` | Validation failed (input data invalid, not argument parsing) |
| `5` | Partial success (some items succeeded, some failed) |

#### Exit code rules

- `--version` and `--help` always exit **0**.
- `--dry-run` exits **0** if the simulation would succeed, **non-zero** if it would fail.
- Signal handlers: trap SIGINT and SIGTERM; clean up temp files; exit **130** (SIGINT) or **143** (SIGTERM).
- Never swallow exit codes from subprocesses without mapping them explicitly.
- In shell scripts, `set -e` and `set -o pipefail` are the baseline; never disable them silently.

**Completion criterion:** a complete exit-code table exists in the codebase (not only in docs),
every `exit` / `sys.exit` / `process.exit` call references a named constant, and no path
exits with an undocumented code.

---

### 5. Implement stdin / stdout piping

A tool is _pipe-friendly_ when it makes no assumption about terminal attachment. Apply all three rules:

#### 5a. Stdin detection

```bash
# Shell
if [ -t 0 ]; then   # stdin is a terminal → interactive mode
  prompt_user
else                 # stdin is a pipe / redirect → read from it
  read_stdin
fi
```

```python
# Python
import sys, os
if os.isatty(sys.stdin.fileno()):   # interactive
    ...
else:                                # piped
    data = sys.stdin.read()
```

- When stdin supplies input, `--` signals end of stdin piping in arg lists (honor it).
- Never block on stdin reads if no input is expected and `-` was not passed as a positional.

#### 5b. Stdout / stderr split

| Stream | Use for |
|---|---|
| **stdout** | All successful output the caller reads — data, results, machine-readable JSON |
| **stderr** | Progress, warnings, errors, diagnostics, spinner/interactive UI |

This split is mandatory for pipe-correctness. `grep`, `awk`, `jq`, and similar tools read
stdout; they must never see stderr noise mixed in.

#### 5c. Buffering

- Flush stdout after each logical record when writing a stream (line-buffered at minimum).
- In Python: `print(..., flush=True)` or `sys.stdout.flush()`.
- In C: `setvbuf(stdout, NULL, _IOLBF, 0)` for line-buffering.
- When stdout is not a tty (`isatty(1)` is false), disable progress bars and spinners entirely;
  they write to stderr but can confuse callers that capture both streams.

**Completion criterion:** `<tool> --version 2>/dev/null | cat` exits 0 and prints only the
version string. `<tool> [normal args] 2>/dev/null | wc -l` counts output lines without
seeing any diagnostic noise.

---

### 6. Implement `--json` machine-readable output

Every tool that produces structured output must offer `--json`. This flag makes the output
contract explicit and stable.

#### Output schema rules

- Emit a single valid JSON value to stdout: either a **JSON object** (for single results)
  or a **JSON array of objects** (for multiple results, one per line for streaming: NDJSON).
- Choose one and document it. Do not switch between object and array depending on result count.
- Schema must be **stable across versions** — adding keys is non-breaking; removing or
  renaming keys is breaking. Version the schema in a `"schema_version"` field if it may evolve.

#### Mandatory envelope (for object output)

```json
{
  "schema_version": 1,
  "ok": true,
  "data": { ... },
  "error": null
}
```

For errors, `--json` still exits non-zero but emits a parseable envelope:

```json
{
  "schema_version": 1,
  "ok": false,
  "data": null,
  "error": {
    "code": "file_not_found",
    "message": "No such file: /path/to/input.txt",
    "exit_code": 1
  }
}
```

#### `--json` behavioral rules

- `--json` suppresses all human-readable output on stdout (spinners, tables, colors).
- Warnings and progress remain on stderr (they are not part of the machine contract).
- `--json` and `--quiet` together: emit the JSON envelope only, nothing on stderr.
- `--json` and `--verbose` together: verbose diagnostics go to stderr; JSON stays clean on stdout.
- Never emit trailing commas or comments in JSON — strict JSON parsers reject them.
- When streaming (NDJSON), flush after each line.

#### NDJSON (streaming / multiple records)

```
{"schema_version":1,"ok":true,"data":{"id":1,"name":"foo"},"error":null}
{"schema_version":1,"ok":true,"data":{"id":2,"name":"bar"},"error":null}
```

One JSON object per line, newline-terminated, no wrapping array.

**Completion criterion:** `<tool> [args] --json | jq .` exits 0 on success. `<tool> [bad-args] --json | jq .ok` outputs `false` and the process exits non-zero.

---

### 7. Respect environment conventions

Honor the following environment variables unconditionally. Document each in `--help`.

| Variable | Behavior |
|---|---|
| `NO_COLOR` | If set (any value), disable all ANSI color output. See [no-color.org](https://no-color.org). |
| `CLICOLOR=0` | Disable color (BSD/macOS convention; honor alongside `NO_COLOR`). |
| `CLICOLOR_FORCE=1` | Force color even when stdout is not a tty. |
| `<TOOL>_CONFIG` | Path to config file; lower priority than `--config`. |
| `<TOOL>_LOG_LEVEL` | Sets verbosity; lower priority than `-v`/`-q`. Values: `debug`, `info`, `warn`, `error`. |
| `CI` | If set, disable interactive prompts, disable progress bars, enable structured output. |

#### Priority order (highest wins)

```
CLI flags  >  environment variables  >  config file  >  hardcoded defaults
```

Document this order in the README and in `--help` for any flag that is config-file-settable.

**Completion criterion:** `NO_COLOR=1 <tool> [args]` emits zero ANSI escape codes.
`CI=1 <tool> [interactive-args]` never blocks on a prompt.

---

### 8. Validate the full CLI contract

Run the full contract check before marking the work done.

#### Checklist

- [ ] `<tool> --help` exits 0, prints to stdout, stays within 80 columns.
- [ ] `<tool> -h` is identical to `--help`.
- [ ] `<tool> --version` exits 0, prints `<name> <semver>` and nothing else.
- [ ] `<tool> --unknown-flag` exits 2, prints one-line error to stderr, no stack trace.
- [ ] Success path exits 0.
- [ ] Every documented error path exits its documented code.
- [ ] `<tool> [args] 2>/dev/null | cat` produces clean stdout with no ANSI codes when piped.
- [ ] `NO_COLOR=1 <tool> [args]` produces zero ANSI escapes.
- [ ] `<tool> [args] --json | jq empty` exits 0 (valid JSON).
- [ ] `<tool> [bad] --json | jq .ok` outputs `false` and process exits non-zero.
- [ ] `CI=1 <tool> [args]` does not block on any prompt.
- [ ] Signal handling: `Ctrl-C` exits 130; no temp files remain.

**Completion criterion:** every checkbox is checked. Any failure resets to the step that owns
that contract surface (§2 for flags, §3 for help, §4 for exit codes, §5 for piping, §6 for JSON,
§7 for env vars).

---

## Reference

### Argument parsing libraries — quick selection

| Language | Library | Notes |
|---|---|---|
| Python | `argparse` (stdlib) | Good baseline; use `formatter_class=argparse.RawDescriptionHelpFormatter` to control help layout. |
| Python | `click` | Decorator-driven; handles stdin `-` automatically; good defaults. |
| Python | `typer` | Type-annotated; builds on click; best for complex CLIs. |
| Rust | `clap` | Derive macro API; generates help, shell completions, man pages. |
| Go | `cobra` + `pflag` | Standard Go CLI toolkit; long/short flags; subcommands. |
| Node.js | `yargs` | Full POSIX support; `--json` easy to add. |
| Bash | `getopts` (POSIX) | Short flags only; use `getopt` (GNU) for long flags. |
| C | `getopt_long` | POSIX + GNU long options. |

### Exit code quick reference

```
0    OK
1    Error (general)
2    Misuse (bad args)
3    No results
4    Validation failed
5    Partial success
126  Not executable
127  Not found
130  SIGINT (Ctrl-C)
143  SIGTERM
```

### `--help` column alignment template

```
  -h, --help              Show this help and exit.
  -V, --version           Show version and exit.
  -v, --verbose           Increase verbosity. Repeatable.
  -q, --quiet             Suppress non-error output.
  -n, --dry-run           Simulate; do not modify anything.
  -f, --force             Skip confirmation prompts.
  -o, --output FILE       Write output to FILE (default: stdout).
      --json              Machine-readable JSON output.
      --no-color          Disable ANSI color (also: NO_COLOR=1).
      --config FILE       Load config from FILE.
```

Columns: short+long option in col 2–20, description from col 24. Pad with spaces.

### Minimal POSIX shell argument parser

```bash
#!/usr/bin/env sh
set -eu

VERBOSE=0
DRY_RUN=0
JSON=0
OUTPUT=""

usage() {
  cat <<'EOF'
USAGE
  mytool [OPTIONS] <input>

OPTIONS
  -h, --help        Show this help and exit.
  -V, --version     Show version and exit.
  -v, --verbose     Increase verbosity.
  -n, --dry-run     Simulate without changes.
      --json        Machine-readable JSON output.
  -o, --output FILE Write output to FILE.

EXIT CODES
  0  Success
  1  Error
  2  Usage error
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help)    usage; exit 0 ;;
    -V|--version) echo "mytool 1.0.0"; exit 0 ;;
    -v|--verbose) VERBOSE=$((VERBOSE + 1)); shift ;;
    -n|--dry-run) DRY_RUN=1; shift ;;
    --json)       JSON=1; shift ;;
    -o|--output)  OUTPUT="$2"; shift 2 ;;
    --output=*)   OUTPUT="${1#--output=}"; shift ;;
    --)           shift; break ;;
    -*)           printf 'unknown option: %s\nTry --help.\n' "$1" >&2; exit 2 ;;
    *)            break ;;
  esac
done

# Remaining positionals in "$@"
```

### JSON envelope — copy-paste templates

**Success (Python)**
```python
import json, sys

def emit_json(data, ok=True, error=None):
    payload = {"schema_version": 1, "ok": ok, "data": data, "error": error}
    print(json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()
```

**Error (Python)**
```python
def emit_json_error(code: str, message: str, exit_code: int = 1):
    payload = {
        "schema_version": 1,
        "ok": False,
        "data": None,
        "error": {"code": code, "message": message, "exit_code": exit_code},
    }
    print(json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()
    sys.exit(exit_code)
```

> [!TIP]
> Add shell completion generation early — `--completion bash/zsh/fish` is trivial with
> `clap`, `cobra`, or `click`, and it dramatically improves adoption for power users.
> It costs one flag and zero design effort if added while the CLI surface is still being designed.

> [!WARNING]
> Never use exit code 1 for a usage error. Exit 2 is the POSIX standard for misuse.
> Callers like `make`, `xargs`, and CI systems distinguish 1 from 2. Blurring them
> forces callers to ignore exit codes entirely.
