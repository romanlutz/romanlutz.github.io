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


class PageElements(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.images = []
        self.iframes = []
        self.feed(html)

    def handle_starttag(self, tag, attributes):
        if tag == "img":
            self.images.append(dict(attributes))
        elif tag == "iframe":
            self.iframes.append(dict(attributes))


def render_homepage():
    environment = Environment(loader=FileSystemLoader(ROOT / "theme"))
    environment.filters["url"] = lambda value: value
    metadata = {
        name: yaml.safe_load((ROOT / "_data" / f"{name}.yml").read_text(encoding="utf-8"))
        for name in ("links", "resume", "maps")
    }
    config = yaml.safe_load((ROOT / "mkdocs.yml").read_text(encoding="utf-8"))
    return environment.get_template("main.html").render(
        config=config, page=SimpleNamespace(meta=metadata, title="Home"),
        build_date_utc=datetime.now(timezone.utc),
    ), metadata


class ContentTests(unittest.TestCase):
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
