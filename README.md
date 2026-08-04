# Ignite Interior Decors — website

Static site (HTML + CSS + vanilla JS). No build step, no framework, no
dependencies at runtime. Open `index.html` on any static host and it works.

The **only** tooling is a Python script that turns the client's raw photography
into web-ready images plus a data file.

---

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Homepage — hero, about, **Browse by Category**, process, services, testimonials, contact |
| `gallery.html` | Category hub — one card per category |
| `category.html` | Category gallery — `category.html?c=<slug>`, with lightbox |
| `styles.css` | All styling |
| `script.js` | All behaviour (category cards, masonry, lightbox, nav, carousels) |
| `gallery-data.js` | **Auto-generated.** Category + image data |
| `tools/build_gallery.py` | Generates `gallery-data.js` and the photo assets |
| `tools/build_icons.py` | Generates the favicon / app-icon set |
| `assets/gallery/<slug>/` | Optimised category photos (`-full` and `-thumb` WebP) |
| `assets/hero/` | Homepage hero banners |
| `assets/icons/` | App icons (32 / 180 / 192 / 512 / maskable) |
| `favicon.ico`, `favicon.svg` | Browser tab icons |
| `site.webmanifest` | PWA metadata |
| `ignite web site/` | Raw source photos — **input only**, git-ignored |

---

## Images are organised by category, not by project

Categories are defined in one place: the `CATEGORIES` list at the top of
`tools/build_gallery.py`. Each entry maps a source folder to a slug, display
name, and copy.

| Source folder | Slug | Shown as |
| --- | --- | --- |
| `LIVING ROOM` | `living-room` | Living Room |
| `kitchen` | `kitchen` | Kitchen |
| `BED ROOM` | `bedroom` | Bedroom |
| `HOME THE` | `home-theatre` | Home Theatre |
| `COMMERCIAL` | `commercial` | Commercial |

The order in that list is the order shown on the site.

### Adding or replacing photos

1. Drop image files into the right folder under `ignite web site/`.
   Filenames don't matter — they get renamed to `kitchen-01`, `kitchen-02`, …
   in sorted order.
2. Run the build:

```bash
python tools/build_gallery.py
```

3. Refresh the browser. The homepage, hub, and category pages all update —
   no HTML editing required.

### Adding a whole new category

Add a folder under `ignite web site/`, add one entry to `CATEGORIES` in
`tools/build_gallery.py`, re-run the build. Then add a link to it in the
"Categories" footer column of the three HTML files.

### What the build does

- Downscales to max 1600 px (`-full`) and 800 px (`-thumb`)
- Converts everything to WebP (also fixes CMYK JPEGs and EXIF rotation)
- Records real pixel dimensions so the masonry grid can compute row spans
- Writes `gallery-data.js`

Current result: **82.2 MB of source PNGs → 5.3 MB of WebP (94% smaller).**

Requires Pillow: `pip install Pillow`

---

## Brand icons

The full wordmark is unreadable at 16 px, so the tab icon uses the mark's
signature element: the lowercase **"i"** (circular dot + round-ended stem)
reversed out of the brand green gradient.

```bash
python tools/build_icons.py
```

Generates `favicon.ico` (16/32/48), plus `assets/icons/icon-{32,180,192,512}.png`
and a safe-zone-padded `icon-maskable-512.png` for Android adaptive icons.
`favicon.svg` is hand-maintained and stays crisp at any size.

Geometry and gradient stops live at the top of `build_icons.py` and are
mirrored in `favicon.svg` — change both together.

> **Careful:** `favicon.svg` is XML, so comments must never contain a double
> hyphen (`--`). Writing a CSS variable name like `--green-1` inside a comment
> silently breaks the whole file and the icon stops rendering.

## Transitions and animation

All motion is CSS transitions driven by class toggles — no animation library.

| Effect | Where | How |
| --- | --- | --- |
| Category card crossfade | homepage, hub | Photos stack absolutely; `.is-active` toggles opacity on a 3.4 s interval, staggered per card |
| Gallery swap | category tabs | `.masonry.is-swapping` fades the grid out, content is replaced, then it fades back in |
| Tile entrance | category page | `.tile.is-in` staggered ~55 ms apart |
| Lightbox slide + fade | lightbox | Two `<img>` buffers; incoming slides in from `--from`, outgoing slides the opposite way |
| Page-to-page | all pages | Cross-document View Transitions (`@view-transition`), ignored by browsers that lack it |

Everything is wrapped in `prefers-reduced-motion` guards, and the site still
renders correctly with JavaScript disabled (content simply isn't injected).

### Masonry

Row spans are computed in `script.js` from each image's real width/height:

```
span = ceil((columnWidth / aspectRatio + gap) / (gridAutoRows + gap))
```

so portrait and landscape shots interlock cleanly. It recalculates on resize.

---

## Links and address

Sourced from `ignite web site/Link&address.txt` and wired into the footer of all
three pages plus the homepage contact block:

- Instagram — <https://www.instagram.com/igniteinteriordecor/>
- YouTube — <https://www.youtube.com/@igniteinteriordecor>
- Threads — <https://www.threads.com/@igniteinteriordecor>
- Studio — 249-A Kannapa Nagar, Sanganoor, Coimbatore, Tamil Nadu 641027
  (links to Google Maps)

All external links use `target="_blank"` with `rel="noopener noreferrer"`.
The address uses a semantic `<address>` element so search engines can read it.

> **Note:** the Threads entry in the source file was a share URL with a tracking
> token (`threads.com/?xmt=…`) that points at the Threads homepage, not a
> profile. It has been replaced with the handle-based profile URL to match the
> Instagram and YouTube accounts — please confirm it resolves correctly.

---

## Local preview

Any static server works, e.g.:

```bash
python -m http.server 5500
```

Then open <http://localhost:5500>.
