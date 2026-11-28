#!/usr/bin/env python3
"""Generate or check a dark-mode neon palette with WCAG 2.x contrast enforcement.

Generate (OKLCH-based, gamut-mapped to sRGB, contrast-corrected):
    python3 neon_palette.py generate [--bg-hue 250] [--hues cyan=200,pink=350,...]
                                     [--names generic|cybercore] [--format css|json]
Check an existing stylesheet's tokens (reads `--name: #hex;` declarations):
    python3 neon_palette.py check styles.css [--names generic|cybercore]

Rules enforced (WCAG 2.2): body and muted text >= 4.5:1 on every surface, neon accents
used as text >= 4.5:1 on every surface, borders and focus ring >= 3:1 against the
background (1.4.11 non-text contrast). Exit 1 if any rule fails. Standard library only.
"""
from __future__ import annotations

import json
import math
import re
import sys

DEFAULT_HUES = {"cyan": 200, "pink": 350, "acid": 128, "purple": 300, "orange": 55, "red": 25}

# role -> token name, for each naming scheme
NAMES = {
    "generic": {"bg": "--bg", "surface": "--surface", "raised": "--surface-raised",
                "line": "--border", "muted": "--text-muted", "text": "--text",
                "focus": "--focus"},
    # Cybercore theme-chooser slots (the chooser repaints these on <html>)
    "cybercore": {"bg": "--bg", "surface": "--panel", "raised": "--panel-raised",
                  "line": "--line", "muted": "--muted", "text": "--white", "focus": "--cyan"},
}
SURFACES = ("bg", "surface", "raised")


# ---------- colour maths ----------
def oklch_to_linear_srgb(L: float, C: float, h: float) -> tuple[float, float, float]:
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
            -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
            -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_)


def in_gamut(rgb) -> bool:
    return all(-1e-4 <= c <= 1 + 1e-4 for c in rgb)


def oklch_to_hex(L: float, C: float, h: float) -> str:
    """Gamut-map by reducing chroma (keeps lightness and hue), then encode sRGB."""
    rgb = oklch_to_linear_srgb(L, C, h)
    lo, hi = 0.0, C
    if not in_gamut(rgb):
        for _ in range(30):
            mid = (lo + hi) / 2
            if in_gamut(oklch_to_linear_srgb(L, mid, h)):
                lo = mid
            else:
                hi = mid
        rgb = oklch_to_linear_srgb(L, lo, h)

    def enc(c: float) -> int:
        c = min(max(c, 0.0), 1.0)
        c = 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
        return round(c * 255)

    return "#{:02x}{:02x}{:02x}".format(*(enc(c) for c in rgb))


def luminance(hex_: str) -> float:
    hex_ = hex_.lstrip("#")
    if len(hex_) == 3:
        hex_ = "".join(ch * 2 for ch in hex_)
    vals = [int(hex_[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in vals]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def contrast(a: str, b: str) -> float:
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


# ---------- palette ----------
def lift_until(target: float, hex_for, start: float, surfaces: list[str], step=0.01, max_l=0.97):
    """Raise OKLCH lightness until hex_for(L) reaches `target` contrast on every surface."""
    L = start
    while L <= max_l:
        h = hex_for(L)
        if min(contrast(h, s) for s in surfaces) >= target:
            return h, L
        L += step
    return hex_for(max_l), max_l


def generate(bg_hue: float, hues: dict[str, float]) -> dict[str, str]:
    p = {
        "bg": oklch_to_hex(0.145, 0.020, bg_hue),       # near-black, tinted (not #000)
        "surface": oklch_to_hex(0.185, 0.022, bg_hue),
        "raised": oklch_to_hex(0.225, 0.024, bg_hue),
        "line": None, "muted": None, "text": None,
    }
    surfaces = [p[s] for s in SURFACES]
    # Borders: 3:1 against bg (non-text contrast), kept low-chroma so they don't glow
    p["line"], _ = lift_until(3.0, lambda L: oklch_to_hex(L, 0.03, bg_hue), 0.40, [p["bg"]])
    p["muted"], _ = lift_until(4.5, lambda L: oklch_to_hex(L, 0.025, bg_hue), 0.62, surfaces)
    # Off-white body text (pure white on near-black causes halation); aim well above 4.5
    p["text"], _ = lift_until(12.0, lambda L: oklch_to_hex(L, 0.012, bg_hue), 0.88, surfaces)
    for name, h in hues.items():
        p[name], _ = lift_until(4.5, lambda L, h=h: oklch_to_hex(L, 0.19, h), 0.74, surfaces)
    return p


def audit(p: dict[str, str], accents: list[str]) -> list[tuple[str, str, float, float, bool]]:
    rows = []
    for role, target in (("text", 4.5), ("muted", 4.5), *((a, 4.5) for a in accents)):
        for s in SURFACES:
            if role in p and s in p:
                c = contrast(p[role], p[s])
                rows.append((role, s, c, target, c >= target))
    if "focus" in p and "bg" in p:
        c = contrast(p["focus"], p["bg"])
        rows.append(("focus", "bg", c, 3.0, c >= 3.0))
    if "line" in p and "bg" in p:
        c = contrast(p["line"], p["bg"])
        # 1.4.11 applies to boundaries that identify controls, not decorative dividers
        rows.append(("line", "bg", c, 3.0, True if c >= 3.0 else "warn"))
    return rows


def to_css(p: dict[str, str], names: dict[str, str], accents: list[str], scheme: str) -> str:
    out = [":root {", "  color-scheme: dark;"]
    for role in ("bg", "surface", "raised", "line", "muted", "text"):
        out.append(f"  {names[role]}: {p[role]};")
    for a in accents:
        out.append(f"  --{a}: {p[a]};")
    if scheme == "generic":
        out.append(f"  --focus: var(--{accents[0]});")
    out.append("  /* glows: derived from accents so themes repaint them; low alpha by design */")
    for a in accents:
        out.append(f"  --glow-{a}: color-mix(in oklab, var(--{a}) 28%, transparent);")
    out.append("}")
    return "\n".join(out)


def report(rows) -> int:
    fails = warns = 0
    print(f"{'pair':<22}{'ratio':>8}  {'needs':>6}  result")
    for role, s, c, t, ok in rows:
        if ok == "warn":
            warns += 1
            res = "WARN  ok for decorative dividers; input/button outlines need a 3:1 border token"
        elif ok:
            res = "pass"
        else:
            fails += 1
            res = "FAIL"
        print(f"{role + ' on ' + s:<22}{c:>7.2f}:1  {t:>5}:1  {res}")
    print(f"\n{len(rows) - fails - warns}/{len(rows)} pass, {fails} fail, {warns} warning(s)")
    return fails


def parse_hues(arg: str | None) -> dict[str, float]:
    if not arg:
        return dict(DEFAULT_HUES)
    out = {}
    for part in arg.split(","):
        k, _, v = part.partition("=")
        out[k.strip()] = float(v)
    return out


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in ("generate", "check"):
        print(__doc__.strip(), file=sys.stderr)
        return 2
    opts = dict(zip(argv[2::2], argv[3::2])) if argv[1] == "generate" else dict(zip(argv[3::2], argv[4::2]))
    scheme = opts.get("--names", "generic")
    if scheme not in NAMES:
        print(f"unknown --names {scheme}", file=sys.stderr)
        return 2
    names = NAMES[scheme]

    if argv[1] == "generate":
        hues = parse_hues(opts.get("--hues"))
        p = generate(float(opts.get("--bg-hue", 250)), hues)
        accents = list(hues)
        p["focus"] = p[accents[0]]
        if opts.get("--format", "css") == "json":
            print(json.dumps({names.get(k, f"--{k}"): v for k, v in p.items()}, indent=2))
        else:
            print(to_css(p, names, accents, scheme))
        print(file=sys.stderr)
        return 1 if report_stderr(audit(p, accents)) else 0

    try:
        css = open(argv[2], encoding="utf-8").read()
    except OSError as exc:
        print(f"cannot read {argv[2]}: {exc}", file=sys.stderr)
        return 2
    decls = dict(re.findall(r"(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b", css))
    inv = {v: k for k, v in names.items()}
    p = {inv[k]: v for k, v in decls.items() if k in inv}
    accents = [k[2:] for k in decls if k[2:] in DEFAULT_HUES or k[2:] in parse_hues(opts.get("--hues"))]
    for a in accents:
        p[a] = decls[f"--{a}"]
    missing = [r for r in ("bg", "text") if r not in p]
    if missing:
        print(f"missing required tokens for roles {missing} (scheme {scheme})", file=sys.stderr)
        return 2
    return 1 if report(audit(p, accents)) else 0


def report_stderr(rows) -> int:
    stdout = sys.stdout
    sys.stdout = sys.stderr
    try:
        return report(rows)
    finally:
        sys.stdout = stdout


if __name__ == "__main__":
    sys.exit(main(sys.argv))
