#!/usr/bin/env python3
"""Lint CSS for animation and transition performance and accessibility.

    python3 css_motion_lint.py <file-or-dir> [...]      (scans .css/.scss/.astro/.vue/.svelte/.html)

ERROR  (exit 1)
  - transition/animation of layout properties (width, height, top/left/right/bottom, margin,
    padding, inset, border-width, font-size, grid-template-*, gap, flex-basis): forces layout every frame
  - any transition/animation in the file set but no `prefers-reduced-motion` block anywhere
WARN
  - `transition: all` / `transition-property: all` (animates layout props by accident)
  - transition/animation of paint-heavy properties (box-shadow, filter, backdrop-filter, clip-path)
  - will-change on `*`, on more than 5 selectors, or with layout properties
  - infinite animations (must stop under reduced motion; keep them small)
  - hover/focus transitions longer than 400ms (feel sluggish)
Compositor-friendly (no finding): transform, opacity, translate, scale, rotate.
Standard library only; a light parser, not a full CSS engine (embedded <style> blocks are scanned).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

LAYOUT = {"width", "height", "min-width", "max-width", "min-height", "max-height", "top", "left",
          "right", "bottom", "inset", "inset-inline", "inset-block", "margin", "margin-top",
          "margin-bottom", "margin-left", "margin-right", "margin-inline", "margin-block", "padding",
          "padding-top", "padding-bottom", "padding-left", "padding-right", "padding-inline",
          "padding-block", "border-width", "font-size", "line-height", "letter-spacing",
          "grid-template-columns", "grid-template-rows", "gap", "row-gap", "column-gap", "flex-basis",
          "flex", "flex-grow", "inline-size", "block-size"}
PAINT = {"box-shadow", "filter", "backdrop-filter", "clip-path", "text-shadow", "mask", "outline-offset"}
EXTS = {".css", ".scss", ".astro", ".vue", ".svelte", ".html", ".htm"}
TIME = re.compile(r"(?<![\w.-])(\d*\.?\d+)(ms|s)\b")


def css_text(path: Path) -> str:
    text = path.read_text(encoding="utf-8", errors="ignore")
    if path.suffix in {".css", ".scss"}:
        return text
    # Keep only <style> contents but preserve newlines everywhere, so line numbers match the file
    out, pos = [], 0
    for m in re.finditer(r"(<style[^>]*>)(.*?)</style>", text, re.S | re.I):
        out.append(re.sub(r"[^\n]", " ", text[pos:m.start(2)]))
        out.append(m.group(2))
        pos = m.end(2)
    out.append(re.sub(r"[^\n]", " ", text[pos:]))
    return "".join(out)


def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group(0).count("\n"), css, flags=re.S)


def walk(css: str):
    """Yield (context_stack, prop, value, line) for every declaration."""
    stack, buf, line, start_line = [], "", 1, 1
    for ch in css:
        if ch == "\n":
            line += 1
        if ch == "{":
            stack.append(buf.strip())
            buf, start_line = "", line
        elif ch == "}":
            yield from decls(stack, buf, start_line)
            if stack:
                stack.pop()
            buf, start_line = "", line
        elif ch == ";":
            yield from decls(stack, buf + ";", start_line)
            buf, start_line = "", line
        else:
            if not buf.strip():
                start_line = line
            buf += ch


def decls(stack, chunk: str, line: int):
    for part in chunk.split(";"):
        if ":" in part and stack:
            prop, _, val = part.partition(":")
            prop = prop.strip().lower()
            if re.fullmatch(r"-?-?[a-z-]+", prop):
                yield list(stack), prop, val.strip(), line


def transition_props(value: str) -> list[str]:
    props = []
    for seg in value.split(","):
        words = seg.split()
        if words and not TIME.fullmatch(words[0]):
            props.append(words[0].lower())
    return props


def lint(files: list[Path]) -> int:
    findings, any_motion, has_reduced = [], False, False
    reduced_stops_animation = False
    keyframe_props: dict[str, set[str]] = {}
    will_change_selectors = []
    infinite = []
    for f in files:
        css = strip_comments(css_text(f))
        if "prefers-reduced-motion" in css:
            has_reduced = True
        for ctx, prop, val, line in walk(css):
            where = f"{f}:{line}"
            sel = ctx[-1] if ctx else ""
            kf = next((c for c in ctx if c.startswith("@keyframes") or c.startswith("@-webkit-keyframes")), None)
            in_reduced = any("prefers-reduced-motion" in c for c in ctx)
            if in_reduced and prop.startswith("animation"):
                reduced_stops_animation = True
            if kf:
                name = kf.split()[-1]
                keyframe_props.setdefault(name, set()).add(prop)
                if prop in LAYOUT:
                    findings.append(("ERROR", where, f"@keyframes {name} animates layout property '{prop}'; use transform"))
                elif prop in PAINT:
                    findings.append(("WARN", where, f"@keyframes {name} animates paint-heavy '{prop}'; animate opacity of a pseudo-element instead"))
                continue
            if prop in ("transition", "transition-property"):
                if in_reduced:
                    continue
                any_motion = True
                tp = transition_props(val) if prop == "transition" else [p.strip().lower() for p in val.split(",")]
                for p in tp:
                    if p == "all":
                        findings.append(("WARN", where, f"'{sel}': transition 'all' also animates layout properties; list the properties"))
                    elif p in LAYOUT:
                        findings.append(("ERROR", where, f"'{sel}': transitions layout property '{p}'; use transform/opacity (or grid-template-rows 0fr→1fr only if unavoidable)"))
                    elif p in PAINT:
                        findings.append(("WARN", where, f"'{sel}': transitions paint-heavy '{p}'"))
                if re.search(r":(hover|focus)", sel):
                    for num, unit in TIME.findall(val):
                        ms = float(num) * (1000 if unit == "s" else 1)
                        if ms > 400:
                            findings.append(("WARN", where, f"'{sel}': {ms:.0f}ms hover/focus transition feels sluggish (aim 120–250ms)"))
                            break
            elif prop in ("animation", "animation-name") and not in_reduced and val.lower() not in ("none", "unset", "initial"):
                any_motion = True
                if "infinite" in val.lower():
                    infinite.append((where, sel))
            elif prop == "animation-iteration-count" and "infinite" in val.lower() and not in_reduced:
                infinite.append((where, sel))
            elif prop == "will-change":
                will_change_selectors.append((where, sel, val))
                if sel.strip() == "*" or sel.strip().endswith(" *"):
                    findings.append(("WARN", where, "will-change on '*' creates layers for every element (memory); scope it"))
                if any(v.strip() in LAYOUT for v in val.split(",")):
                    findings.append(("WARN", where, f"will-change with layout property ({val}) cannot be composited"))
    if len(will_change_selectors) > 5:
        findings.append(("WARN", will_change_selectors[0][0], f"will-change used on {len(will_change_selectors)} selectors; reserve it for elements about to animate"))
    if not reduced_stops_animation:
        for where, sel in infinite:
            findings.append(("WARN", where, f"'{sel}': infinite animation and no reduced-motion rule that stops animations"))
    if any_motion and not has_reduced:
        findings.append(("ERROR", str(files[0]) if len(files) == 1 else "(all files)",
                         "transitions/animations found but no @media (prefers-reduced-motion) block"))
    order = {"ERROR": 0, "WARN": 1}
    findings = list(dict.fromkeys(findings))  # drop duplicates (e.g. from/to keyframe steps)
    for sev, where, msg in sorted(findings, key=lambda x: (order[x[0]], x[1])):
        print(f"{sev:<6} {where}: {msg}")
    errors = sum(1 for f in findings if f[0] == "ERROR")
    warns = len(findings) - errors
    print(f"\n{len(files)} file(s): {errors} error(s), {warns} warning(s)")
    return 1 if errors else 0


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    files = []
    for a in argv[1:]:
        p = Path(a)
        if p.is_dir():
            files += sorted(x for x in p.rglob("*") if x.suffix in EXTS and "node_modules" not in x.parts and x.is_file())
        elif p.is_file():
            files.append(p)
        else:
            print(f"not found: {a}", file=sys.stderr)
            return 2
    if not files:
        print("no CSS-bearing files found", file=sys.stderr)
        return 2
    return lint(files)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
