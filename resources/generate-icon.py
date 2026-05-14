#!/usr/bin/env python3
"""Generates resources/icon.png (1024x1024) and resources/splash.png (2732x2732).

These are the source images Capacitor's asset generator (@capacitor/assets)
expands into every icon/splash size iOS needs. Re-run this if you want to
tweak the placeholder art:  python3 resources/generate-icon.py

It draws a gold "V" on a dark-green background, matching the game's title
screen palette. No third-party libraries required (pure standard library).
"""
import struct
import zlib
import os

# Palette pulled from css/style.css
BG_TOP = (0x2e, 0x4a, 0x2e)
BG_BOTTOM = (0x1b, 0x2b, 0x1b)
GOLD = (0xff, 0xe2, 0x7a)
SHADOW = (0x00, 0x00, 0x00)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def dist_to_segment(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    cx, cy = ax + t * dx, ay + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def draw(size):
    """Returns a bytearray of RGB pixel rows for a size x size image."""
    s = size / 1024.0
    # "V" geometry, scaled to image size
    tlx, tly = 280 * s, 320 * s          # top-left tip
    bx, by = 512 * s, 740 * s            # bottom point
    trx, try_ = 744 * s, 320 * s         # top-right tip
    half = 78 * s                        # stroke half-width
    shadow_off = 14 * s

    rows = bytearray()
    for y in range(size):
        bg = lerp(BG_TOP, BG_BOTTOM, y / (size - 1))
        for x in range(size):
            # Shadow V (offset down-right)
            ds = min(
                dist_to_segment(x, y, tlx + shadow_off, tly + shadow_off,
                                bx + shadow_off, by + shadow_off),
                dist_to_segment(x, y, bx + shadow_off, by + shadow_off,
                                trx + shadow_off, try_ + shadow_off),
            )
            # Gold V
            dg = min(
                dist_to_segment(x, y, tlx, tly, bx, by),
                dist_to_segment(x, y, bx, by, trx, try_),
            )
            if dg <= half:
                px = GOLD
            elif ds <= half:
                px = SHADOW
            else:
                px = bg
            rows += bytes(px)
    return rows


def write_png(path, size):
    raw = draw(size)
    # Add the per-scanline filter byte (0 = none) PNG requires.
    stride = size * 3
    filtered = bytearray()
    for y in range(size):
        filtered.append(0)
        filtered += raw[y * stride:(y + 1) * stride]

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(bytes(filtered), 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(f"wrote {path} ({size}x{size})")


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    write_png(os.path.join(here, "icon.png"), 1024)
    write_png(os.path.join(here, "splash.png"), 2732)
