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
import logging
import os
import re
import urllib.error
import urllib.parse
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
    "github": {"kind": "githubuser", "user": "romanlutz"},
    "semanticscholar": {"kind": "semanticscholar", "author": "40451032"},
    "bluesky": {"kind": "bluesky", "actor": "romanlutz.bsky.social"},
    "stackoverflow": {"kind": "stackoverflow", "user": "11971317"},
}

_stats_cache = None
_stats_updated_at = {}
_log = logging.getLogger(__name__)


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


def _github_search_count(query, headers):
    # advanced_search=true matches the search mode GitHub is migrating to;
    # per_page=1 keeps the payload tiny since we only need total_count.
    encoded = urllib.parse.quote(query)
    url = (
        "https://api.github.com/search/issues"
        f"?q={encoded}&per_page=1&advanced_search=true"
    )
    data, _ = _get_json(url, headers)
    if data.get("incomplete_results"):
        raise ValueError("GitHub search returned incomplete results")
    return data.get("total_count")


def _fetch_githubuser(target):
    headers = _github_headers()
    user = target["user"]
    return {
        "prsMerged": _github_search_count(
            f"author:{user} type:pr is:merged", headers
        ),
        "reviews": _github_search_count(f"reviewed-by:{user} type:pr", headers),
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
    "githubuser": _fetch_githubuser,
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
    if stat_id == "github":
        return joined(("prsMerged", "PRs merged"), ("reviews", "PRs reviewed"))
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
        cached = json.loads(cache_path.read_text(encoding="utf-8"))
        if not isinstance(cached, dict) or not isinstance(cached.get("stats"), dict):
            raise ValueError("Expected a stats object")
        if not isinstance(cached.get("updated_at", {}), dict):
            raise ValueError("Expected per-source update timestamps")
        return cached
    except (ValueError, OSError) as error:
        _log.warning("Unable to read stats cache %s: %s", cache_path, error)
        return None


def _parse_timestamp(value):
    if not isinstance(value, str):
        return None
    try:
        timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return timestamp if timestamp.tzinfo is not None else None


def _cache_is_fresh(updated_at):
    timestamp = _parse_timestamp(updated_at)
    if timestamp is None:
        return False
    age = (datetime.now(timezone.utc) - timestamp).total_seconds()
    return 0 <= age < _STATS_TTL_SECONDS


def _valid_counts(values):
    return isinstance(values, dict) and bool(values) and all(
        isinstance(value, int) and not isinstance(value, bool) and value >= 0
        for value in values.values()
    )


def _load_stats(repo_dir):
    global _stats_cache, _stats_updated_at
    if _stats_cache is not None:
        return _stats_cache

    cache_path = repo_dir / "stats.json"
    cached = _read_cache(cache_path) or {}

    values = dict(cached.get("stats", {}))
    # The legacy global timestamp included failed fetches, so do not reuse it.
    updated_at = dict(cached.get("updated_at", {}))
    for stat_id, target in _STATS_TARGETS.items():
        if stat_id in values and not _valid_counts(values[stat_id]):
            _log.warning("Ignoring invalid cached stats for %s", stat_id)
            values.pop(stat_id)
            updated_at.pop(stat_id, None)
        if _parse_timestamp(updated_at.get(stat_id)) is None:
            updated_at.pop(stat_id, None)
        if stat_id in values and _cache_is_fresh(updated_at.get(stat_id)):
            continue
        try:
            fetched = _FETCHERS[target["kind"]](target)
            if not _valid_counts(fetched):
                raise ValueError("Source returned missing or invalid counts")
        except (urllib.error.URLError, OSError, ValueError, KeyError) as error:
            _log.warning(
                "Unable to refresh %s stats; keeping cached values (last success: %s): %s",
                stat_id, updated_at.get(stat_id, "unknown"), error,
            )
        else:
            values[stat_id] = fetched
            updated_at[stat_id] = datetime.now(timezone.utc).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            )

    snapshot = {"updated_at": updated_at, "stats": values}
    if snapshot != cached:
        try:
            cache_path.write_text(
                json.dumps(snapshot, indent=2) + "\n", encoding="utf-8"
            )
        except OSError as error:
            _log.warning("Unable to write stats cache %s: %s", cache_path, error)

    _stats_cache = values
    _stats_updated_at = updated_at
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
            link["statsNote"] = "Manually maintained"
            continue
        stat_id = link.get("stats")
        if not stat_id:
            continue
        text = _format_stats(stat_id, stats.get(stat_id))
        if text:
            link["statsText"] = text
            timestamp = _parse_timestamp(_stats_updated_at.get(stat_id))
            link["statsNote"] = (
                f"Updated {timestamp.date().isoformat()}"
                if timestamp else "Last update unknown"
            )

    return markdown
