import importlib.util
import json
import tempfile
import unittest
import urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("website_hooks", ROOT / "hooks.py")
hooks = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(hooks)


class StatsTests(unittest.TestCase):
    def setUp(self):
        hooks._stats_cache = None
        hooks._stats_updated_at = {}
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.cache = self.root / "stats.json"
        self.old = "2020-01-01T00:00:00Z"
        self.now = datetime.now(timezone.utc).isoformat()
        self.targets = {
            "pyrit": {"kind": "github", "repo": "microsoft/PyRIT"},
            "bluesky": {"kind": "bluesky", "actor": "romanlutz.bsky.social"},
        }
        self.enterContext(patch.object(hooks, "_STATS_TARGETS", self.targets))

    def write_cache(self, timestamps=None, **extra):
        self.cache.write_text(json.dumps({
            "stats": {"pyrit": {"stars": 10}, "bluesky": {"followers": 20}},
            "updated_at": timestamps or {},
            **extra,
        }), encoding="utf-8")

    def test_refreshes_stale_sources_without_refetching_fresh_ones(self):
        self.write_cache({"pyrit": self.now, "bluesky": self.old})
        github, bluesky = Mock(), Mock(return_value={"followers": 21})
        with patch.object(hooks, "_FETCHERS", {"github": github, "bluesky": bluesky}):
            values = hooks._load_stats(self.root)
        github.assert_not_called()
        bluesky.assert_called_once()
        self.assertEqual(values["bluesky"], {"followers": 21})
        stored = json.loads(self.cache.read_text())
        self.assertEqual(stored["updated_at"]["pyrit"], self.now)
        self.assertTrue(hooks._cache_is_fresh(stored["updated_at"]["bluesky"]))

    def test_failure_retains_counts_and_original_timestamp(self):
        self.write_cache({"pyrit": self.old, "bluesky": self.old})
        github = Mock(side_effect=urllib.error.URLError("offline"))
        bluesky = Mock(return_value={"followers": 21})
        with patch.object(hooks, "_FETCHERS", {"github": github, "bluesky": bluesky}):
            with self.assertLogs(hooks._log, level="WARNING") as messages:
                values = hooks._load_stats(self.root)
        self.assertEqual(values["pyrit"], {"stars": 10})
        self.assertEqual(hooks._stats_updated_at["pyrit"], self.old)
        self.assertIn("pyrit", messages.output[0])
        self.assertIn(self.old, messages.output[0])
        self.assertEqual(json.loads(self.cache.read_text())["updated_at"]["pyrit"], self.old)

    def test_retries_failed_source_on_next_build_even_when_other_source_is_fresh(self):
        self.test_failure_retains_counts_and_original_timestamp()
        hooks._stats_cache = None
        github, bluesky = Mock(return_value={"stars": 11}), Mock()
        with patch.object(hooks, "_FETCHERS", {"github": github, "bluesky": bluesky}):
            hooks._load_stats(self.root)
        github.assert_called_once()
        bluesky.assert_not_called()

    def test_legacy_timestamp_is_not_relabelled_as_a_success(self):
        self.write_cache(fetched_at=self.now)
        failure = Mock(side_effect=OSError("offline"))
        with patch.object(hooks, "_FETCHERS", {"github": failure, "bluesky": failure}):
            with self.assertLogs(hooks._log, level="WARNING"):
                values = hooks._load_stats(self.root)
        self.assertEqual(values["pyrit"], {"stars": 10})
        self.assertEqual(hooks._stats_updated_at, {})
        self.assertNotIn("fetched_at", json.loads(self.cache.read_text()))

    def test_invalid_fetches_do_not_replace_cached_counts(self):
        for fetched in ({}, {"stars": None}, {"stars": -1}, {"stars": True}, {"stars": "10"}):
            with self.subTest(fetched=fetched):
                hooks._stats_cache = None
                self.write_cache({"pyrit": self.old, "bluesky": self.now})
                with patch.object(hooks, "_FETCHERS", {"github": Mock(return_value=fetched)}):
                    with self.assertLogs(hooks._log, level="WARNING"):
                        values = hooks._load_stats(self.root)
                self.assertEqual(values["pyrit"], {"stars": 10})
                self.assertEqual(hooks._stats_updated_at["pyrit"], self.old)

    def test_zero_counts_are_valid(self):
        self.assertTrue(hooks._valid_counts({"stars": 0, "contributors": 0}))

    def test_bad_future_and_naive_timestamps_are_not_fresh(self):
        future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        for timestamp in (None, 42, "not-a-date", "2026-01-01", future, self.old):
            with self.subTest(timestamp=timestamp):
                self.assertFalse(hooks._cache_is_fresh(timestamp))

    def test_corrupt_cache_is_logged_and_rebuilt(self):
        self.cache.write_text("[]", encoding="utf-8")
        success = Mock(return_value={"count": 1})
        with patch.object(hooks, "_FETCHERS", {"github": success, "bluesky": success}):
            with self.assertLogs(hooks._log, level="WARNING") as messages:
                hooks._load_stats(self.root)
        self.assertIn("Unable to read stats cache", messages.output[0])
        self.assertEqual(len(json.loads(self.cache.read_text())["updated_at"]), 2)

    def test_cache_write_failure_is_logged_without_losing_fetched_values(self):
        success = Mock(return_value={"count": 1})
        with patch.object(hooks, "_FETCHERS", {"github": success, "bluesky": success}):
            with patch.object(Path, "write_text", side_effect=OSError("read-only")):
                with self.assertLogs(hooks._log, level="WARNING") as messages:
                    values = hooks._load_stats(self.root)
        self.assertEqual(values["pyrit"], {"count": 1})
        self.assertIn("Unable to write stats cache", messages.output[0])

    def test_incomplete_github_search_is_rejected(self):
        with patch.object(hooks, "_get_json", return_value=(
            {"total_count": 20, "incomplete_results": True}, {}
        )):
            with self.assertRaisesRegex(ValueError, "incomplete"):
                hooks._github_search_count("type:pr", {})

    def test_card_metadata_keeps_counts_without_freshness_or_maintenance_labels(self):
        hooks._stats_cache = {"github": {"prsMerged": 1, "reviews": 2}, "pyrit": {"stars": 3}}
        hooks._stats_updated_at = {"github": self.old}
        page = SimpleNamespace(file=SimpleNamespace(src_uri="index.md"), meta={})
        hooks.on_page_markdown("", page, {"config_file_path": str(ROOT / "mkdocs.yml")}, None)
        cards = {card["label"]: card for card in page.meta["links"]}
        self.assertEqual(cards["Google Scholar"]["statsText"], "12 papers · 1,151 citations")
        self.assertEqual(cards["PyRIT"]["statsText"], "\u2605 3")
        self.assertIn("PRs reviewed", cards["GitHub"]["statsText"])
        self.assertNotIn("statsText", cards["LinkedIn"])
        for card in cards.values():
            self.assertNotIn("statsNote", card)
        self.assertEqual(hooks._stats_updated_at, {"github": self.old})


if __name__ == "__main__":
    unittest.main()
