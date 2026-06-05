"""mkdocs hook that injects per-section YAML data into index.md's metadata.

The homepage data (links, resume, maps) lives in separate files under
``dev/_data/`` so each section can be edited without touching index.md
or the other sections. This hook loads them and exposes them as
``page.meta.links``, ``page.meta.resume``, and ``page.meta.maps``
during build, matching the references in the theme template.
"""

from pathlib import Path

import yaml

_DATA_SECTIONS = ("links", "resume", "maps")


def on_page_markdown(markdown, page, config, files):
    if page.file.src_uri != "index.md":
        return markdown

    data_dir = Path(config["config_file_path"]).parent / "_data"
    for name in _DATA_SECTIONS:
        page.meta[name] = yaml.safe_load((data_dir / f"{name}.yml").read_text(encoding="utf-8"))

    return markdown
