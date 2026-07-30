"""Build compact transparent Meadowstep UI v3 sprites from keyed ImageGen outputs."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "tmp" / "imagegen" / "ui-v3" / "keyed"
UI_DIR = ROOT / "assets" / "farm" / "ui-v3"
UPGRADE_DIR = ROOT / "assets" / "farm" / "upgrades-v3"
CONTACT_SHEET = ROOT / "tmp" / "imagegen" / "ui-v3" / "contact-sheet.png"

ASSETS = {
    "avatar-farmer.png": (UI_DIR / "avatar-96.png", 96, 6),
    "nav-farm.png": (UI_DIR / "nav-farm-64.png", 64, 5),
    "nav-shop.png": (UI_DIR / "nav-shop-64.png", 64, 5),
    "nav-quests.png": (UI_DIR / "nav-quests-64.png", 64, 5),
    "nav-silo.png": (UI_DIR / "nav-silo-64.png", 64, 5),
    "nav-upgrades.png": (UI_DIR / "nav-upgrade-64.png", 64, 5),
    "weather-partly-sunny.png": (
        UI_DIR / "weather-partly-sunny-64.png",
        64,
        5,
    ),
    "garden-paths.png": (UPGRADE_DIR / "garden-paths-192.png", 192, 7),
    "rain-barrel.png": (UPGRADE_DIR / "rain-barrel-192.png", 192, 8),
    "deep-beds.png": (UPGRADE_DIR / "deep-beds-192.png", 192, 8),
    "glass-cloche.png": (UPGRADE_DIR / "glass-cloche-192.png", 192, 8),
    "market-cart.png": (UPGRADE_DIR / "market-cart-192.png", 192, 8),
    "pollinator-garden.png": (
        UPGRADE_DIR / "pollinator-garden-192.png",
        192,
        8,
    ),
    "moon-irrigation.png": (
        UPGRADE_DIR / "moon-irrigation-192.png",
        192,
        8,
    ),
    "ancient-greenhouse.png": (
        UPGRADE_DIR / "ancient-greenhouse-192.png",
        192,
        8,
    ),
}


def alpha_bbox(image: Image.Image, threshold: int = 12) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A").point(lambda value: 255 if value > threshold else 0)
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError("Image contains no visible pixels")
    return bbox


def build_sprite(source: Path, destination: Path, size: int, padding: int) -> None:
    image = Image.open(source).convert("RGBA")
    image = image.crop(alpha_bbox(image))

    usable = size - (padding * 2)
    scale = min(usable / image.width, usable / image.height)
    width = max(1, round(image.width * scale))
    height = max(1, round(image.height * scale))
    image = image.resize((width, height), Image.Resampling.NEAREST)

    # Keep the palette compact without blurring deliberate pixel clusters.
    alpha = image.getchannel("A")
    rgb = image.convert("RGB").quantize(
        colors=128,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.NONE,
    ).convert("RGB")
    rgb.putalpha(alpha)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - width) // 2
    y = (size - height) // 2
    canvas.alpha_composite(rgb, (x, y))

    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, "PNG", optimize=True, compress_level=9)


def checkerboard(size: tuple[int, int], cell: int = 8) -> Image.Image:
    board = Image.new("RGBA", size, (244, 239, 222, 255))
    draw = ImageDraw.Draw(board)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if ((x // cell) + (y // cell)) % 2:
                draw.rectangle(
                    (x, y, min(x + cell - 1, size[0]), min(y + cell - 1, size[1])),
                    fill=(222, 214, 191, 255),
                )
    return board


def make_contact_sheet() -> None:
    outputs = [settings[0] for settings in ASSETS.values()]
    columns = 4
    cell_width = 236
    cell_height = 252
    rows = (len(outputs) + columns - 1) // columns
    sheet = Image.new(
        "RGBA",
        (columns * cell_width, rows * cell_height),
        (250, 247, 237, 255),
    )
    draw = ImageDraw.Draw(sheet)

    for index, path in enumerate(outputs):
        x = (index % columns) * cell_width
        y = (index // columns) * cell_height
        art_board = checkerboard((208, 208))
        art = Image.open(path).convert("RGBA")
        preview = art.copy()
        preview.thumbnail((192, 192), Image.Resampling.NEAREST)
        art_board.alpha_composite(
            preview,
            ((208 - preview.width) // 2, (208 - preview.height) // 2),
        )
        sheet.alpha_composite(art_board, (x + 14, y + 10))
        draw.text((x + 14, y + 222), path.name, fill=(50, 74, 50, 255))
        draw.text(
            (x + 14, y + 237),
            f"{art.width}x{art.height} · {path.stat().st_size // 1024} KB",
            fill=(105, 109, 91, 255),
        )

    CONTACT_SHEET.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(CONTACT_SHEET, "PNG", optimize=True, compress_level=9)


def validate_outputs() -> None:
    for destination, size, _padding in ASSETS.values():
        image = Image.open(destination).convert("RGBA")
        if image.size != (size, size):
            raise ValueError(f"{destination.name}: expected {size}x{size}, got {image.size}")
        if image.getchannel("A").getbbox() is None:
            raise ValueError(f"{destination.name}: output has no visible pixels")
        corners = (
            image.getpixel((0, 0))[3],
            image.getpixel((size - 1, 0))[3],
            image.getpixel((0, size - 1))[3],
            image.getpixel((size - 1, size - 1))[3],
        )
        if any(corners):
            raise ValueError(f"{destination.name}: expected transparent corners, got {corners}")
        print(
            f"{destination.relative_to(ROOT)} "
            f"{image.width}x{image.height} "
            f"{destination.stat().st_size // 1024} KB "
            "RGBA/corners-transparent"
        )


def main() -> None:
    for source_name, (destination, size, padding) in ASSETS.items():
        source = SOURCE_DIR / source_name
        if not source.exists():
            raise FileNotFoundError(source)
        build_sprite(source, destination, size, padding)
    validate_outputs()
    make_contact_sheet()


if __name__ == "__main__":
    main()
