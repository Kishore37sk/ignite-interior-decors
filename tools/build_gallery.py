#!/usr/bin/env python3
"""
Ignite Interior Decors - gallery build script.

Reads the raw client photography from "ignite web site/" (category folders with
unwieldy, space-and-comma filenames) and produces:

  assets/gallery/<category>/<category>-NN-full.webp    max 1600px, q82
  assets/gallery/<category>/<category>-NN-thumb.webp   max 800px,  q78
  assets/hero/hero-N.webp                              max 1920px, q82
  gallery-data.js                                      category-based data model

Re-run this any time images are added or replaced:

    python tools/build_gallery.py

Requires: Pillow  (pip install Pillow)
"""

import json
import os
import shutil

from PIL import Image, ImageOps

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "ignite web site")
OUT_GALLERY = os.path.join(ROOT, "assets", "gallery")
OUT_HERO = os.path.join(ROOT, "assets", "hero")

FULL_MAX = 1600
THUMB_MAX = 800
HERO_MAX = 1920
FULL_Q = 82
THUMB_Q = 78

# Source folder -> category definition. Order here is the order shown on site.
CATEGORIES = [
    {
        "folder": "LIVING ROOM",
        "slug": "living-room",
        "name": "Living Room",
        "blurb": "Sociable, light-filled living spaces layered with texture and warmth.",
        "description": (
            "The living room sets the tone for the whole home. We plan for how you "
            "actually gather — sightlines, seating that works for two or twelve, and "
            "lighting that carries the room from morning coffee to late-evening company."
        ),
    },
    {
        "folder": "kitchen",
        "slug": "kitchen",
        "name": "Kitchen",
        "blurb": "Hard-working modular kitchens engineered down to the last millimetre.",
        "description": (
            "A kitchen has to earn its keep every single day. We balance the work "
            "triangle, storage and ventilation against the finishes you fell in love "
            "with — so the room looks effortless and cooks even better."
        ),
    },
    {
        "folder": "BED ROOM",
        "slug": "bedroom",
        "name": "Bedroom",
        "blurb": "Restful private retreats with bespoke wardrobes and soft, quiet palettes.",
        "description": (
            "Bedrooms are the one room designed purely for you. We keep the palette "
            "calm, hide the clutter in bespoke joinery, and layer lighting so the room "
            "winds down as the evening does."
        ),
    },
    {
        "folder": "HOME THE",
        "slug": "home-theatre",
        "name": "Home Theatre",
        "blurb": "Acoustically considered media rooms built for immersive movie nights.",
        "description": (
            "A proper home theatre is equal parts acoustics and atmosphere. We treat "
            "the surfaces, conceal the equipment, and tune the seating and lighting so "
            "the room disappears the moment the film starts."
        ),
    },
    {
        "folder": "COMMERCIAL",
        "slug": "commercial",
        "name": "Commercial",
        "blurb": "Offices, showrooms and retail that put your brand to work.",
        "description": (
            "Commercial interiors carry a heavier brief: brand, footfall, durability "
            "and budget all at once. We design spaces that impress your visitors and "
            "still hold up beautifully years into daily use."
        ),
    },
]

# Root-level banner images used for the homepage hero carousel.
# BANNER3 and BANNER5 are intentionally excluded (client request).
HERO_SOURCES = ["BANNER1.png", "BANNER 2.png", "BANNER4.png"]

# Decorative one-off images: source filename -> output path.
# BANNER5 is reused as the faded texture behind the dark footer.
DECOR_SOURCES = {"BANNER5.png": "assets/decor/footer-bg.webp"}


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def load_rgb(path):
    """Open an image and normalise it to RGB (handles CMYK, palette, EXIF rotation)."""
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    if im.mode != "RGB":
        im = im.convert("RGB")
    return im


def fit(im, max_edge):
    """Downscale so the longest edge is at most max_edge. Never upscales."""
    w, h = im.size
    scale = min(1.0, float(max_edge) / max(w, h))
    if scale >= 1.0:
        return im.copy()
    return im.resize((max(1, int(round(w * scale))), max(1, int(round(h * scale)))),
                     Image.LANCZOS)


def save_webp(im, path, quality):
    im.save(path, "WEBP", quality=quality, method=6)
    return os.path.getsize(path)


def fresh_dir(path):
    """Clear previously generated images, keeping the directories.

    Deliberately avoids shutil.rmtree: this project lives inside a
    OneDrive folder, and the sync client (or antivirus) can hold a
    handle on a directory long enough that rmdir fails with
    PermissionError even when every file inside was removed. Only the
    .webp files this script produces are deleted, so a locked directory
    can never break the build.
    """
    if not os.path.isdir(path):
        os.makedirs(path, exist_ok=True)
        return
    for root, _dirs, files in os.walk(path):
        for name in files:
            if name.lower().endswith(".webp"):
                try:
                    os.remove(os.path.join(root, name))
                except OSError as exc:
                    print("  ! could not remove %s (%s)" % (name, exc))


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------

def build():
    if not os.path.isdir(SOURCE):
        raise SystemExit("Source folder not found: %s" % SOURCE)

    fresh_dir(OUT_GALLERY)
    fresh_dir(OUT_HERO)

    src_bytes = 0
    out_bytes = 0
    categories = []

    for cat in CATEGORIES:
        folder = os.path.join(SOURCE, cat["folder"])
        if not os.path.isdir(folder):
            print("  ! missing folder, skipped: %s" % cat["folder"])
            continue

        names = sorted(f for f in os.listdir(folder)
                       if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")))
        if not names:
            print("  ! no images in %s" % cat["folder"])
            continue

        out_dir = os.path.join(OUT_GALLERY, cat["slug"])
        os.makedirs(out_dir, exist_ok=True)

        images = []
        for i, name in enumerate(names, start=1):
            src_path = os.path.join(folder, name)
            src_bytes += os.path.getsize(src_path)

            im = load_rgb(src_path)
            stem = "%s-%02d" % (cat["slug"], i)

            full = fit(im, FULL_MAX)
            full_rel = "assets/gallery/%s/%s-full.webp" % (cat["slug"], stem)
            out_bytes += save_webp(full, os.path.join(ROOT, full_rel), FULL_Q)

            thumb = fit(im, THUMB_MAX)
            thumb_rel = "assets/gallery/%s/%s-thumb.webp" % (cat["slug"], stem)
            out_bytes += save_webp(thumb, os.path.join(ROOT, thumb_rel), THUMB_Q)

            w, h = full.size
            images.append({
                "id": stem,
                "full": full_rel,
                "thumb": thumb_rel,
                "w": w,
                "h": h,
                # Portrait images get a taller grid cell.
                "orientation": "portrait" if h > w else "landscape",
                "alt": "%s interior design by Ignite Interior Decors — view %d"
                       % (cat["name"], i),
            })

        # Cover: prefer the first landscape shot, else the first image.
        cover = next((im for im in images if im["orientation"] == "landscape"), images[0])

        categories.append({
            "slug": cat["slug"],
            "name": cat["name"],
            "blurb": cat["blurb"],
            "description": cat["description"],
            "count": len(images),
            "cover": cover["full"],
            "coverThumb": cover["thumb"],
            "images": images,
        })
        print("  %-13s %2d images" % (cat["name"], len(images)))

    # ---- hero banners ----
    heroes = []
    for i, name in enumerate(HERO_SOURCES, start=1):
        src_path = os.path.join(SOURCE, name)
        if not os.path.isfile(src_path):
            print("  ! missing banner, skipped: %s" % name)
            continue
        src_bytes += os.path.getsize(src_path)
        im = load_rgb(src_path)
        rel = "assets/hero/hero-%d.webp" % i
        out_bytes += save_webp(fit(im, HERO_MAX), os.path.join(ROOT, rel), FULL_Q)
        heroes.append(rel)
    print("  %-13s %2d images" % ("Hero", len(heroes)))

    # ---- decorative one-offs (footer texture) ----
    decor = 0
    for name, rel in DECOR_SOURCES.items():
        src_path = os.path.join(SOURCE, name)
        if not os.path.isfile(src_path):
            print("  ! missing decor image, skipped: %s" % name)
            continue
        src_bytes += os.path.getsize(src_path)
        out_path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        out_bytes += save_webp(fit(load_rgb(src_path), HERO_MAX), out_path, FULL_Q)
        decor += 1
    print("  %-13s %2d images" % ("Decor", decor))

    write_data(categories, heroes)

    print("\n  source %.1f MB  ->  output %.1f MB  (%.0f%% smaller)"
          % (src_bytes / 1048576.0, out_bytes / 1048576.0,
             100 * (1 - out_bytes / float(src_bytes)) if src_bytes else 0))


def write_data(categories, heroes):
    """Emit gallery-data.js — the single source of truth consumed by the pages."""
    payload = {"hero": heroes, "categories": categories}
    body = json.dumps(payload, indent=2, ensure_ascii=False)
    js = (
        "/* =========================================================\n"
        "   Ignite Interior Decors — gallery data (AUTO-GENERATED)\n"
        "\n"
        "   Do not edit by hand. Add or replace images under\n"
        "   \"ignite web site/<CATEGORY>/\" and re-run:\n"
        "\n"
        "       python tools/build_gallery.py\n"
        "\n"
        "   Category names, blurbs and ordering live in that script.\n"
        "   ========================================================= */\n"
        "window.IGNITE_GALLERY = " + body + ";\n"
    )
    with open(os.path.join(ROOT, "gallery-data.js"), "w", encoding="utf-8") as fh:
        fh.write(js)


if __name__ == "__main__":
    print("Building gallery from: %s\n" % SOURCE)
    build()
    print("\nDone. Wrote gallery-data.js")
