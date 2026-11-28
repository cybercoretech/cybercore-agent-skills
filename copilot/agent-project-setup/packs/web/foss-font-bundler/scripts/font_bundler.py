#!/usr/bin/env python3
"""Self-host FOSS fonts: download WOFF2 subsets, subset local fonts, audit for CDN calls.

  fetch  <fontsource-id>  Download WOFF2 files + LICENSE from Fontsource (build time only)
                          and write @font-face CSS that points at your own server.
         --weights 400,700   --variable   --styles normal,italic   --subsets latin,latin-ext
         --out public/fonts  --css src/styles/fonts.css  --url-prefix /fonts  --display swap
  subset <font-file>      Subset a local TTF/OTF/WOFF2 to WOFF2 with fontTools (+brotli).
         --out file.woff2  --unicodes U+0000-00FF,U+2013  --text-file chars.txt  --keep-features
  audit  <build-dir>      Fail if built HTML/CSS/JS still references a font CDN.

Exit codes: 0 ok, 1 problem found (audit hits, failed download), 2 bad usage.
Network is used only by `fetch`, at build time. Standard library, plus fontTools+brotli
for `subset` and metric overrides.
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

API = "https://api.fontsource.org/v1"
FILES = "https://cdn.jsdelivr.net/fontsource/fonts"
LICENSE_URL = "https://cdn.jsdelivr.net/npm/@fontsource{variable}/{id}/LICENSE"
UA = {"User-Agent": "font-bundler/1.0"}
CDN_PATTERNS = [
    r"fonts\.googleapis\.com", r"fonts\.gstatic\.com", r"use\.typekit\.net", r"p\.typekit\.net",
    r"fonts\.bunny\.net", r"cdn\.jsdelivr\.net/(?:npm/@fontsource|fontsource)", r"fast\.fonts\.net",
    r"cloud\.typography\.com", r"fonts\.cdnfonts\.com", r"api\.fontshare\.com", r"kit\.fontawesome\.com",
]
# Fallback fonts for metric-matched @font-face (avg advance in em, for size-adjust)
FALLBACKS = {"monospace": ("Courier New", 0.6), "sans": ("Arial", 0.4414), "serif": ("Times New Roman", 0.4012)}


def get(url: str, binary: bool = False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return data if binary else data.decode("utf-8")


def opts(argv: list[str]) -> tuple[list[str], dict[str, str | bool]]:
    pos, o, i = [], {}, 0
    while i < len(argv):
        a = argv[i]
        if a.startswith("--"):
            if i + 1 < len(argv) and not argv[i + 1].startswith("--"):
                o[a[2:]] = argv[i + 1]
                i += 2
                continue
            o[a[2:]] = True
        else:
            pos.append(a)
        i += 1
    return pos, o


def metric_overrides(path: Path, category: str) -> str | None:
    """@font-face for a local fallback whose metrics match the web font (reduces CLS)."""
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        return None
    f = TTFont(str(path))
    upm = f["head"].unitsPerEm
    hhea, os2 = f["hhea"], f["OS/2"]
    asc, desc, gap = hhea.ascent / upm, abs(hhea.descent) / upm, hhea.lineGap / upm
    fam = f["name"].getBestFamilyName() or "Web Font"
    kind = "monospace" if category == "monospace" else ("serif" if category == "serif" else "sans")
    local, fb_avg = FALLBACKS[kind]
    avg = (f["hmtx"]["0"][0] / upm) if kind == "monospace" and "0" in f.getGlyphOrder() else os2.xAvgCharWidth / upm
    size_adjust = avg / fb_avg * 100
    approx = "" if kind == "monospace" else " /* size-adjust approximate for proportional fonts: tune visually */"
    return (f"@font-face {{\n  font-family: \"{fam} Fallback\";\n  src: local(\"{local}\");\n"
            f"  size-adjust: {size_adjust:.2f}%;{approx}\n  ascent-override: {asc / (size_adjust / 100) * 100:.2f}%;\n"
            f"  descent-override: {desc / (size_adjust / 100) * 100:.2f}%;\n"
            f"  line-gap-override: {gap / (size_adjust / 100) * 100:.2f}%;\n}}")


def cmd_fetch(pos, o) -> int:
    if len(pos) != 1:
        print("usage: fetch <fontsource-id> [options]", file=sys.stderr)
        return 2
    fid = pos[0].lower()
    try:
        meta = json.loads(get(f"{API}/fonts/{fid}"))
    except Exception as exc:  # noqa: BLE001
        print(f"cannot read Fontsource metadata for {fid}: {exc}", file=sys.stderr)
        return 1
    variable = bool(o.get("variable"))
    if variable and not meta.get("variable"):
        print(f"{fid} has no variable version; use --weights", file=sys.stderr)
        return 2
    styles = str(o.get("styles", "normal")).split(",")
    subsets = str(o.get("subsets", meta.get("defSubset", "latin"))).split(",")
    weights = [int(w) for w in str(o.get("weights", "400")).split(",")] if not variable else []
    bad = [s for s in subsets if s not in meta["subsets"]] + [s for s in styles if s not in meta["styles"]] \
        + [str(w) for w in weights if w not in meta["weights"]]
    if bad:
        print(f"not available for {fid}: {', '.join(bad)}\n  subsets: {meta['subsets']}\n  "
              f"weights: {meta['weights']}\n  styles: {meta['styles']}", file=sys.stderr)
        return 2

    out = Path(str(o.get("out", "public/fonts"))) / fid
    out.mkdir(parents=True, exist_ok=True)
    prefix = str(o.get("url-prefix", "/fonts")).rstrip("/") + f"/{fid}"
    display = str(o.get("display", "swap"))
    family = meta["family"]
    faces, files = [], []
    wght_range = None
    if variable:
        axes = json.loads(get(f"{API}/variable/{fid}")).get("axes", {})
        w = axes.get("wght", {})
        wght_range = f"{w.get('min', 100)} {w.get('max', 900)}"
    combos = [(None, s, sub) for s in styles for sub in subsets] if variable else \
             [(w, s, sub) for w in weights for s in styles for sub in subsets]
    for w, style, sub in combos:
        name = f"{sub}-wght-{style}.woff2" if variable else f"{sub}-{w}-{style}.woff2"
        url = f"{FILES}/{fid}:vf@latest/{name}" if variable else f"{FILES}/{fid}@latest/{name}"
        try:
            data = get(url, binary=True)
        except Exception as exc:  # noqa: BLE001
            print(f"download failed {url}: {exc}", file=sys.stderr)
            return 1
        (out / name).write_bytes(data)
        files.append((name, len(data)))
        faces.append(
            f"@font-face {{\n  font-family: \"{family}\";\n  font-style: {style};\n"
            f"  font-weight: {wght_range if variable else w};\n  font-display: {display};\n"
            f"  src: url(\"{prefix}/{name}\") format(\"woff2\");\n"
            f"  unicode-range: {meta['unicodeRange'][sub]};\n}}")
    try:
        lic = get(LICENSE_URL.format(variable="-variable" if variable else "", id=fid))
        (out / "LICENSE.txt").write_text(lic, encoding="utf-8")
    except Exception as exc:  # noqa: BLE001
        print(f"WARNING: licence text not downloaded ({exc}); add the font's licence file by hand", file=sys.stderr)

    fallback = metric_overrides(out / files[0][0], meta.get("category", "sans-serif"))
    generic = "monospace" if meta.get("category") == "monospace" else (
        "serif" if meta.get("category") == "serif" else "sans-serif")
    stack = f"\"{family}\", " + (f"\"{family} Fallback\", " if fallback else "") + generic
    css = (f"/* {family} — self-hosted from Fontsource ({meta.get('license')}, {meta.get('version')}). "
           f"Licence: {prefix}/LICENSE.txt */\n" + "\n".join(faces) + ("\n" + fallback if fallback else "")
           + f"\n/* use: font-family: {stack}; */\n")
    css_path = Path(str(o.get("css", out / f"{fid}.css")))
    css_path.parent.mkdir(parents=True, exist_ok=True)
    css_path.write_text(css, encoding="utf-8")

    total = sum(n for _, n in files)
    print(f"{family}: {len(files)} file(s), {total / 1024:.1f} KiB in {out}")
    for n, size in files:
        print(f"  {n:<36} {size / 1024:7.1f} KiB")
    print(f"CSS: {css_path}\nfont-family: {stack};")
    first = files[0][0]
    print(f"preload (critical face only):\n  <link rel=\"preload\" href=\"{prefix}/{first}\" as=\"font\" type=\"font/woff2\" crossorigin>")
    return 0


def cmd_subset(pos, o) -> int:
    if len(pos) != 1 or "out" not in o:
        print("usage: subset <font-file> --out file.woff2 (--unicodes ... | --text-file f)", file=sys.stderr)
        return 2
    try:
        from fontTools import subset
        from fontTools.ttLib import TTFont
        import brotli  # noqa: F401  (needed for WOFF2)
    except ImportError as exc:
        print(f"needs fontTools and brotli ({exc}); install: pacman -S python-fonttools python-brotli", file=sys.stderr)
        return 2
    src = Path(pos[0])
    font = TTFont(str(src))
    lic = " ".join(str(r) for r in font["name"].names if r.nameID in (0, 13))
    if re.search(r"reserved font name", lic, re.I):
        print("WARNING: this font declares a Reserved Font Name. Under the OFL, a subset is a Modified "
              "Version and must not use that name: rename the family (name table) before publishing.",
              file=sys.stderr)
    args = [str(src), f"--output-file={o['out']}", "--flavor=woff2"]
    if o.get("unicodes"):
        args.append(f"--unicodes={o['unicodes']}")
    if o.get("text-file"):
        args.append(f"--text-file={o['text-file']}")
    if not o.get("unicodes") and not o.get("text-file"):
        args.append("--unicodes=U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
                    "U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")
    args.append("--layout-features=*" if o.get("keep-features") else "--layout-features=kern,liga,calt,ccmp,locl,mark,mkmk")
    subset.main(args)
    before, after = src.stat().st_size, Path(str(o["out"])).stat().st_size
    print(f"{src.name}: {before / 1024:.1f} KiB -> {after / 1024:.1f} KiB ({o['out']})")
    return 0


def cmd_audit(pos, o) -> int:
    if len(pos) != 1:
        print("usage: audit <build-dir>", file=sys.stderr)
        return 2
    root = Path(pos[0])
    rx = re.compile("|".join(CDN_PATTERNS))
    hits = 0
    for p in root.rglob("*"):
        if p.suffix.lower() not in {".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".json", ".svg"} or not p.is_file():
            continue
        for n, line in enumerate(p.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            for m in rx.finditer(line):
                hits += 1
                print(f"{p}:{n}: {m.group(0)}")
    print(f"\n{hits} external font reference(s) in {root}")
    return 1 if hits else 0


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] not in ("fetch", "subset", "audit"):
        print(__doc__.strip(), file=sys.stderr)
        return 2
    pos, o = opts(argv[2:])
    return {"fetch": cmd_fetch, "subset": cmd_subset, "audit": cmd_audit}[argv[1]](pos, o)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
