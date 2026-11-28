#!/usr/bin/env python3
"""Generate man pages, README usage sections and config references from a CLI's real --help.

  parse   --cmd "tool --help"                       Print the parsed model as JSON
  man     --cmd "tool --help" --name tool [--section 1] [--version 1.2.0] [--examples FILE]
          [--out tool.1]                            roff man page (lint it with groff/mandoc)
  readme  --cmd "tool --help" [--readme README.md] [--write]
                                                    Usage + options/commands tables between
                                                    <!-- docgen:cli:start/end --> markers
  config  <file.toml|file.json> [--readme README.md] [--write] [--title "Configuration"]
                                                    Key / default / description table from a
                                                    commented example config, between
                                                    <!-- docgen:config:start/end --> markers
  check   --cmd "tool --help" [--readme README.md] [--man tool.1]
                                                    Drift: flags in --help missing from the docs,
                                                    or documented flags that no longer exist

Parses clap (short and long help), argparse, click, cobra and commander layouts, and
"prog <subcommand> … description" lines. Exit: 0 ok, 1 drift/problem, 2 bad usage.
Standard library only (Python 3.11+ for TOML).
"""
from __future__ import annotations

import datetime as dt
import json
import re
import shlex
import subprocess
import sys
import tomllib
from pathlib import Path

SECTION_RX = re.compile(r"^([A-Za-z][A-Za-z0-9 ()/_-]*):\s*$")
ENV_RX = re.compile(r"\[env:\s*([A-Z][A-Z0-9_]*)=?[^\]]*\]|\$([A-Z][A-Z0-9_]{2,})\b|\benv(?:ironment)? var(?:iable)?\s+`?([A-Z][A-Z0-9_]{2,})")


# ---------------- parsing ----------------
def get_help(cmd: str) -> str:
    r = subprocess.run(shlex.split(cmd), capture_output=True, text=True, timeout=30)
    out = r.stdout if r.stdout.strip() else r.stderr
    if not out.strip():
        raise RuntimeError(f"no help output from: {cmd}")
    return re.sub(r"\x1b\[[0-9;]*m", "", out)  # strip colours


def split_spec(spec: str):
    """'-o, --output <FILE>' -> (['-o', '--output'], 'FILE')"""
    flags, metavar = [], ""
    for part in re.split(r",\s*|\s+(?=-)", spec.strip()):
        part = part.strip()
        m = re.match(r"^(--[A-Za-z0-9][\w.-]*|-[^\s,=<\[-])(?:\[?[= ]?[<\[]?([A-Za-z][\w.|-]*)[>\]]*\]?)?(\.\.\.)?$", part)
        if m:
            flags.append(m.group(1))
            if m.group(2) and not metavar:
                metavar = m.group(2) + (m.group(3) or "")
        elif part and not metavar and flags:
            metavar = part.strip("<>[]")
    return flags, metavar


def parse_help(text: str, prog_hint: str = "") -> dict:
    lines = text.splitlines()
    model = {"usage": "", "description": [], "options": [], "arguments": [], "commands": [], "env": []}
    section, entry, entry_indent, desc_lines = None, None, 0, []
    section_base = None
    usage_next = False
    seen_section = False
    prog = prog_hint

    def flush():
        nonlocal entry
        if entry is not None:
            desc = " ".join(" ".join(desc_lines).split())
            entry["description"] = (entry.get("description", "") + " " + desc).strip()
            model[{"options": "options", "arguments": "arguments", "commands": "commands"}[entry.pop("_kind")]].append(entry)
        entry = None
        desc_lines.clear()

    for i, raw in enumerate(lines):
        line = raw.rstrip()
        if usage_next and line.strip():           # "USAGE:" on its own line, usage indented below
            model["usage"], usage_next = line.strip(), False
            prog = prog or model["usage"].split()[0]
            continue
        um = re.match(r"^\s*usage:\s*(.*)$", line, re.I)
        if um:
            flush()
            model["usage"] = um.group(1).strip()
            usage_next = not model["usage"]
            if model["usage"]:
                prog = prog or model["usage"].split()[0]
            section = None
            continue
        sm = SECTION_RX.match(line)
        if sm and not line.startswith(" "):
            flush()
            name = sm.group(1).lower()
            # Unrecognised headings ("OUTPUT MODES:", "OTHER BEHAVIORS:") are treated as options;
            # only lines that actually parse as flags become entries there.
            section = ("commands" if "command" in name else
                       "arguments" if ("argument" in name or "positional" in name) else
                       None if name in ("examples", "example", "see also", "notes", "note") else "options")
            seen_section = True
            section_base = None
            continue
        if not line.strip():
            # Blank lines don't end an entry: long help puts paragraphs and examples under one
            # option. A new entry, a section header or a less-indented line ends it instead.
            if not seen_section and model["description"] and model["description"][-1] != "":
                model["description"].append("")      # paragraph break in the top description
            continue
        indent = len(line) - len(line.lstrip())
        stripped = line.strip()
        # prog-style command lines: "  tool +sub <arg>   description"
        if prog and indent and stripped.split()[0] == prog and re.search(r"\S\s{2,}\S", stripped):
            flush()
            spec, desc = re.split(r"\s{2,}", stripped, maxsplit=1)
            model["commands"].append({"name": spec[len(prog):].strip() or prog, "description": desc.strip()})
            continue
        if section and indent and section_base is None:
            section_base = indent
        # Entry lines sit at the section's base indent, or up to 4 deeper (clap/cobra indent
        # long-only flags by 6 when others are at 2); descriptions in long help sit ~8 deeper.
        near_base = section_base is not None and indent <= section_base + 4
        if section and indent and (entry is None or indent <= entry_indent or near_base):
            parts = re.split(r"\s{2,}", stripped, maxsplit=1)
            spec, desc = parts[0], (parts[1] if len(parts) > 1 else "")
            if section == "options" and spec.startswith("-"):
                flags, metavar = split_spec(spec)
                if flags:                              # a real option line, not a "- bullet" in prose
                    flush()
                    entry = {"_kind": "options", "flags": flags, "metavar": metavar, "description": desc}
                    entry_indent = indent
                    continue
            if section in ("arguments", "commands"):
                flush()
                entry = {"_kind": section, "name": spec, "description": desc}
                entry_indent = indent
                continue
        if entry is not None and indent > entry_indent:
            desc_lines.append(stripped)
            continue
        if not seen_section and not model["usage"] and not indent:
            model["description"].append(stripped)
        elif not seen_section and model["usage"] and not indent and not section:
            model["description"].append(stripped)
    flush()
    # Paragraphs (joined lines), without a leading "name version" banner
    paras, cur = [], []
    for d in model["description"] + [""]:
        if d == "":
            if cur:
                paras.append(" ".join(cur))
            cur = []
        elif not re.fullmatch(r"[\w.-]+ v?\d+[\w.+-]*", d):
            cur.append(d)
    model["description"] = paras
    env = []
    for o in model["options"] + model["arguments"]:
        for m in ENV_RX.finditer(o["description"]):
            v = next(g for g in m.groups() if g)
            if v not in env:
                env.append(v)
    model["env"] = env
    model["prog"] = prog
    # every long flag the help mentions anywhere (aliases, negations like --no-hidden in prose)
    model["mentioned"] = sorted(set(re.findall(r"(?<![\w-])--[a-z][\w-]*", text)))
    return model


# ---------------- rendering ----------------
ROFF_CHARS = {"\u2026": "\\&...", "\u2014": "\\(em", "\u2013": "\\(en", "\u2018": "\\(oq", "\u2019": "\\(cq",
              "\u201c": "\\(lq", "\u201d": "\\(rq", "\u2192": "\\(->", "\u2190": "\\(<-", "\u00d7": "\\(mu", "\u00a0": "\\ "}


def roff(s: str) -> str:
    s = s.replace("\\", "\\e").replace("-", "\\-")
    # Non-ASCII as roff escapes, so the page is valid without a preprocessor (groff, mandoc)
    s = "".join(ch if ord(ch) < 128 else ROFF_CHARS.get(ch, f"\\[u{ord(ch):04X}]") for ch in s)
    return re.sub(r"^([.'])", r"\\&\1", s, flags=re.M)


def render_man(m: dict, name: str, section: str, version: str, examples: str) -> str:
    today = dt.date.today().isoformat()
    oneline = (m["description"][0] if m["description"] else f"{name} command").rstrip(".")
    if oneline[:1].isupper() and not oneline[:2].isupper():   # "A program…" -> "a program…" (man NAME style)
        oneline = oneline[0].lower() + oneline[1:]
    source = f"{name} {version}".strip()
    out = [f'.TH "{name.upper()}" "{section}" "{today}" "{roff(source)}" "User Commands"',
           ".SH NAME", f"{roff(name)} \\- {roff(oneline)}",
           ".SH SYNOPSIS", f".B {roff(m['usage'] or name)}"]
    if m["description"]:
        out.append(".SH DESCRIPTION")
        for i, para in enumerate(m["description"]):
            out += ([".PP"] if i else []) + [roff(para)]
    if m["arguments"]:
        out.append(".SH ARGUMENTS")
        for a in m["arguments"]:
            out += [".TP", f".I {roff(a['name'].strip('<>[].'))}", roff(a["description"] or "")]
    if m["options"]:
        out.append(".SH OPTIONS")
        for o in m["options"]:
            flags = ", ".join(f"\\fB{roff(f)}\\fR" for f in o["flags"])
            meta = f" \\fI{roff(o['metavar'])}\\fR" if o["metavar"] else ""
            out += [".TP", flags + meta, roff(o["description"] or "")]
    if m["commands"]:
        out.append(".SH COMMANDS")
        for c in m["commands"]:
            out += [".TP", f".B {roff(c['name'])}", roff(c["description"] or "")]
    if m["env"]:
        out.append(".SH ENVIRONMENT")
        for e in m["env"]:
            out += [".TP", f".B {e}", "See the option that mentions it above."]
    if examples:
        out += [".SH EXAMPLES", ".nf", roff(examples.rstrip()), ".fi"]
    out += [".SH EXIT STATUS", "0 on success, non\\-zero on failure (see the project documentation for specific codes)."]
    return "\n".join(out) + "\n"


def md_escape(s: str) -> str:
    return s.replace("|", "\\|")


def render_readme(m: dict) -> str:
    parts = ["## Usage", "", "```", m["usage"] or m.get("prog", ""), "```", ""]
    if m["arguments"]:
        parts += ["### Arguments", "", "| Argument | Description |", "|---|---|"]
        parts += [f"| `{md_escape(a['name'])}` | {md_escape(a['description'])} |" for a in m["arguments"]] + [""]
    if m["options"]:
        parts += ["### Options", "", "| Option | Value | Description |", "|---|---|---|"]
        for o in m["options"]:
            fl = ", ".join(f"`{f}`" for f in o["flags"])
            value = f"`{o['metavar']}`" if o["metavar"] else ""
            parts.append(f"| {fl} | {value} | {md_escape(o['description'])} |")
        parts.append("")
    if m["commands"]:
        parts += ["### Commands", "", "| Command | Description |", "|---|---|"]
        parts += [f"| `{md_escape(c['name'])}` | {md_escape(c['description'])} |" for c in m["commands"]] + [""]
    if m["env"]:
        parts += ["### Environment", "", *[f"- `{e}`" for e in m["env"]], ""]
    return "\n".join(parts).rstrip() + "\n"


def insert_block(path: Path, tag: str, block: str, title: str | None = None) -> str:
    start, end = f"<!-- docgen:{tag}:start -->", f"<!-- docgen:{tag}:end -->"
    wrapped = f"{start}\n<!-- generated by docgen.py; edit the source (CLI flags / config file), then regenerate -->\n{block}{end}"
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    if start in text and end in text:
        return re.sub(re.escape(start) + r".*?" + re.escape(end), lambda _: wrapped, text, flags=re.S)
    return text.rstrip() + ("\n\n" if text else "") + wrapped + "\n"


# ---------------- config reference ----------------
def config_rows(path: Path):
    text = path.read_text(encoding="utf-8")
    rows = []
    if path.suffix == ".json":
        def walk(obj, prefix=""):
            for k, v in obj.items():
                key = f"{prefix}.{k}" if prefix else k
                if isinstance(v, dict):
                    walk(v, key)
                else:
                    typ = {bool: "bool", int: "integer", float: "float", str: "string", list: "array"}.get(type(v), "null")
                    rows.append((key, typ, json.dumps(v), ""))
        walk(json.loads(text))
        return rows
    data = tomllib.loads(text)  # validates the file
    table, comments = "", []
    for line in text.splitlines():
        s = line.strip()
        if not s:
            comments = []
            continue
        if s.startswith("#"):
            comments.append(s.lstrip("#").strip())
            continue
        tm = re.match(r"^\[\[?\s*([^\]]+?)\s*\]\]?$", s)
        if tm:
            table, comments = tm.group(1), []
            continue
        km = re.match(r'^("?[\w.-]+"?)\s*=\s*(.+?)\s*(#.*)?$', s)
        if km:
            key = f"{table}.{km.group(1).strip(chr(34))}" if table else km.group(1).strip('"')
            val = km.group(2)
            node = data
            for p in key.split("."):
                node = node.get(p, {}) if isinstance(node, dict) else {}
            typ = {bool: "bool", int: "integer", float: "float", str: "string", list: "array", dict: "table"}.get(type(node), "")
            if val.count("[") > val.count("]") or val.count("{") > val.count("}"):   # multi-line value
                val = json.dumps(node, ensure_ascii=False)
            desc = " ".join(comments + ([km.group(3).lstrip("#").strip()] if km.group(3) else []))
            rows.append((key, typ, val, desc))
            comments = []
    return rows


def render_config(rows, title: str, source: str) -> str:
    out = [f"## {title}", "", f"Generated from `{source}`. Every key is listed with its default.", "",
           "| Key | Type | Default | Description |", "|---|---|---|---|"]
    for k, t, v, d in rows:
        out.append(f"| `{k}` | {t} | `{md_escape(v)}` | {md_escape(d)} |")
    return "\n".join(out) + "\n"


# ---------------- commands ----------------
def opts(argv):
    pos, o, i = [], {}, 0
    while i < len(argv):
        if argv[i].startswith("--"):
            if i + 1 < len(argv) and not argv[i + 1].startswith("--"):
                o[argv[i][2:]] = argv[i + 1]
                i += 2
                continue
            o[argv[i][2:]] = True
        else:
            pos.append(argv[i])
        i += 1
    return pos, o


def load_model(o) -> dict:
    if not o.get("cmd"):
        raise ValueError("--cmd \"tool --help\" is required")
    cmd = str(o["cmd"])
    return parse_help(get_help(cmd), Path(shlex.split(cmd)[0]).name)


def main(argv) -> int:
    if len(argv) < 2 or argv[1] not in ("parse", "man", "readme", "config", "check"):
        print(__doc__.strip(), file=sys.stderr)
        return 2
    pos, o = opts(argv[2:])
    try:
        if argv[1] == "parse":
            print(json.dumps(load_model(o), indent=2))
            return 0
        if argv[1] == "man":
            m = load_model(o)
            name = str(o.get("name", m.get("prog") or "tool"))
            ex = Path(str(o["examples"])).read_text(encoding="utf-8") if o.get("examples") else ""
            page = render_man(m, name, str(o.get("section", "1")), str(o.get("version", "")), ex)
            if o.get("out"):
                Path(str(o["out"])).write_text(page, encoding="utf-8")
                print(f"wrote {o['out']}: {len(m['options'])} options, {len(m['arguments'])} arguments, "
                      f"{len(m['commands'])} commands; check: groff -man -Tutf8 -ww {o['out']} >/dev/null")
            else:
                sys.stdout.write(page)
            return 0
        if argv[1] == "readme":
            m = load_model(o)
            block = render_readme(m)
            if o.get("write"):
                p = Path(str(o.get("readme", "README.md")))
                p.write_text(insert_block(p, "cli", block), encoding="utf-8")
                print(f"updated {p} (between docgen:cli markers)")
            else:
                sys.stdout.write(block)
                print("\n(dry run; add --write to update the README between markers)")
            return 0
        if argv[1] == "config":
            if len(pos) != 1:
                raise ValueError("usage: config <file.toml|file.json>")
            src = Path(pos[0])
            rows = config_rows(src)
            block = render_config(rows, str(o.get("title", "Configuration")), src.name)
            if o.get("write"):
                p = Path(str(o.get("readme", "README.md")))
                p.write_text(insert_block(p, "config", block), encoding="utf-8")
                print(f"updated {p}: {len(rows)} keys")
            else:
                sys.stdout.write(block)
                undoc = [r[0] for r in rows if not r[3]]
                print(f"\n{len(rows)} keys; {len(undoc)} without a comment" + (f": {', '.join(undoc[:8])}" if undoc else ""))
            return 0
        if argv[1] == "check":
            m = load_model(o)
            live = {f for opt in m["options"] for f in opt["flags"] if f.startswith("--")}
            problems = 0
            for label, key in (("README", "readme"), ("man page", "man")):
                if not o.get(key):
                    continue
                text = Path(str(o[key])).read_text(encoding="utf-8")
                text = re.sub(r"\\f(\[[^\]]*\]|\(..|.)", "", text)   # roff font switches like \fB … \fR
                text = text.replace("\\-", "-").replace("\\e", "\\")
                block = re.search(r"<!-- docgen:cli:start -->(.*?)<!-- docgen:cli:end -->", text, re.S)
                scope = block.group(1) if block else text
                documented = set(re.findall(r"(?<![\w-])--[a-z][\w-]*", scope))
                missing = sorted(live - documented)
                stale = sorted(documented - live - set(m["mentioned"]) - {"--help", "--version"})
                for f in missing:
                    print(f"MISSING in {label}: {f}")
                for f in stale:
                    print(f"STALE in {label}: {f} (documented but not in --help)")
                problems += len(missing) + len(stale)
            print(f"\n{len(live)} long flag(s) in --help; {problems} drift problem(s)")
            return 1 if problems else 0
    except (RuntimeError, ValueError, FileNotFoundError, tomllib.TOMLDecodeError, subprocess.TimeoutExpired) as exc:
        print(exc, file=sys.stderr)
        return 2
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
