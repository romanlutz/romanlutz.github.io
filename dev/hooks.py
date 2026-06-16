"""mkdocs hook that injects homepage data into index.md's metadata.

The homepage data (links, resume, maps) lives in separate files under
``dev/_data/`` so each section can be edited without touching index.md
or the other sections. This hook loads them and exposes them as
``page.meta.links``, ``page.meta.resume``, and ``page.meta.maps``
during build, matching the references in the theme template.

It also enriches link cards that declare a ``stats`` source with live
counts (GitHub stars/contributors, Semantic Scholar papers/citations,
Bluesky followers, Stack Overflow reputation). Stats are fetched at
build time and cached in ``dev/stats.json`` with a short TTL so local
``mkdocs serve`` rebuilds and offline/failed fetches fall back to the
last known values instead of hitting the network every time or breaking
the build.
"""

import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import yaml

_DATA_SECTIONS = ("links", "resume", "maps")

_STATS_TTL_SECONDS = 12 * 60 * 60
_HTTP_TIMEOUT = 8
_USER_AGENT = "romanlutz.github.io-build"

# Which live counts each link card can request, and where to fetch them.
_STATS_TARGETS = {
    "pyrit": {"kind": "github", "repo": "microsoft/PyRIT"},
    "fairlearn": {"kind": "github", "repo": "fairlearn/fairlearn"},
    "semanticscholar": {"kind": "semanticscholar", "author": "40451032"},
    "bluesky": {"kind": "bluesky", "actor": "romanlutz.bsky.social"},
    "stackoverflow": {"kind": "stackoverflow", "user": "11971317"},
}

_stats_cache = None


def _get_json(url, headers=None):
    request = urllib.request.Request(url, headers=headers or {})
    request.add_header("User-Agent", _USER_AGENT)
    with urllib.request.urlopen(request, timeout=_HTTP_TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8")), response.headers


def _github_headers():
    headers = {"Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _github_contributor_count(repo, headers):
    url = f"https://api.github.com/repos/{repo}/contributors?per_page=1&anon=false"
    body, response_headers = _get_json(url, headers)
    link = response_headers.get("Link", "") or ""
    match = re.search(r'[?&]page=(\d+)>;\s*rel="last"', link)
    if match:
        return int(match.group(1))
    return len(body)


def _fetch_github(target):
    headers = _github_headers()
    repo = target["repo"]
    data, _ = _get_json(f"https://api.github.com/repos/{repo}", headers)
    return {
        "stars": data.get("stargazers_count"),
        "contributors": _github_contributor_count(repo, headers),
    }


def _fetch_semanticscholar(target):
    url = (
        f"https://api.semanticscholar.org/graph/v1/author/{target['author']}"
        "?fields=paperCount,citationCount"
    )
    data, _ = _get_json(url)
    return {"papers": data.get("paperCount"), "citations": data.get("citationCount")}


def _fetch_bluesky(target):
    url = (
        "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile"
        f"?actor={target['actor']}"
    )
    data, _ = _get_json(url)
    return {"followers": data.get("followersCount"), "posts": data.get("postsCount")}


def _fetch_stackoverflow(target):
    url = f"https://api.stackexchange.com/2.3/users/{target['user']}?site=stackoverflow"
    data, _ = _get_json(url)
    item = (data.get("items") or [{}])[0]
    return {"reputation": item.get("reputation")}


_FETCHERS = {
    "github": _fetch_github,
    "semanticscholar": _fetch_semanticscholar,
    "bluesky": _fetch_bluesky,
    "stackoverflow": _fetch_stackoverflow,
}


def _format_count(value):
    if value is None:
        return None
    if value >= 10000:
        return f"{value / 1000:.1f}".rstrip("0").rstrip(".") + "k"
    return f"{value:,}"


def _format_stats(stat_id, values):
    if not values:
        return None

    def joined(*pairs):
        parts = []
        for key, suffix in pairs:
            text = _format_count(values.get(key))
            if text is not None:
                parts.append(f"{text} {suffix}".strip())
        return " · ".join(parts) or None

    if stat_id in ("pyrit", "fairlearn"):
        parts = []
        stars = _format_count(values.get("stars"))
        if stars is not None:
            parts.append(f"\u2605 {stars}")
        contributors = _format_count(values.get("contributors"))
        if contributors is not None:
            parts.append(f"{contributors} contributors")
        return " · ".join(parts) or None
    if stat_id == "semanticscholar":
        return joined(("papers", "papers"), ("citations", "citations"))
    if stat_id == "bluesky":
        return joined(("followers", "followers"), ("posts", "posts"))
    if stat_id == "stackoverflow":
        return joined(("reputation", "reputation"))
    return None


def _read_cache(cache_path):
    if not cache_path.exists():
        return None
    try:
        return json.loads(cache_path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return None


def _cache_is_fresh(cached):
    fetched_at = (cached or {}).get("fetched_at")
    if not fetched_at:
        return False
    try:
        timestamp = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
    except ValueError:
        return False
    age = (datetime.now(timezone.utc) - timestamp).total_seconds()
    return age < _STATS_TTL_SECONDS


def _load_stats(repo_dir):
    global _stats_cache
    if _stats_cache is not None:
        return _stats_cache

    cache_path = repo_dir / "stats.json"
    cached = _read_cache(cache_path)
    if cached and _cache_is_fresh(cached):
        _stats_cache = cached.get("stats", {})
        return _stats_cache

    # Start from prior values so a failed fetch keeps the last known count.
    values = dict((cached or {}).get("stats", {}))
    for stat_id, target in _STATS_TARGETS.items():
        fetcher = _FETCHERS.get(target["kind"])
        if fetcher is None:
            continue
        try:
            values[stat_id] = fetcher(target)
        except (urllib.error.URLError, OSError, ValueError, KeyError):
            # Keep any previously cached value for this id.
            pass

    try:
        cache_path.write_text(
            json.dumps(
                {
                    "fetched_at": datetime.now(timezone.utc).strftime(
                        "%Y-%m-%dT%H:%M:%SZ"
                    ),
                    "stats": values,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
    except OSError:
        pass

    _stats_cache = values
    return _stats_cache


def on_page_markdown(markdown, page, config, files):
    if page.file.src_uri != "index.md":
        return markdown

    data_dir = Path(config["config_file_path"]).parent / "_data"
    for name in _DATA_SECTIONS:
        page.meta[name] = yaml.safe_load(
            (data_dir / f"{name}.yml").read_text(encoding="utf-8")
        )

    stats = _load_stats(data_dir.parent)
    for link in page.meta.get("links") or []:
        # A literal ``statsText`` in YAML wins — used for sources without a
        # usable API (e.g. Google Scholar, which has no public API and blocks
        # automated access, so its count is hand-maintained).
        if link.get("statsText"):
            continue
        stat_id = link.get("stats")
        if not stat_id:
            continue
        text = _format_stats(stat_id, stats.get(stat_id))
        if text:
            link["statsText"] = text

    return markdown
