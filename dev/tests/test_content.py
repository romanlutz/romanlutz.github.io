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

    def test_place_lists_include_every_configured_place_in_the_right_group(self):
        html, metadata = render_homepage()
        for entry in metadata["maps"]:
            config = entry["mapConfiguration"]
            list_id = f'{config["scope"]}_map_places'
            section = html.split(f'<details id="{list_id}"', 1)[1].split("</details>", 1)[0]
            for visited in (True, False):
                group = section.split(f'data-visited="{str(visited).lower()}">', 1)[1].split("</ul>", 1)[0]
                expected = sorted(
                    (place for place in config["places"] if place["visited"] is visited),
                    key=lambda place: place["label"],
                )
                self.assertEqual(
                    re.findall(r'data-place-code="([^"]+)"', group),
                    [place["name"] for place in expected],
                )
                for place in expected:
                    self.assertIn(f'>{escape(place["label"])}</li>', group)
            self.assertIn("<summary>Places and stopovers", section)
        self.assertIn("<noscript>", html)
        self.assertRegex(html, r'class="map-container"[^>]+ hidden>')
        self.assertRegex(html, r'class="map-detail"[^>]+ hidden>')


if __name__ == "__main__":
    unittest.main()
