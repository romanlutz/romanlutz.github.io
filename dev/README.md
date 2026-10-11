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

## Timeline publication galleries

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

They add no JavaScript, fonts, or external requests and are hidden from assistive
technology. On narrow screens the silhouettes remain above each chapter while
the existing full-width event panels remain unindented.

From the repository root, run `node --test dev\tests\skylines.test.cjs` when
changing the city mappings, silhouettes, template, or skyline styling.

## Section navigation

The section navbar is hidden below 1024px. At desktop widths, it is a fixed vertical
rail on the right, with matching page gutters to keep it clear of the content.
The timeline marker moves down the rail as you scroll through the chapters.

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