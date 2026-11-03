# romanlutz.github.io

Roman Lutz's website

## Development process

To try it out locally, install the pinned dependencies and serve the site from the `dev` directory:

```
pip install -r requirements.txt
mkdocs serve
```

Then just push to `main` to trigger a rebuild.

## Visual presentation

`theme/styles.css` controls the site's charcoal and green theme, timeline and
media radii, and responsive layout. The header retains its original centered
portrait and name. Profile links retain the original three-column grid, switching
to a single column at 768px and below. Their separate container preserves the
original widths and gutters without narrowing the timeline. On small screens,
the timeline uses a single rail and wider event panels instead of nested
indentation. Website copy and data remain in `mkdocs.yml` and `_data/`.
The root `color-scheme: dark` declaration styles native browser controls.
Keep the `theme-color` metadata in `theme/main.html` in sync with `--bg-primary`.

## Profile statistics

`hooks.py` fetches counts at build time and caches them in `stats.json`. Each
source has its own `updated_at` timestamp and 12-hour freshness window. Failed
or incomplete responses are logged and retain both the previous counts and
their original successful-update date. The legacy global `fetched_at` field
is not treated as proof of a successful fetch.

Cards show the last successful update date. Literal `statsText` values in
`_data/links.yml`, such as Google Scholar's counts, are labeled "Manually
maintained" and are not overwritten by an API. A cached value without a known
successful timestamp is labeled "Last update unknown".

Run the cache and metadata regression tests from the repository root with
`uv run --no-project --with-requirements dev\requirements.txt python -m unittest discover -s dev\tests -p "test_stats.py"`.

## Travel maps and closing section

The maps fill all listed places, including airport stopovers, with green-tinted
flags. Other places remain gray. Hovering, focusing, or tapping a place restores
its flag's full color and reveals its name in a stable detail strip below the
map. Mouse hover clears on leaving the region; keyboard focus and touch
selection remain usable independently. Stopovers remain highlighted but are
labeled separately in the detail strip. Keyboard users can focus a region and
press Enter or Space; Escape clears the selection.

Each island gets its own flag pattern, but each country or state has only one
keyboard stop. The shared SVG color matrix preserves flag detail and opacity
while mapping luminance to the site's green palette.
Flag loading failures are logged without losing the selected place's name.
Atlas and rendering failures are logged and show an explanatory message with a
keyboard-accessible "Retry map" button. A retry clears the previous error and
reloads only that map; loading state is exposed through `aria-busy`.
An alphabetical place list is built from `_data/maps.yml` beneath each map,
with separate visited and airport-stopover groups. Keep each place's readable
`label` alongside its existing code and `visited` flag. The native disclosure
works without JavaScript or atlas data and opens automatically if a map fails.
Without JavaScript, the unused map panels stay hidden rather than leaving gaps.

`maps.js` is deferred. An `IntersectionObserver` starts each map within 300px of
the viewport, then downloads D3, TopoJSON, and that map's atlas. Both maps share
library promises, including concurrent loads; retries reload only a failed
library. Browsers without `IntersectionObserver` initialize after HTML parsing.
Place lists do not depend on these scripts or network requests.

The closing section keeps the Git illustration and its source credit as a
personal aside, followed by LinkedIn, GitHub, and back-to-top links.

From the repository root, run `node --test dev\tests\maps.test.cjs` when changing
map rendering, interaction, or flag selection.

## Timeline publication galleries

Timeline logos, event images, publication galleries, the closing illustration,
and YouTube embeds use native lazy loading. Images also decode asynchronously.
The portrait and above-fold profile icons remain eager. Browsers decide when
nearby media should load; collapsed archive entries do not need to fetch their
images before they are shown.

All images include width/height metadata so their aspect ratio is known before
loading. Set `imageWidth`/`imageHeight` for profile-card and single-event images,
and `logoWidth`/`logoHeight` for chapter logos. Use the actual image dimensions
(browser-reported natural dimensions for SVGs); CSS still controls the displayed
size. Gallery items continue to use their existing `width`/`height` fields.
The closing illustration uses intrinsic dimensions with responsive CSS sizing.

The Pete Carroll and Thomas Rawls photographs use 480px, 960px, and 1440px WebP
variants through `imageSrcset` (`image` and `width` per source) and `imageSizes`.
The 960px file is the fallback `image`. Automatic sizes use the actual lazy
image layout where supported, with explicit responsive size hints as a fallback.
Keep the original JPEGs as source assets and for existing direct links.

To regenerate these six files, apply EXIF orientation, convert to RGB, resize
with Pillow's Lanczos filter while retaining the aspect ratio, and save WebP at
quality 82 with method 6. The current variants were generated with Pillow 12.3.0.
The two 480px files total 95,866 bytes versus 3,963,534 bytes for the originals
(97.6% smaller); even the two largest variants total only 604,716 bytes.
Run `uv run --no-project --with-requirements dev\requirements.txt python -m unittest discover -s dev\tests -p "test_content.py"`
to check image metadata, responsive sources, payload limits, and static place lists.

An event in `_data/resume.yml` can specify a `gallery` instead of a single
`image`. Each gallery item provides an `image` filename from `theme/images/`,
`imageAlt`, `caption`, and the image's `width` and `height`; set `url` when the
image and caption should link to the original publication. The first item is
the featured cover, with the remaining two stacked beside it on wider screens
and all three stacked on mobile. A gallery containing one item uses the full
available width and the image's natural aspect ratio. Events without a gallery
continue to use the existing single-image or video layouts.

The October 2026 update includes `theme/images/mlcommons-jailbreak-taxonomy.svg`,
a top-down redraw of Figure 2 on page 18 of
[MLCommons Jailbreak Benchmark v1.0](https://arxiv.org/abs/2610.02827v1).
The SVG preserves every node and parent-child relationship shown in that figure,
includes source attribution and the paper's CC BY 4.0 license, and opens at full
size when its image or caption is activated. It adds no scripts or external
fonts. Run `node --test dev/tests/taxonomy.test.cjs` when changing the diagram.

## Timeline skyline borders

Each chapter in `_data/resume.yml` can opt into a skyline-shaped upper border
with `skylines: [seattle]`. The available silhouettes in `theme/images/skylines/`
are Seattle, Boston, Tübingen, UMass Amherst, Frankfurt, and Ulm. The
Cambridge/Bellevue chapter uses `[boston, seattle]`; both Amherst chapters share
the two-building silhouette of Du Bois Library and Old Chapel.
Chapters without `skylines` retain their original rounded cards.

Adjacent cities have a spaced, decorative vertical divider that extends above
both skylines through the full cap height. Only its top 8px fade, so it is not
mistaken for another landmark. The green roofline fades toward both outer edges,
including when the illustrations shrink to fill the available width. Skyline
cards keep the same upper and lower corner radius. The frameless mobile chapters
retain their original layout and full-width caps.

The six SVGs are original landmark-led illustrations, not traced stock artwork.
They use distinctive roof shapes, open structural supports, clocks, window bands,
and restrained facade detail rather than attempting photographic realism.
Seattle includes the Space Needle, Smith Tower, Columbia Center, Lumen Field's
arched roofs at the far right, and Mount Rainier in a separate background layer.
Boston includes the Zakim Bridge, Prudential and Hancock towers, the Custom House
clock tower, and State House dome. Tübingen combines the Neckarfront's gabled
houses, bridge, Hölderlin Tower, Stiftskirche, and castle. Frankfurt includes
Messeturm, Commerzbank Tower, Main Tower, Europaturm, the Alte Oper, and cathedral.
Ulm centers the Minster's Gothic spire, with the town hall, Metzgerturm,
Schwörhaus, and a Danube bridge.

UMass has only Old Chapel and Du Bois Library. The library's height is 188 SVG
units and the chapel's is 82, including its finial, so the chapel is 43.6% as
tall. Keep it at or below 45% when editing the geometry. The regression test
measures the actual roofline coordinates rather than trusting the description.

All illustrations use a `960 200` viewBox and are included inline by
`theme/main.html`. The existing charcoal fill and green outline come from
`theme/styles.css`; lighter green details and a quieter mountain layer preserve
the site's palette. Open roofline paths join the cards without a second flat
border underneath the buildings. They preserve their proportions and one-pixel
outlines as they scale, with space for two cities side by side. The SVGs have
named `data-landmark` groups for maintainable detail and geometric checks,
without IDs that could conflict when a city appears more than once.

To keep the one-pixel lines crisp, horizontal and vertical edges sit on a 4-unit
grid. Setbacks are at least 8 units, details end exactly on an outline, and thin
masts are drawn as zero-width roofline spikes. The skyline height is rounded to a
multiple of 50px where CSS `round()` is supported, so each grid line maps to a
whole pixel. A half-pixel offset then puts each stroke on a single row of pixels,
level with the cards' ground line. Keep new geometry on this grid.

They add no JavaScript, fonts, or external requests and are hidden from assistive
technology. On narrow screens the silhouettes remain above each chapter while
the existing full-width event panels remain unindented.

From the repository root, run `node --test dev\tests\skylines.test.cjs` when
changing the city mappings, silhouettes, template, or skyline styling.

## Section navigation

The first keyboard stop is a "Skip to content" link, revealed on focus. It moves
focus to the main landmark without adding that landmark to the normal tab order.
It works without JavaScript and remains available at every viewport width.

The section navbar is hidden below 1024px. At desktop widths, it is a fixed vertical
rail on the right, with matching page gutters to keep it clear of the content.
The timeline marker moves down the rail as you scroll through the chapters and
updates when a chapter is expanded or collapsed.

## Collapsible timeline chapters

The first (current) chapter starts expanded. Earlier chapters show their skyline,
title, time period, location, and logo, with their individual entries collapsed.
Each chapter with entries has a "Show N entries" / "Hide N entries" control;
chapters without entries have no control. Native `details` and `summary` elements
keep the interaction usable with a mouse, touch, keyboard, and JavaScript disabled.
Chapter navigation links continue to target the always-visible chapter header.

From the repository root, run `node --test dev\tests\timeline.test.cjs` when
changing the disclosure markup or its navigation integration.

## Interactive portrait

The homepage keeps the original color photo and 168px circular frame. With a
mouse or hovering pen, the head follows the pointer in eight directions around a
neutral pose. Click the portrait, tap it on a touch device, or focus its button
and press Enter or Space to wink. Repeated clicks do not queue extra winks.
Touch scrolling does not move the head.

`theme/portrait.js` progressively enhances the original image in `theme/main.html`.
It preloads and decodes the needed frames before enabling each interaction.
Touch-only devices load just the wink frames. Reduced-motion preferences disable
the effect, including when the preference changes after the page has loaded.
Leaving the window, switching tabs, or scrolling the portrait offscreen stops
the animation. JavaScript-disabled browsers keep the original image. An asset
failure restores that same image, hides the button, and logs the failing URL.

### Portrait frames

`theme/images/profile.jpg` remains the neutral pose, fallback, and social-sharing
image. Do not overwrite it when replacing animation frames. The ten additional
files in `theme/images/portrait/` are 336px-square WebP images:

```text
up-left.webp     up.webp          up-right.webp
left.webp       (profile.jpg)    right.webp
down-left.webp   down.webp        down-right.webp

wink-half.webp   wink.webp
```

Directions are from the viewer's perspective. The wink sequence uses the
forward-facing pose, partially closed eye, closed eye, partially closed eye, and
forward-facing pose again. It then returns to the latest pointer direction.

The shipped frames come from Roman's supplied GPT Image pose and wink sheets.
The poses were cropped and aligned to the original portrait. The wink sheet's
white margins were removed, and its eye frames were aligned and composited onto
the original so the smile, framing, and background do not jump during the wink.
The website ships only the pre-rendered images; it makes no image-generation
API calls and does not upload photos or pointer data.

To replace the frames, generate or photograph the same poses with consistent
likeness, framing, background, lighting, clothing, and head scale. Inspect them
together before export, including at the actual 168px display size. Crop and
resize to 336px square without circular masks, export with the filenames above,
and keep the combined size at or below 300 KiB. Avoid mirroring opposite poses
or using a tilted copy of the original as a head turn.

### Regression tests

From the repository root, run:

```text
node --test dev/tests/portrait.test.cjs
```

The tests use Node's built-in runner with no npm dependencies. They cover pose
selection, jitter prevention, input modes, loading and decoding failures,
repeated activation, cancellation, preference changes, and the frame asset
shape and size budget. Run them before a strict MkDocs build when changing the
images or interaction. Also check the rendered effect with mouse, keyboard,
touch, and reduced motion. The existing Pages deployment workflow is unchanged.