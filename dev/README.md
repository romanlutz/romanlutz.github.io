# romanlutz.github.io

Roman Lutz's website

## Development process

To try it out locally, install the pinned dependencies and serve the site from the `dev` directory:

```
pip install -r requirements.txt
mkdocs serve
```

Then just push to `main` to trigger a rebuild.

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