"""Tests for scripts/check_skill_descriptions.py (standard library only).

Run: python3 -m unittest discover -s tests -p "test_*.py"
"""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import check_skill_descriptions as c  # noqa: E402


class UseClause(unittest.TestCase):
    def test_accepts_use_when_for_after(self):
        for d in ("Does X. Use when Y.", "Does X. Use for Lua modules.", "Does X. Use after changing a page."):
            self.assertEqual(c.missing_use_clause({"s": d}), [])

    def test_flags_description_without_one(self):
        self.assertEqual(c.missing_use_clause({"s": "Standards for things."}), ["s"])


class Pointers(unittest.TestCase):
    def test_finds_every_pointer_form(self):
        d = ("Does X. Not for audits (use security-audit) or lockfiles (use dependency-and-supply-chain). "
             "For building, use web-design-and-frontend-craft. Publishing stays in rust-development.")
        self.assertEqual(c.pointers(d), {"security-audit", "dependency-and-supply-chain",
                                         "web-design-and-frontend-craft", "rust-development"})

    def test_ignores_ordinary_hyphenated_words(self):
        self.assertEqual(c.pointers("Evidence-driven, client-side and red-green-refactor work. Use when needed."), set())

    def test_flags_pointer_to_missing_skill(self):
        descs = {"a": "Does A. Use when A. Not for B (use b-skill).", "b-skill": "Does B. Use when B.",
                 "c": "Does C. Use when C. Not for D (use security-hardening)."}
        self.assertEqual(c.broken_pointers(descs), [("c", "security-hardening")])


class Neighbours(unittest.TestCase):
    def test_pair_passes_when_either_side_points(self):
        descs = {"x-one": "Use when X. Not for Y (use y-two).", "y-two": "Use when Y."}
        self.assertEqual(c.unlinked_neighbours(descs, [("x-one", "y-two")]), [])
        self.assertEqual(c.unlinked_neighbours(descs, [("y-two", "x-one")]), [])

    def test_pair_fails_when_neither_points(self):
        descs = {"x-one": "Use when X.", "y-two": "Use when Y."}
        self.assertEqual(c.unlinked_neighbours(descs, [("x-one", "y-two")]), [("x-one", "y-two")])

    def test_unknown_skill_in_pair_is_reported(self):
        self.assertEqual(c.unlinked_neighbours({"x-one": "Use when X."}, [("x-one", "gone")]), [("x-one", "gone")])


class RealCatalog(unittest.TestCase):
    def test_current_catalog_passes(self):
        self.assertEqual(c.main([]), 0)


if __name__ == "__main__":
    unittest.main()
