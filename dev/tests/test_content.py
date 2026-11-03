import re
import unittest
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from types import SimpleNamespace

import yaml
from jinja2 import Environment, FileSystemLoader


ROOT = Path(__file__).resolve().parents[1]


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
        self.assertRegex(html, r'class="map-container" hidden>')
        self.assertRegex(html, r'class="map-detail"[^>]+ hidden>')


if __name__ == "__main__":
    unittest.main()
