#!/usr/bin/env python3
"""Extract hard-coded colours, spacing and radii into semantic tokens; build TOML themes.

  scan    <paths...>                         Report literals by category, usage and near-duplicates
  extract <paths...> --toml theme.toml [--css tokens.css] [--name default] [--merge 0.02]
                                             Propose tokens (TOML is the editable source of truth)
  apply   <paths...> --toml theme.toml [--write]
                                             Replace literals matching a token with var(--token).
                                             Dry run prints a diff; --write edits files (keeps .bak)
  build   <theme.toml...> --out themes.css [--default NAME]
                                             TOML themes -> :root + [data-theme="name"] CSS;
                                             fails if themes don't define the same tokens

Scans .css .scss .less .astro .vue .svelte .html .jsx .tsx (style blocks and inline styles).
Exit: 0 ok, 1 problem (build key mismatch), 2 bad usage. Standard library only (Python 3.11+).
"""
from __future__ import annotations

import difflib
import math
import re
import shutil
import sys
import tomllib
from collections import Counter, defaultdict
from pathlib import Path

EXTS = {".css", ".scss", ".less", ".astro", ".vue", ".svelte", ".html", ".htm", ".jsx", ".tsx"}
COLOR_RX = re.compile(r"#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?)\([^)]*\)")
LEN_RX = re.compile(r"(?<![\w.#-])(-?\d*\.?\d+)(px|rem)\b")
DECL_RX = re.compile(r"([a-zA-Z-]+)\s*:\s*([^;{}]+)")
SPACE_PROPS = re.compile(r"^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left)(-|$)")
ROLE = [(re.compile(r"^(background|fill)"), "bg"), (re.compile(r"^(color|caret-color|-webkit-text-fill)"), "text"),
        (re.compile(r"^(border|outline|stroke|column-rule)"), "border"), (re.compile(r"shadow"), "shadow")]


# ---------- colour normalisation ----------
def hsl_to_rgb(h, s, l):
    s, l = s / 100, l / 100
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(h % 360 // 60)]
    return [round((v + m) * 255) for v in (r, g, b)]


def norm_color(lit: str) -> str | None:
    s = lit.strip().lower()
    if s.startswith("#"):
        h = s[1:]
        if len(h) in (3, 4):
            h = "".join(c * 2 for c in h)
        if len(h) == 8 and h.endswith("ff"):
            h = h[:6]
        return "#" + h
    nums = re.findall(r"-?\d*\.?\d+%?", s)
    if len(nums) < 3:
        return None
    alpha = 1.0
    if len(nums) >= 4:
        a = nums[3]
        alpha = float(a[:-1]) / 100 if a.endswith("%") else float(a)
    if s.startswith("rgb"):
        rgb = [round(float(n[:-1]) * 2.55) if n.endswith("%") else round(float(n)) for n in nums[:3]]
    else:
        rgb = hsl_to_rgb(float(nums[0]), float(nums[1].rstrip("%")), float(nums[2].rstrip("%")))
    rgb = [min(max(v, 0), 255) for v in rgb]
    out = "#{:02x}{:02x}{:02x}".format(*rgb)
    return out if alpha >= 1 else out + f"{round(alpha * 255):02x}"


def oklab(hex_: str):
    h = hex_[1:7]
    lin = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        lin.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = lin
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)


def dist(a: str, b: str) -> float:
    if len(a) != len(b):  # different alpha -> never merge
        return 9.0
    return math.dist(oklab(a), oklab(b))


def lightness(hex_: str) -> float:
    return oklab(hex_)[0]


# ---------- scanning ----------
def files_in(paths: list[str]) -> list[Path]:
    out = []
    for a in paths:
        p = Path(a)
        if p.is_dir():
            out += sorted(x for x in p.rglob("*") if x.suffix in EXTS and x.is_file()
                          and not {"node_modules", "dist", "build", ".git"} & set(x.parts))
        elif p.is_file():
            out.append(p)
    return out


def scan(files: list[Path]):
    """Return list of (category, normalized, literal, prop, file, line)."""
    hits = []
    for f in files:
        text = f.read_text(encoding="utf-8", errors="ignore")
        for n, line in enumerate(text.splitlines(), 1):
            if re.match(r"\s*--[\w-]+\s*:", line):       # token definitions are not hard-coded uses
                continue
            for prop, val in DECL_RX.findall(line):
                prop = prop.lower()
                if prop.startswith("--"):                 # custom property definition, already a token
                    continue
                if "var(--" in val and not COLOR_RX.search(val.replace("var(", "")):
                    continue
                for m in COLOR_RX.finditer(val):
                    c = norm_color(m.group(0))
                    if c:
                        hits.append(("color", c, m.group(0), prop, f, n))
                if SPACE_PROPS.match(prop) or prop in ("border-radius",) or prop.endswith("-radius"):
                    cat = "radius" if "radius" in prop else "space"
                    for m in LEN_RX.finditer(val):
                        px = float(m.group(1)) * (16 if m.group(2) == "rem" else 1)
                        if px == 0:
                            continue
                        hits.append((cat, f"{px:g}px", m.group(0), prop, f, n))
    return hits


def chroma(hex_: str) -> float:
    _, a, b = oklab(hex_)
    return math.hypot(a, b)


def role_of(props: Counter, color: str) -> str:
    votes = Counter()
    for prop, cnt in props.items():
        for rx, role in ROLE:
            if rx.search(prop):
                votes[role] += cnt
                break
        else:
            votes["accent"] += cnt
    role = votes.most_common(1)[0][0]
    # A vivid colour is an accent even when used as a background, border or text (buttons, links)
    if role != "shadow" and len(color) == 7 and chroma(color) > 0.1:
        return "accent"
    return role


def build_tokens(hits, merge: float):
    colors = Counter(h[1] for h in hits if h[0] == "color")
    props = defaultdict(Counter)
    for h in hits:
        if h[0] == "color":
            props[h[1]][h[3]] += 1
    # merge near-duplicates into the most used colour
    canon, alias = [], {}
    for c, _ in colors.most_common():
        target = next((k for k in canon if dist(c, k) < merge), None)
        if target:
            alias[c] = target
        else:
            canon.append(c)
            alias[c] = c
    groups = defaultdict(list)
    for c in canon:
        merged_props = Counter()
        for src, tgt in alias.items():
            if tgt == c:
                merged_props.update(props[src])
        groups[role_of(merged_props, c)].append(c)
    color_tokens = {}
    for role, cs in groups.items():
        # bg: darkest first; text: lightest first; others: by usage
        if role == "bg":
            cs.sort(key=lightness)
        elif role == "text":
            cs.sort(key=lightness, reverse=True)
        for i, c in enumerate(cs, 1):
            color_tokens[f"{role}-{i}"] = c
    spaces = sorted({float(h[1][:-2]) for h in hits if h[0] == "space"})
    space_tokens = {str(i): f"{v:g}px" for i, v in enumerate(spaces, 1)}
    radii = sorted({float(h[1][:-2]) for h in hits if h[0] == "radius"})
    names = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"]
    radius_tokens = {}
    for i, v in enumerate(radii):
        key = "full" if v >= 999 else (names[i] if i < len(names) else f"r{i}")
        radius_tokens[key] = f"{v:g}px"
    return {"color": color_tokens, "space": space_tokens, "radius": radius_tokens}, alias


def var_name(section: str, key: str) -> str:
    return f"--{key}" if section == "color" else f"--{section}-{key}"


# ---------- TOML / CSS output ----------
def to_toml(name: str, mode: str, tokens: dict) -> str:
    out = ["# Theme tokens. Rename keys to semantic names (bg-1 -> surface, accent-1 -> primary);",
           "# CSS variables: [color] key -> --key, [space] key -> --space-key, [radius] key -> --radius-key.",
           "[meta]", f'name = "{name}"', f'mode = "{mode}"   # dark | light (sets color-scheme)', ""]
    for section in ("color", "space", "radius"):
        out.append(f"[{section}]")
        for k, v in tokens.get(section, {}).items():
            out.append(f'"{k}" = "{v}"')
        out.append("")
    return "\n".join(out)


def css_block(selector: str, theme: dict) -> str:
    meta = theme.get("meta", {})
    lines = [f"{selector} {{"]
    if meta.get("mode") in ("dark", "light"):
        lines.append(f"  color-scheme: {meta['mode']};")
    for section in ("color", "space", "radius"):
        for k, v in theme.get(section, {}).items():
            lines.append(f"  {var_name(section, k)}: {v};")
    lines.append("}")
    return "\n".join(lines)


def load_theme(path: str) -> dict:
    with open(path, "rb") as fh:
        return tomllib.load(fh)


# ---------- commands ----------
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


def cmd_scan(pos, o) -> int:
    files = files_in(pos)
    if not files:
        print("no files to scan", file=sys.stderr)
        return 2
    hits = scan(files)
    for cat in ("color", "space", "radius"):
        c = Counter(h[1] for h in hits if h[0] == cat)
        print(f"\n{cat}: {sum(c.values())} literal(s), {len(c)} distinct")
        for val, n in c.most_common(12):
            where = next(f"{h[4]}:{h[5]}" for h in hits if h[0] == cat and h[1] == val)
            print(f"  {val:<12} x{n:<4} e.g. {where}")
    colors = list(Counter(h[1] for h in hits if h[0] == "color"))
    near = [(a, b, dist(a, b)) for i, a in enumerate(colors) for b in colors[i + 1:] if dist(a, b) < 0.02]
    if near:
        print("\nnear-duplicate colours (likely the same intent):")
        for a, b, d in near:
            print(f"  {a} ~ {b}  (ΔOKLab {d:.3f})")
    print(f"\n{len(files)} file(s) scanned")
    return 0


def cmd_extract(pos, o) -> int:
    files = files_in(pos)
    if not files or "toml" not in o:
        print("usage: extract <paths...> --toml theme.toml [--css tokens.css]", file=sys.stderr)
        return 2
    hits = scan(files)
    tokens, alias = build_tokens(hits, float(o.get("merge", 0.02)))
    bg = tokens["color"].get("bg-1")
    mode = "dark" if bg and lightness(bg) < 0.5 else "light"
    name = str(o.get("name", "default"))
    Path(str(o["toml"])).write_text(to_toml(name, mode, tokens), encoding="utf-8")
    merged = {k: v for k, v in alias.items() if k != v}
    print(f"wrote {o['toml']}: {len(tokens['color'])} colour, {len(tokens['space'])} space, "
          f"{len(tokens['radius'])} radius token(s); mode={mode}")
    for src, tgt in merged.items():
        print(f"  merged {src} into {tgt} (near-duplicate)")
    if o.get("css"):
        Path(str(o["css"])).write_text(css_block(":root", load_theme(str(o["toml"]))) + "\n", encoding="utf-8")
        print(f"wrote {o['css']}")
    print("next: rename keys to semantic names in the TOML, then run `apply`")
    return 0


def cmd_apply(pos, o) -> int:
    files = files_in(pos)
    if not files or "toml" not in o:
        print("usage: apply <paths...> --toml theme.toml [--write]", file=sys.stderr)
        return 2
    theme = load_theme(str(o["toml"]))
    lookup = {}
    for section in ("color", "space", "radius"):
        for k, v in theme.get(section, {}).items():
            key = norm_color(v) if section == "color" else v
            lookup[(section, key)] = var_name(section, k)
    changed, notes = 0, []
    merge = float(o.get("merge", 0.02))
    for f in files:
        old = f.read_text(encoding="utf-8", errors="ignore")
        new_lines = []
        for line in old.splitlines(keepends=True):
            if re.match(r"\s*--[\w-]+\s*:", line):
                new_lines.append(line)
                continue

            def fix_decl(m):
                prop, val = m.group(1).lower(), m.group(2)

                def col(cm):
                    c = norm_color(cm.group(0))
                    v = lookup.get(("color", c))
                    if not v and c:  # near-duplicate of a token (same rule extract used to merge)
                        near = [(dist(c, tv), name) for (sec, tv), name in lookup.items() if sec == "color" and tv]
                        near = [x for x in near if x[0] < merge]
                        if near:
                            v = min(near)[1]
                            notes.append(f"{f}: {cm.group(0)} -> {v} (near-duplicate, ΔOKLab {min(near)[0]:.3f})")
                    return f"var({v})" if v else cm.group(0)
                val2 = COLOR_RX.sub(col, val)
                if SPACE_PROPS.match(prop) or "radius" in prop:
                    sec = "radius" if "radius" in prop else "space"

                    def ln(lm):
                        px = float(lm.group(1)) * (16 if lm.group(2) == "rem" else 1)
                        v = lookup.get((sec, f"{px:g}px"))
                        return f"var({v})" if v else lm.group(0)
                    val2 = LEN_RX.sub(ln, val2)
                return f"{m.group(1)}: {val2}" if val2 != val else m.group(0)
            new_lines.append(DECL_RX.sub(fix_decl, line))
        new = "".join(new_lines)
        if new != old:
            changed += 1
            sys.stdout.writelines(difflib.unified_diff(old.splitlines(True), new.splitlines(True), str(f), str(f)))
            if o.get("write"):
                shutil.copy2(f, str(f) + ".bak")
                f.write_text(new, encoding="utf-8")
    for n in notes:
        print(f"note: {n}")
    verb = "rewrote" if o.get("write") else "would rewrite (dry run; add --write)"
    print(f"\n{verb} {changed} file(s)" + (" (originals saved as .bak)" if o.get("write") and changed else ""))
    return 0


def cmd_build(pos, o) -> int:
    if not pos or "out" not in o:
        print("usage: build <theme.toml...> --out themes.css [--default NAME]", file=sys.stderr)
        return 2
    themes = [(p, load_theme(p)) for p in pos]
    keysets = {p: {(s, k) for s in ("color", "space", "radius") for k in t.get(s, {})} for p, t in themes}
    union = set().union(*keysets.values())
    bad = False
    for p, ks in keysets.items():
        missing = union - ks
        if missing:
            bad = True
            print(f"{p}: missing {', '.join(var_name(s, k) for s, k in sorted(missing))}", file=sys.stderr)
    if bad:
        print("themes must define the same tokens, or swapping leaves stale values", file=sys.stderr)
        return 1
    default = o.get("default") or themes[0][1].get("meta", {}).get("name")
    blocks = []
    for p, t in themes:
        name = t.get("meta", {}).get("name", Path(p).stem)
        sel = f':root, [data-theme="{name}"]' if name == default else f'[data-theme="{name}"]'
        blocks.append(css_block(sel, t))
    Path(str(o["out"])).write_text("/* generated by tokenize.py build — edit the TOML, not this file */\n"
                                   + "\n\n".join(blocks) + "\n", encoding="utf-8")
    print(f"wrote {o['out']}: {len(themes)} theme(s), {len(union)} token(s) each, default={default}")
    return 0


def main(argv) -> int:
    cmds = {"scan": cmd_scan, "extract": cmd_extract, "apply": cmd_apply, "build": cmd_build}
    if len(argv) < 2 or argv[1] not in cmds:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    pos, o = opts(argv[2:])
    return cmds[argv[1]](pos, o)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
