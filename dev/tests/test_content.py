import copy
import importlib.util
import re
import unittest
from datetime import datetime, timezone
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace

import yaml
from jinja2 import Environment, FileSystemLoader


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("content_hooks", ROOT / "hooks.py")
hooks = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(hooks)


class PageElements(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.images = []
        self.iframes = []
        self.ids = []
        self.fragment_links = []
        self.feed(html)

    def handle_starttag(self, tag, attributes):
        values = dict(attributes)
        if "id" in values:
            self.ids.append(values["id"])
        if tag == "a" and values.get("href", "").startswith("#"):
            self.fragment_links.append(values["href"][1:])
        if tag == "img":
            self.images.append(dict(attributes))
        elif tag == "iframe":
            self.iframes.append(dict(attributes))


def render_homepage(timeline=None):
    environment = Environment(loader=FileSystemLoader(ROOT / "theme"))
    environment.filters["url"] = lambda value: value
    metadata = {
        name: yaml.safe_load((ROOT / "_data" / f"{name}.yml").read_text(encoding="utf-8"))
        for name in ("links", "resume", "maps")
    }
    config = yaml.safe_load((ROOT / "mkdocs.yml").read_text(encoding="utf-8"))
    if timeline is not None:
        metadata["resume"]["timeline"] = timeline
    hooks._validate_timeline_anchors(metadata["resume"]["timeline"])
    return environment.get_template("main.html").render(
        config=config, page=SimpleNamespace(meta=metadata, title="Home"),
        build_date_utc=datetime.now(timezone.utc),
    ), metadata


class ContentTests(unittest.TestCase):
    def test_all_chapters_and_events_have_unique_permalinks_and_legacy_aliases(self):
        html, metadata = render_homepage()
        elements = PageElements(html)
        self.assertEqual(len(elements.ids), len(set(elements.ids)))
        self.assertTrue(set(elements.fragment_links) <= set(elements.ids))
        original_chapters = (
            "ai-red-team", "azure-ai", "max-planck", "azure-ml", "microsoft-office",
            "umass-masters", "cisco-internship", "umass-exchange", "university-of-ulm",
        )
        self.assertEqual(
            {chapter["legacyIndex"]: chapter["slug"] for chapter in metadata["resume"]["timeline"]
             if "legacyIndex" in chapter},
            dict(enumerate(original_chapters, start=1)),
        )
        for chapter in metadata["resume"]["timeline"]:
            self.assertIn(f'chapter-{chapter["slug"]}', elements.ids)
            self.assertIn(f'chapter-{chapter["slug"]}', elements.fragment_links)
            self.assertIn(f'timeline-{chapter["legacyIndex"]}', elements.ids)
            self.assertIn(f'timeline-title-{chapter["legacyIndex"]}', elements.ids)
            for event in chapter.get("events", []):
                self.assertIn(f'event-{event["slug"]}', elements.ids)
                self.assertIn(f'event-{event["slug"]}', elements.fragment_links)
        self.assertEqual(html.count('class="timeline-permalink"'), 49)
        self.assertIn('aria-describedby="chapter-azure-ai-title"', html)

    def test_links_survive_new_chapters_reordering_and_title_changes(self):
        original, metadata = render_homepage()
        timeline = copy.deepcopy(metadata["resume"]["timeline"])
        timeline.reverse()
        for chapter in timeline:
            chapter["title"] = "Updated chapter title"
            chapter.get("events", []).reverse()
            for event in chapter.get("events", []):
                event["title"] = "Updated event title"
        timeline.insert(0, {
            "slug": "new-chapter", "title": "New chapter", "events": [
                {"slug": "new-event", "title": "New event", "date": "2027"}
            ],
        })
        revised, _ = render_homepage(timeline)
        self.assertTrue(set(PageElements(original).ids) <= set(PageElements(revised).ids))
        for chapter in timeline[1:]:
            self.assertRegex(
                revised,
                rf'<div id="chapter-{chapter["slug"]}"[^>]*>\s*'
                rf'<span id="timeline-{chapter["legacyIndex"]}"',
            )
        self.assertNotIn('id="timeline-10"', revised)

    def test_build_rejects_invalid_or_duplicate_permanent_anchors(self):
        cases = [
            [{"title": "Missing slug"}],
            [{"slug": "bad slug"}],
            [{"slug": "valid", "events": [{"slug": ""}]}],
            [{"slug": "valid", "events": [{"slug": "same"}, {"slug": "same"}]}],
            [{"slug": "same"}, {"slug": "same"}],
            [{"slug": "same"}, {"slug": "same-title"}],
            [{"slug": "first", "legacyIndex": 1}, {"slug": "second", "legacyIndex": 1}],
            [{"slug": "valid", "legacyIndex": 0}],
            [{"slug": "valid", "legacyIndex": True}],
        ]
        for timeline in cases:
            with self.subTest(timeline=timeline), self.assertRaises(ValueError):
                hooks._validate_timeline_anchors(timeline)

    def test_profile_cards_show_statistics_without_update_or_maintenance_labels(self):
        html, _ = render_homepage()
        cards = html.split('<div class="profile-links">', 1)[1].split('<div class="container">', 1)[0]
        self.assertIn('class="link-card-stats"', cards)
        self.assertIn("12 papers · 1,151 citations", cards)
        self.assertNotIn("link-card-stats-note", cards)
        self.assertNotRegex(cards, r"Updated \d{4}-\d{2}-\d{2}|Manually maintained|Last update unknown")

    def test_large_photos_offer_responsive_webp_sources_with_a_smaller_payload(self):
        html, _ = render_homepage()
        photos = [
            image for image in PageElements(html).images
            if re.search(r"/(?:pete-carroll|thomas-rawls)-\d+\.webp$", image["src"])
        ]
        self.assertEqual(len(photos), 2)
        largest_bytes = 0
        for photo in photos:
            sources = [source.strip().split() for source in photo["srcset"].split(",")]
            self.assertEqual([width for _, width in sources], ["480w", "960w", "1440w"])
            self.assertTrue(photo["sizes"].startswith("auto, "))
            self.assertEqual(photo["loading"], "lazy", "automatic sizes require lazy loading")
            for url, _ in sources:
                asset = ROOT / "theme" / "images" / url.split("images/", 1)[1]
                self.assertTrue(asset.is_file())
                self.assertEqual(asset.suffix, ".webp")
            largest_bytes += asset.stat().st_size
        original_bytes = sum(
            (ROOT / "theme" / "images" / filename).stat().st_size
            for filename in ("pete-carroll.jpg", "thomas-rawls.jpg")
        )
        self.assertLess(largest_bytes, original_bytes * 0.2)

    def test_every_static_image_reserves_space_with_positive_dimensions(self):
        html, _ = render_homepage()
        for image in PageElements(html).images:
            with self.subTest(src=image["src"]):
                for dimension in ("width", "height"):
                    self.assertRegex(image.get(dimension, ""), r"^[1-9]\d*$")
                filename = image["src"].split("images/", 1)[1]
                self.assertTrue((ROOT / "theme" / "images" / filename).is_file())
        self.assertNotIn('width="80%"', html)

    def test_archive_media_is_lazy_but_header_and_profile_icons_are_not(self):
        html, _ = render_homepage()
        elements = PageElements(html)
        self.assertGreater(len(elements.images), 25)
        self.assertEqual(len(elements.iframes), 3)
        for image in elements.images:
            with self.subTest(src=image["src"]):
                if "profile-img" in image.get("class", "") or "link-card-img" in image.get("class", ""):
                    self.assertNotEqual(image.get("loading"), "lazy")
                else:
                    self.assertEqual(image.get("loading"), "lazy")
                    self.assertEqual(image.get("decoding"), "async")
        for iframe in elements.iframes:
            self.assertEqual(iframe.get("loading"), "lazy")
            self.assertTrue(iframe.get("title"))

    def test_place_lists_include_every_configured_place_in_one_alphabetical_list(self):
        html, metadata = render_homepage()
        for entry in metadata["maps"]:
            config = entry["mapConfiguration"]
            list_id = f'{config["scope"]}_map_places'
            section = html.split(f'<details id="{list_id}"', 1)[1].split("</details>", 1)[0]
            self.assertEqual(section.count('<ul class="map-place-list">'), 1)
            expected = sorted(config["places"], key=lambda place: place["label"])
            self.assertEqual(
                re.findall(r'data-place-code="([^"]+)"', section),
                [place["name"] for place in expected],
            )
            for place in expected:
                self.assertEqual(set(place), {"name", "label"})
                self.assertIn(f'>{escape(place["label"])}</li>', section)
            self.assertIn(f'<summary>Places ({len(expected)})</summary>', section)
        self.assertIn('data-place-code="ISL">Iceland</li>', html)
        self.assertNotRegex(html, r"(?i)stopover|airport|data-visited")
        self.assertIn("<noscript>", html)
        self.assertRegex(html, r'class="map-container"[^>]+ hidden>')
        self.assertRegex(html, r'class="map-detail"[^>]+ hidden>')


if __name__ == "__main__":
    unittest.main()
