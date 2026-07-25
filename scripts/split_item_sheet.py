"""Split a generated item sheet into named chroma-key source cells."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("columns", type=int)
    parser.add_argument("rows", type=int)
    parser.add_argument("destination", type=Path)
    parser.add_argument("names", nargs="+")
    args = parser.parse_args()

    capacity = args.columns * args.rows
    if len(args.names) > capacity:
        raise SystemExit(f"{len(args.names)} names exceed the {capacity}-cell sheet")

    sheet = Image.open(args.source).convert("RGB")
    args.destination.mkdir(parents=True, exist_ok=True)

    for index, name in enumerate(args.names):
        column = index % args.columns
        row = index // args.columns
        left = round(column * sheet.width / args.columns)
        top = round(row * sheet.height / args.rows)
        right = round((column + 1) * sheet.width / args.columns)
        bottom = round((row + 1) * sheet.height / args.rows)
        destination = args.destination / f"{name}.png"
        sheet.crop((left, top, right, bottom)).save(
            destination,
            "PNG",
            optimize=True,
            compress_level=9,
        )
        print(f"{destination.name}: cell {column + 1},{row + 1} · {right-left}x{bottom-top}")


if __name__ == "__main__":
    main()
