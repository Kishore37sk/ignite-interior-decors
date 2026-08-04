#!/usr/bin/env python3
"""
Ignite Interior Decors - favicon / app icon generator.

The full "ignite interior decors" wordmark is far too wide to read at 16px,
so the browser-tab icon uses the mark's signature element instead: the
lowercase "i" (dot + stem) reversed out of the brand green gradient.

Geometry and colours below are kept in sync with favicon.svg and the
--green-* custom properties in styles.css.

Outputs (into assets/icons/, except favicon.ico which sits at the root):

    favicon.ico            16 + 32 + 48   legacy browsers
    icon-32.png            32             modern fallback
    icon-180.png           180            iOS home screen
    icon-192.png           192            Android / PWA
    icon-512.png           512            PWA splash
    icon-maskable-512.png  512            Android adaptive (safe-zone padded)

Run:  python tools/build_icons.py
Requires: Pillow
"""

import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "icons")

# Brand gradient stops (styles.css: --green-1, --green-2, --teal)
STOPS = [(0.00, (158, 216, 79)),    # #9ed84f lime
         (0.45, (53, 199, 106)),    # #35c76a green
         (1.00, (14, 181, 164))]    # #0eb5a4 teal

S = 512                 # master canvas
CORNER = int(S * 0.22)  # rounded-square radius

# The "i", drawn on the 512 grid and centred as a unit.
# The logo sets a geometric sans, so the dot is a true circle slightly
# wider than the stem, and the stem is ~3x its own width tall — that
# ratio is what makes it read as a letter rather than an "info" glyph.
DOT_R = 42
DOT_CY = 128
STEM_W = 74
STEM_TOP = 196
STEM_BOT = 426


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient_at(t):
    """Colour at position t (0..1) along the multi-stop gradient."""
    t = max(0.0, min(1.0, t))
    for i in range(len(STOPS) - 1):
        p0, c0 = STOPS[i]
        p1, c1 = STOPS[i + 1]
        if p0 <= t <= p1:
            return lerp(c0, c1, (t - p0) / (p1 - p0))
    return STOPS[-1][1]


def make_tile(size, inset=0):
    """Rounded-gradient square with the white 'i' knocked out.

    `inset` shrinks the artwork inside the canvas (used for the maskable
    icon, where Android may crop up to ~10% off each edge).
    """
    # Diagonal gradient at master resolution, then downsample for smoothness
    grad = Image.new("RGB", (S, S))
    px = grad.load()
    for y in range(S):
        for x in range(S):
            px[x, y] = gradient_at((x + y) / (2.0 * (S - 1)))

    # Rounded-square alpha mask
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], CORNER, fill=255)

    tile = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    tile.paste(grad, (0, 0), mask)

    # The "i" — dot + round-ended stem, in the cream used site-wide
    ink = (250, 248, 242, 255)
    d = ImageDraw.Draw(tile)
    cx = S // 2
    d.ellipse([cx - DOT_R, DOT_CY - DOT_R, cx + DOT_R, DOT_CY + DOT_R], fill=ink)
    d.rounded_rectangle([cx - STEM_W // 2, STEM_TOP, cx + STEM_W // 2, STEM_BOT],
                        STEM_W // 2, fill=ink)

    if inset:
        inner = S - 2 * inset
        shrunk = tile.resize((inner, inner), Image.LANCZOS)
        canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        canvas.paste(shrunk, (inset, inset), shrunk)
        tile = canvas

    return tile if size == S else tile.resize((size, size), Image.LANCZOS)


def build():
    os.makedirs(OUT, exist_ok=True)
    master = make_tile(S)

    for px_size in (32, 180, 192, 512):
        path = os.path.join(OUT, "icon-%d.png" % px_size)
        (master if px_size == S else master.resize((px_size, px_size), Image.LANCZOS)) \
            .save(path, "PNG", optimize=True)
        print("  icon-%d.png" % px_size)

    # Android adaptive icons get cropped — pad the artwork into the safe zone.
    make_tile(S, inset=int(S * 0.10)).save(
        os.path.join(OUT, "icon-maskable-512.png"), "PNG", optimize=True)
    print("  icon-maskable-512.png")

    # Multi-resolution .ico at the site root (browsers probe /favicon.ico)
    ico = os.path.join(ROOT, "favicon.ico")
    master.resize((48, 48), Image.LANCZOS).save(
        ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print("  favicon.ico  (16/32/48)")


if __name__ == "__main__":
    print("Building brand icons...")
    build()
    print("Done.")
