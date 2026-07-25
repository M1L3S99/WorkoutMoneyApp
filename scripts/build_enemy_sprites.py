"""Build compact, higher-definition transparent combat sprites."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


CANVAS_SIZE = 256
SUBJECT_SIZE = 232
PALETTE_COLORS = 96


def build_sprite(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
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

    clean_alpha = canvas.getchannel("A").point(lambda value: 255 if value >= 96 else 0)
    opaque_rgb = Image.new("RGB", canvas.size, (0, 0, 0))
    opaque_rgb.paste(canvas.convert("RGB"), mask=clean_alpha)
    palette = opaque_rgb.quantize(
        colors=PALETTE_COLORS,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    )
    output = palette.convert("RGBA")
    output.putalpha(clean_alpha)

    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination, "PNG", optimize=True, compress_level=9)

    check = Image.open(destination).convert("RGBA")
    if check.size != (CANVAS_SIZE, CANVAS_SIZE) or not check.getchannel("A").getbbox():
        raise ValueError(f"Invalid output sprite {destination}")

    print(f"{destination.name}: {destination.stat().st_size} bytes")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("destination_dir", type=Path)
    args = parser.parse_args()

    sources = sorted(args.source_dir.glob("*.png"))
    if not sources:
        raise SystemExit(f"No PNG files found in {args.source_dir}")

    for source in sources:
        build_sprite(source, args.destination_dir / source.name)


if __name__ == "__main__":
    main()
