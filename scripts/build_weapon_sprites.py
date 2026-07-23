"""Build compact, transparent 96px weapon sprites from keyed source PNGs."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


CANVAS_SIZE = 96
SUBJECT_SIZE = 84
PALETTE_COLORS = 32


def build_sprite(source: Path, destination: Path) -> tuple[int, tuple[int, int, int, int]]:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
    image.putalpha(alpha)
    bounds = alpha.getbbox()
    if not bounds:
        raise ValueError(f"No visible pixels found in {source}")

    subject = image.crop(bounds)
    scale = min(SUBJECT_SIZE / subject.width, SUBJECT_SIZE / subject.height)
    size = (
        max(1, round(subject.width * scale)),
        max(1, round(subject.height * scale)),
    )
    subject = subject.resize(size, Image.Resampling.NEAREST)

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    position = (
        (CANVAS_SIZE - subject.width) // 2,
        (CANVAS_SIZE - subject.height) // 2,
    )
    canvas.alpha_composite(subject, position)

    clean_alpha = canvas.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    opaque_rgb = Image.new("RGB", canvas.size, (0, 0, 0))
    opaque_rgb.paste(canvas.convert("RGB"), mask=clean_alpha)
    palette = opaque_rgb.quantize(
        colors=PALETTE_COLORS,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    )
    quantized = palette.convert("RGBA")
    quantized.putalpha(clean_alpha)

    destination.parent.mkdir(parents=True, exist_ok=True)
    quantized.save(destination, "PNG", optimize=True, compress_level=9)

    check = Image.open(destination).convert("RGBA")
    check_alpha = check.getchannel("A")
    check_bounds = check_alpha.getbbox()
    if check.size != (CANVAS_SIZE, CANVAS_SIZE) or not check_bounds:
        raise ValueError(f"Invalid output sprite {destination}")
    edge = CANVAS_SIZE - 1
    if any(check.getpixel(point)[3] for point in ((0, 0), (edge, 0), (0, edge), (edge, edge))):
        raise ValueError(f"Sprite corners are not transparent in {destination}")

    return destination.stat().st_size, check_bounds


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("destination_dir", type=Path)
    args = parser.parse_args()

    sources = sorted(args.source_dir.glob("*.png"))
    if not sources:
        raise SystemExit(f"No PNG files found in {args.source_dir}")

    for source in sources:
        destination = args.destination_dir / source.name
        size, bounds = build_sprite(source, destination)
        print(f"{destination.name}: {size} bytes, visible bounds {bounds}")


if __name__ == "__main__":
    main()
