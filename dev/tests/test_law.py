import unittest
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader
from mkdocs.utils.templates import url_filter

from test_content import render_homepage


ROOT = Path(__file__).resolve().parents[1]


class LawElements(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.ids = []
        self.links = []
        self.images = []
        self.figures = []
        self.svgs = []
        self.panels = []
        self.openings = 0
        self.details = 0
        self.summaries = 0
        self.h1_count = 0
        self.scripts = 0
        self.iframes = 0
        self.feed(html)

    def handle_starttag(self, tag, attributes):
        values = dict(attributes)
        if "id" in values:
            self.ids.append(values["id"])
        classes = values.get("class", "").split()
        if tag in ("header", "section") and (
            "law-cover" in classes or "law-panel" in classes
        ):
            self.panels.append(values)
        if tag == "div" and "law-opening" in classes:
            self.openings += 1
        if tag == "a":
            self.links.append(values.get("href", ""))
        elif tag == "img":
            self.images.append(values)
        elif tag == "figure":
            self.figures.append(values)
        elif tag == "svg":
            self.svgs.append(values)
        elif tag == "details":
            self.details += 1
        elif tag == "summary":
            self.summaries += 1
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "script":
            self.scripts += 1
        elif tag == "iframe":
            self.iframes += 1


def render_law(site_url="https://romanlutz.github.io/"):
    source = (ROOT / "docs" / "lutzs-law.md").read_text(encoding="utf-8")
    _, frontmatter, body = source.split("---", 2)
    metadata = yaml.safe_load(frontmatter)
    content = markdown.markdown(body, extensions=["toc"])
    environment = Environment(loader=FileSystemLoader(ROOT / "theme"))
    environment.filters["url"] = url_filter
    config = yaml.safe_load((ROOT / "mkdocs.yml").read_text(encoding="utf-8"))
    config["site_url"] = site_url
    page = SimpleNamespace(
        title=metadata["title"], meta=metadata, content=content,
        url="lutzs-law/", canonical_url=site_url + "lutzs-law/",
    )
    return environment.get_template(metadata["template"]).render(
        page=page, config=config, base_url="..",
    )


class LawTests(unittest.TestCase):
    def test_section_links_resolve_to_unique_headings(self):
        elements = LawElements(render_law())
        self.assertEqual(len(elements.ids), len(set(elements.ids)))
        fragments = {link[1:] for link in elements.links if link.startswith("#")}
        self.assertTrue(fragments <= set(elements.ids))
        self.assertEqual(elements.h1_count, 1)
        for heading in (
            "lutzs-second-law",
            "where-the-laws-bend", "ai-changes-the-bottleneck",
            "put-it-into-practice", "the-receipts",
        ):
            self.assertIn(heading, fragments)

    def test_all_five_panels_share_the_full_width_two_column_layout(self):
        elements = LawElements(render_law())
        self.assertEqual(len(elements.panels), 5)
        self.assertEqual(elements.openings, 5)
        self.assertEqual(
            [panel["aria-labelledby"] for panel in elements.panels],
            [
                "law-title", "lutzs-second-law", "where-the-laws-bend",
                "ai-changes-the-bottleneck", "put-it-into-practice",
            ],
        )
        for panel in elements.panels:
            self.assertIn("law-width", panel["class"].split())
            self.assertIn(panel["aria-labelledby"], elements.ids)

    def test_ai_and_practice_drawings_have_accessible_descriptions(self):
        html = render_law()
        elements = LawElements(html)
        sketches = [
            figure for figure in elements.figures
            if figure.get("class") == "law-sketch"
        ]
        self.assertEqual(len(sketches), 2)
        self.assertEqual(
            [figure["aria-labelledby"] for figure in sketches],
            ["law-ai-title", "law-practice-title"],
        )
        for figure in sketches:
            self.assertIn(figure["aria-labelledby"], elements.ids)
            self.assertIn(figure["aria-describedby"], elements.ids)
        self.assertEqual(len(elements.svgs), 4)
        for svg in elements.svgs:
            self.assertEqual(svg["aria-hidden"], "true")
            self.assertEqual(svg["focusable"], "false")
        for phrase in (
            "AI review + human judgment",
            "people still judge scope, architecture",
            "Each small PR carries its own tests",
            "PR 1 + tests", "PR 2 + tests", "PR 3 + tests",
        ):
            self.assertIn(phrase, html)

    def test_article_metadata_and_relative_navigation(self):
        html = render_law()
        self.assertIn("<title>Lutz&#39;s Law | Roman Lutz</title>", html)
        self.assertIn('href="https://romanlutz.github.io/lutzs-law/"', html)
        self.assertIn('property="og:type" content="article"', html)
        self.assertIn('href="../law.css"', html)
        self.assertIn('href="../#miscellaneous"', html)
        self.assertNotIn("#event-lutzs-law", html)
        self.assertIn('href="../junior-engineer-guide/"', html)
        nested = render_law("https://romanlutz.github.io/portfolio/")
        self.assertIn('href="https://romanlutz.github.io/portfolio/lutzs-law/"', nested)
        self.assertIn('href="../law.css"', nested)

    def test_receipts_are_just_a_link_to_the_original_thread(self):
        html = render_law()
        elements = LawElements(html)
        self.assertEqual(elements.details, 0)
        self.assertEqual(elements.summaries, 0)
        self.assertEqual(elements.scripts, 0)
        self.assertEqual(elements.iframes, 0)
        self.assertEqual(len(elements.images), 0)
        receipts = html.split('<h2 id="the-receipts">', 1)[1].split("<hr", 1)[0]
        self.assertEqual(
            LawElements(receipts).links,
            ["https://x.com/romanlutz13/status/1451289545627086849"],
        )
        self.assertNotIn("<blockquote", receipts)
        self.assertNotIn("<h3", receipts)

    def test_origin_and_credit_are_in_the_opening(self):
        html = render_law()
        opening = html.split('<div class="law-premise">', 1)[1].split(
            '<figure class="law-diagram">', 1,
        )[0]
        for phrase in (
            "I coined this on", 'datetime="2021-10-21"',
            "because I had provided so many examples",
            "oversized pull requests getting stuck in review",
            'href="https://adrin.info/pages/about.html">Adrin Jalali</a>',
        ):
            self.assertIn(phrase, opening)
        for phrase in (
            "not measured probabilities or guarantees",
            "An illustration, not measured data",
            "Keep the tests with the behavior",
        ):
            self.assertIn(phrase, html)
        self.assertNotIn("offender", html.lower())
        self.assertNotIn("named-after", html)
        self.assertNotIn('href="https://github.com/adrinjalali"', html)

    def test_present_day_reversal_and_ai_caveat_are_separate_from_original_posts(self):
        html = render_law()
        self.assertIn("Originally about human review in open source", html)
        commentary = html.split('<h2 id="where-the-laws-bend">', 1)[1].split(
            '<h2 id="put-it-into-practice">', 1,
        )[0]
        for phrase in (
            'datetime="2026-11-06"',
            "separate from the original 2021 posts",
            "more likely it is to be rubber-stamped",
            "one enormous PR can merge much faster",
            "a fast merge is not the same as a proper review",
            "the original laws apply less strongly",
            "Large PRs can now receive detailed automated review",
            "Reviewers may still push back, for good reason",
        ):
            self.assertIn(phrase, commentary)
        receipts = html.split('<h2 id="the-receipts">', 1)[1]
        self.assertNotIn("rubber-stamped", receipts)

    def test_second_law_compares_sequential_review_time_without_claiming_data(self):
        html = render_law()
        elements = LawElements(html)
        figure = next(item for item in elements.figures if item.get("class") == "law-time")
        self.assertIn(figure["aria-labelledby"], elements.ids)
        self.assertIn(figure["aria-describedby"], elements.ids)
        comparison = html.split('<figure class="law-time"', 1)[1].split("</figure>", 1)[0]
        self.assertIn("Cumulative time to merge", comparison)
        self.assertIn("one after another, not in parallel", comparison)
        self.assertIn("even when they add up to more code", comparison)
        self.assertIn("illustrative, not measured timings", comparison)
        self.assertLess(comparison.index("PR 1"), comparison.index("PR 2"))
        self.assertLess(comparison.index("PR 2"), comparison.index("PR 3"))
        self.assertEqual(comparison.count('class="law-time-end"'), 2)

    def test_reversal_visual_explains_faster_merging_as_weaker_review(self):
        html = render_law()
        elements = LawElements(html)
        figure = next(
            item for item in elements.figures
            if "law-time--reversed" in item.get("class", "").split()
        )
        self.assertIn(figure["aria-labelledby"], elements.ids)
        self.assertIn(figure["aria-describedby"], elements.ids)
        comparison = html.split(
            '<figure class="law-time law-time--reversed"', 1,
        )[1].split("</figure>", 1)[0]
        for phrase in (
            "One large PR, rubber-stamped", "law-time-run--rushed",
            "Smaller PRs, each properly reviewed",
            "lands sooner because it gets less scrutiny",
            "not because it is easier to review",
            "proper review one after another",
            "illustrative, not measured timings",
        ):
            self.assertIn(phrase, comparison)

    def test_homepage_links_to_the_law_only_from_miscellaneous(self):
        html, metadata = render_homepage()
        timeline = metadata["resume"]["timeline"]
        miscellaneous = html.split('<article id="miscellaneous"', 1)[1].split(
            "</article>", 1,
        )[0]
        self.assertIn('href="lutzs-law/"', miscellaneous)
        self.assertEqual(html.count('href="lutzs-law/"'), 1)
        self.assertNotIn('id="event-lutzs-law"', html)
        self.assertIn("Read the field guide", html)
        for item in timeline:
            for article in item.get("events", []):
                self.assertNotEqual(article["slug"], "lutzs-law")
                if "article" in article:
                    self.assertTrue(article["articleLabel"])
                    source = ROOT / "docs" / (article["article"].rstrip("/") + ".md")
                    self.assertTrue(source.is_file())


if __name__ == "__main__":
    unittest.main()
