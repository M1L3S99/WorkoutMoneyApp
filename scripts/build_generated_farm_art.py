"""Slice the generated Farm sprite sheets into compressed production assets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


CROP_COLUMNS = ("seeds", "planted", "grown", "crop")
CROP_SHEETS = (
    ("crop-1.png", ("radish", "lettuce", "spinach", "carrot")),
    ("crop-2.png", ("onion", "beetroot", "blueberry", "peas")),
    ("crop-3.png", ("potato", "strawberry", "pepper", "tomato")),
    ("crop-4.png", ("corn", "eggplant", "cabbage", "broccoli")),
    ("crop-5.png", ("pumpkin", "grapes", "melon", "dragonfruit")),
    ("crop-6.png", ("starfruit", "ancient-root")),
)
GEAR_SHEETS = (
    (
        "gear-1.png",
        (
            "meadow-treads",
            "dewrunner",
            "mossbound",
            "riverstone",
            "suntrail",
            "harvestmoon",
            "cloudstep",
            "starroot",
            "seedkeeper",
            "clayhand",
            "bramblegrip",
            "pollinator-touch",
            "moonweave",
            "greenfingers",
            "orchard-warden",
            "starlight-wraps",
        ),
    ),
    (
        "gear-2.png",
        (
            "raincall",
            "rootwake",
            "brookglass",
            "windrow",
            "silverleaf",
            "sunspoke",
            "goldenhour",
            "rainstaff",
        ),
    ),
)
FERTILISERS = (
    "speed-bronze",
    "speed-silver",
    "speed-gold",
    "speed-iridium",
    "quality-bronze",
    "quality-silver",
    "quality-gold",
    "quality-iridium",
)
NPCS = ("tilda", "bram", "nia")


def cell(sheet: Image.Image, index: int, grid_rows: int = 4) -> Image.Image:
    column = index % 4
    row = index // 4
    left = round(column * sheet.width / 4)
    top = round(row * sheet.height / grid_rows)
    right = round((column + 1) * sheet.width / 4)
    bottom = round((row + 1) * sheet.height / grid_rows)
    return sheet.crop((left, top, right, bottom))


def visible_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A").point(lambda value: 255 if value > 20 else 0)
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError("Sprite cell is empty after chroma-key removal")
    return bbox


def production_sprite(
    source: Image.Image,
    canvas_size: int,
    content_size: int,
) -> Image.Image:
    source = source.convert("RGBA").crop(visible_bbox(source))
    scale = min(content_size / source.width, content_size / source.height)
    width = max(1, round(source.width * scale))
    height = max(1, round(source.height * scale))
    source = source.resize((width, height), Image.Resampling.NEAREST)
    result = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    x = (canvas_size - width) // 2
    y = (canvas_size - height) // 2
    result.alpha_composite(source, (x, y))
    return result


def save_sprite(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True, compress_level=9)


def build_crops(sheets_dir: Path, output_dir: Path) -> list[Path]:
    created: list[Path] = []
    crops_dir = output_dir / "crops"
    for sheet_name, crop_ids in CROP_SHEETS:
        with Image.open(sheets_dir / sheet_name) as sheet:
            sheet = sheet.convert("RGBA")
            grid_rows = 3 if sheet_name == "crop-6.png" else 4
            for row, crop_id in enumerate(crop_ids):
                for column, kind in enumerate(CROP_COLUMNS):
                    target = 96 if kind == "seeds" else 64
                    content = 88 if kind == "seeds" else 60
                    suffix = {
                        "seeds": "seeds-96",
                        "planted": "planted-64",
                        "grown": "grown-64",
                        "crop": "crop-64",
                    }[kind]
                    path = crops_dir / f"{crop_id}-{suffix}.png"
                    save_sprite(production_sprite(cell(sheet, row * 4 + column, grid_rows), target, content), path)
                    created.append(path)
    return created


def build_gear(sheets_dir: Path, output_dir: Path) -> list[Path]:
    created: list[Path] = []
    gear_dir = output_dir / "gear"
    for sheet_name, item_ids in GEAR_SHEETS:
        with Image.open(sheets_dir / sheet_name) as sheet:
            sheet = sheet.convert("RGBA")
            grid_rows = 3 if sheet_name == "gear-2.png" else 4
            for index, item_id in enumerate(item_ids):
                path = gear_dir / f"{item_id}-96.png"
                save_sprite(production_sprite(cell(sheet, index, grid_rows), 96, 90), path)
                created.append(path)
    return created


def build_fertilisers(sheets_dir: Path, output_dir: Path) -> list[Path]:
    created: list[Path] = []
    fertiliser_dir = output_dir / "fertilisers"
    with Image.open(sheets_dir / "fertilisers.png") as sheet:
        sheet = sheet.convert("RGBA")
        for index, fertiliser_id in enumerate(FERTILISERS):
            path = fertiliser_dir / f"{fertiliser_id}-96.png"
            save_sprite(production_sprite(cell(sheet, index, 3), 96, 88), path)
            created.append(path)
    return created


def build_npcs(sheets_dir: Path, output_dir: Path) -> list[Path]:
    created: list[Path] = []
    npc_dir = output_dir / "npcs"
    with Image.open(sheets_dir / "npcs.png") as sheet:
        sheet = sheet.convert("RGBA")
        for index, npc_id in enumerate(NPCS):
            left = round(index * sheet.width / 3)
            right = round((index + 1) * sheet.width / 3)
            portrait = sheet.crop((left, 0, right, round(sheet.height / 2)))
            path = npc_dir / f"{npc_id}-96.png"
            save_sprite(production_sprite(portrait, 96, 94), path)
            created.append(path)
    return created


def contact_sheet(paths: list[Path], output_path: Path) -> None:
    thumb = 104
    columns = 10
    rows = (len(paths) + columns - 1) // columns
    preview = Image.new("RGBA", (columns * thumb, rows * thumb), (239, 234, 216, 255))
    draw = ImageDraw.Draw(preview)
    for index, path in enumerate(paths):
        with Image.open(path) as image:
            image = image.convert("RGBA")
            image.thumbnail((88, 88), Image.Resampling.NEAREST)
            x = index % columns * thumb + (thumb - image.width) // 2
            y = index // columns * thumb + 4
            preview.alpha_composite(image, (x, y))
        draw.text((index % columns * thumb + 3, index // columns * thumb + 92), path.stem[:16], fill=(48, 76, 53, 255))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    preview.convert("RGB").save(output_path, "WEBP", quality=88, method=6)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sheets-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()

    created = [
        *build_crops(args.sheets_dir, args.output_dir),
        *build_gear(args.sheets_dir, args.output_dir),
        *build_fertilisers(args.sheets_dir, args.output_dir),
        *build_npcs(args.sheets_dir, args.output_dir),
    ]
    if args.preview:
        contact_sheet(created, args.preview)
    total_bytes = sum(path.stat().st_size for path in created)
    print(f"Created {len(created)} sprites ({total_bytes / 1024:.1f} KiB)")


if __name__ == "__main__":
    main()
