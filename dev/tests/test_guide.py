import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader
from mkdocs.utils.templates import url_filter


ROOT = Path(__file__).resolve().parents[1]


class GuideElements(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.ids = []
        self.links = []
        self.inputs = []
        self.labels = 0
        self.h1_count = 0
        self.feed(html)

    def handle_starttag(self, tag, attributes):
        values = dict(attributes)
        if "id" in values:
            self.ids.append(values["id"])
        if tag == "a":
            self.links.append(values.get("href", ""))
        elif tag == "input":
            self.inputs.append(values)
        elif tag == "label":
            self.labels += 1
        elif tag == "h1":
            self.h1_count += 1


def render_guide(site_url="https://romanlutz.github.io/"):
    source = (ROOT / "docs" / "junior-engineer-guide.md").read_text(encoding="utf-8")
    _, frontmatter, body = source.split("---", 2)
    metadata = yaml.safe_load(frontmatter)
    converter = markdown.Markdown(extensions=["toc"])
    content = converter.convert(body)

    def heading(item):
        return SimpleNamespace(
            id=item["id"], title=item["name"],
            children=[heading(child) for child in item["children"]],
        )

    environment = Environment(loader=FileSystemLoader(ROOT / "theme"))
    environment.filters["url"] = url_filter
    config = yaml.safe_load((ROOT / "mkdocs.yml").read_text(encoding="utf-8"))
    page = SimpleNamespace(
        title=metadata["title"], meta=metadata, content=content,
        toc=[heading(item) for item in converter.toc_tokens],
        url="junior-engineer-guide/",
        canonical_url=site_url + "junior-engineer-guide/",
    )
    return environment.get_template(metadata["template"]).render(
        page=page, config=config, base_url="..",
    )


class GuideTests(unittest.TestCase):
    def test_all_chapter_and_checklist_links_resolve_to_unique_headings(self):
        elements = GuideElements(render_guide())
        self.assertEqual(len(elements.ids), len(set(elements.ids)))
        fragments = [link[1:] for link in elements.links if link.startswith("#")]
        self.assertTrue(set(fragments) <= set(elements.ids))
        self.assertEqual(elements.h1_count, 1)
        for part in range(1, 5):
            self.assertEqual(
                len([anchor for anchor in elements.ids if anchor.startswith(f"part-{part}-")]),
                1,
            )
        self.assertIn("one-page-checklist", fragments)
        self.assertIn("sources-further-reading", fragments)

    def test_checklist_works_without_javascript_and_explains_its_lifetime(self):
        html = render_guide()
        elements = GuideElements(html)
        self.assertEqual(len(elements.inputs), 23)
        self.assertEqual(elements.labels, 23)
        self.assertTrue(all(control["type"] == "checkbox" for control in elements.inputs))
        self.assertTrue(all("disabled" not in control for control in elements.inputs))
        self.assertIn("not saved or sent anywhere", html)
        self.assertIn('data-print-guide hidden', html)
        script = (ROOT / "theme" / "guide.js").read_text(encoding="utf-8")
        self.assertIn("window.print()", script)
        self.assertNotRegex(script, r"localStorage|sessionStorage|fetch\(")

    def test_separate_article_metadata_and_relative_assets(self):
        html = render_guide()
        self.assertIn("<title>A Field Guide for New Engineers | Roman Lutz</title>", html)
        self.assertIn('property="og:type" content="article"', html)
        self.assertIn('href="https://romanlutz.github.io/junior-engineer-guide/"', html)
        self.assertIn('href="../guide.css"', html)
        self.assertIn('href="../#event-engineer-field-guide"', html)
        self.assertNotIn("maps.js", html)
        self.assertNotIn("portrait.js", html)
        nested = render_guide("https://romanlutz.github.io/portfolio/")
        self.assertIn('href="https://romanlutz.github.io/portfolio/junior-engineer-guide/"', nested)
        self.assertIn('href="../guide.css"', nested)

    def test_timeline_summary_links_to_the_article(self):
        resume = yaml.safe_load((ROOT / "_data" / "resume.yml").read_text(encoding="utf-8"))
        event = resume["timeline"][0]["events"][0]
        self.assertEqual(event["slug"], "engineer-field-guide")
        self.assertEqual(event["article"], "junior-engineer-guide/")
        self.assertTrue((ROOT / "docs" / (event["article"].rstrip("/") + ".md")).is_file())
        self.assertIn("earn trust", event["description"])
        template = (ROOT / "theme" / "main.html").read_text(encoding="utf-8")
        self.assertIn("event.article|url", template)

    def test_sources_and_full_chapters_are_present(self):
        html = render_guide()
        for phrase in (
            "The one idea that changes everything",
            "Learn to spot a rabbit hole",
            "Find the 10% that delivers 90%",
            "Understand what your manager is measured on",
            "Keep a work log",
            "How to actually start",
            "Steve Huynh",
            "Don't ask to ask, just ask",
        ):
            self.assertIn(phrase, html)
        self.assertEqual(len(re.findall(r'<ul class="guide-checklist">', html)), 4)


if __name__ == "__main__":
    unittest.main()
