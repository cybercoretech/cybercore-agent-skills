"""Tests for scripts/check_release.py (standard library only).

Run: python3 -m unittest discover -s tests -p "test_*.py"
"""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import check_release as r  # noqa: E402

SAMPLE = """# Changelog

## [Unreleased]

### Added
- Something not yet released.

## [1.1.0] - 2026-12-01

### Added
- A new pack.

## [1.0.0] - 2026-11-20

### Added
- First release.
"""


class LatestVersion(unittest.TestCase):
    def test_skips_unreleased(self):
        self.assertEqual(r.latest_version(SAMPLE), "1.1.0")

    def test_none_without_releases(self):
        self.assertIsNone(r.latest_version("# Changelog\n\n## [Unreleased]\n"))


class Notes(unittest.TestCase):
    def test_section_body_only(self):
        notes = r.release_notes(SAMPLE, "1.1.0")
        self.assertIn("A new pack.", notes)
        self.assertNotIn("First release", notes)
        self.assertNotIn("## [1.1.0]", notes)

    def test_missing_version(self):
        self.assertIsNone(r.release_notes(SAMPLE, "9.9.9"))


class CheckTag(unittest.TestCase):
    def test_matching_tag_passes(self):
        self.assertEqual(r.check_tag("v1.1.0", SAMPLE), [])

    def test_tag_must_be_newest_release(self):
        self.assertTrue(r.check_tag("v1.0.0", SAMPLE))

    def test_tag_format(self):
        self.assertTrue(r.check_tag("1.1.0", SAMPLE))
        self.assertTrue(r.check_tag("v1.1", SAMPLE))

    def test_empty_notes_rejected(self):
        self.assertTrue(r.check_tag("v2.0.0", "# Changelog\n\n## [2.0.0] - 2026-12-02\n\n"))

    def test_bad_date_rejected(self):
        self.assertTrue(r.check_tag("v2.0.0", "# Changelog\n\n## [2.0.0] - soon\n\n- x\n"))


class RealChangelog(unittest.TestCase):
    def test_repo_changelog_has_a_release(self):
        text = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
        version = r.latest_version(text)
        self.assertIsNotNone(version)
        self.assertEqual(r.check_tag(f"v{version}", text), [])


if __name__ == "__main__":
    unittest.main()
