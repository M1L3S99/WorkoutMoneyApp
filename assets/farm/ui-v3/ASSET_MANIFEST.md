# Meadowstep UI v3 asset manifest

All assets in this pack were generated with the built-in ImageGen tool, using
flat `#ff00ff` chroma-key backgrounds. The installed
`remove_chroma_key.py` helper created alpha PNGs. The project-local
`scripts/build_ui_v3_assets.py` then crops visible bounds, fits the subject to
the requested square canvas with nearest-neighbour resampling, reduces the
palette without dithering, and saves optimized RGBA PNGs.

`seed-packet-frame-v1.png` is the intentional smooth-art exception. It was
generated as a reusable high-resolution packet shell, keyed to alpha, then
resampled to 384×384 with Lanczos filtering so its edges stay clean in the
Shop, detail sheet, and planting picker.

## Production outputs

| Output | Size | ImageGen source |
| --- | ---: | --- |
| `avatar-96.png` | 96×96 | `call_B6WhjOxM9vv2n1ScXJi9rf9M.png` |
| `nav-farm-64.png` | 64×64 | `call_52do1DQJ4qw9QYwOSqceV2gp.png` |
| `nav-shop-64.png` | 64×64 | `call_nQY0o1B9QSVgXDMg0hMJnC5Q.png` |
| `nav-quests-64.png` | 64×64 | `call_dk3fkfzEH2xXx97i8QrL5IF4.png` |
| `nav-silo-64.png` | 64×64 | `call_TM3KOprR49xdNdGBffPEHjW2.png` |
| `nav-upgrade-64.png` | 64×64 | `call_ErRgyEPNTNHv8xL35iN4PF7o.png` |
| `weather-partly-sunny-64.png` | 64×64 | `call_e0Z2FBSNvKyWsw5zCBDVYDZ8.png` |
| `seed-packet-frame-v1.png` | 384×384 | `exec-994d6924-2169-4042-9919-105f021d1121.png` |
| `../upgrades-v3/garden-paths-192.png` | 192×192 | `call_mEG1GYvqQebfHjD1CenIh3Ld.png` |
| `../upgrades-v3/rain-barrel-192.png` | 192×192 | `call_cvWtPGD0vqzdVOa866wQne3x.png` |
| `../upgrades-v3/deep-beds-192.png` | 192×192 | `call_akXtBLPbFaH3kaWx7rq0GxYE.png` |
| `../upgrades-v3/glass-cloche-192.png` | 192×192 | `call_jKrnQ1y9MkpJJ6RnATKpKHXH.png` |
| `../upgrades-v3/market-cart-192.png` | 192×192 | `call_t78utS6jf2nCVB3M5nWbexLm.png` |
| `../upgrades-v3/pollinator-garden-192.png` | 192×192 | `call_TlmepxsFZIuY9InuqeVR9ANh.png` |
| `../upgrades-v3/moon-irrigation-192.png` | 192×192 | `call_7abkDSS5R9nmDLmj5HB3noJj.png` |
| `../upgrades-v3/ancient-greenhouse-192.png` | 192×192 | `call_FGaMj3bufpoUVzOqbntEmvXv.png` |
| `../upgrades-v3/seed-ledger-192.png` | 192×192 | `call_5KHNEzEHOUY3q2DQdgep6908.png` |
| `../upgrades-v3/compost-bin-192.png` | 192×192 | `call_yOkXLmJdNLhptEbaV02OAQJd.png` |

## Shared visual specification

- Polished detailed 16-bit / early-32-bit farming-game pixel art.
- Crisp deliberate square pixel clusters, dark warm outline clusters, no blur,
  and no vector-smooth edges.
- Friendly earthy palette: forest greens, warm honey-brown wood, cream,
  harvest gold, pale blue highlights.
- One centered, fully visible subject with generous padding.
- No text, UI frame, border, watermark, cast shadow, contact shadow, or
  reflection.
- Flat uniform `#ff00ff` background with no texture or lighting variation.

The avatar, navigation icons, Garden Paths, and Rain Barrel sources were
generated earlier in the same Meadowstep UI design pass. The three prompts
added to complete the production pack are recorded below.

## Reusable seed packet prompt

> Create one reusable seed packet UI asset for a cozy mobile walking-and-farming
> game. Single front-facing seed packet, centered, upright, near-rectangular
> with gently rounded folded paper corners. Warm ivory kraft-paper body,
> consistent deep meadow-green top seal and bottom seal, very thin muted-gold
> piping, subtle hand-painted paper texture, polished storybook game
> illustration, smooth antialiased edges, high readability at 96 px. Leave the
> large central label completely blank and uncluttered so a separate crop
> illustration can be layered there later. No crop, no leaves, no seeds, no
> text, no letters, no numbers, no logo, no emblem, no badge, no watermark. No
> cast shadow and no ground plane. Surround the object with generous padding.
> Use a perfectly flat solid `#FF00FF` chroma-key background with no gradients,
> texture, lighting, or shadows in the background. Not pixel art, not
> photorealistic. Square asset.

## Deep Beds prompt

> Create one standalone “Deep Beds” upgrade illustration: a deep rectangular
> raised garden bed built from warm honey-brown timber, visibly taller than a
> normal planter, filled with very rich dark crumbly soil. Add a few tiny
> bright-green seedlings and subtle iron corner brackets. Use polished
> detailed 16-bit / early-32-bit farming-game pixel art with crisp square pixel
> clusters and dark brown outlines. Show exactly one raised bed from a front
> three-quarter view, centered and fully visible on a perfectly flat solid
> `#ff00ff` chroma-key background. No text, UI frame, shadow, or watermark.

## Glass Cloche prompt

> Create one standalone “Glass Cloche” upgrade illustration: a charming
> bell-shaped garden cloche covering three healthy seedlings in a small oval
> patch of rich soil. Render the cloche as thick stylized pale-aqua glass using
> opaque light-blue pixel clusters, strong white glints, and a dark teal rim.
> Use polished detailed 16-bit / early-32-bit farming-game pixel art with crisp
> square pixel clusters. Show exactly one centered cloche and soil base on a
> perfectly flat solid `#ff00ff` chroma-key background. No text, UI frame,
> shadow, or watermark.

## Partly sunny prompt

> Create one standalone partly-sunny weather icon: a cheerful golden sun
> peeking from behind one small soft white-and-pale-blue cloud. Give the sun
> short readable rays and let the cloud overlap it without hiding it. Use
> polished detailed 16-bit / early-32-bit pixel art with crisp deliberate
> square pixel clusters and dark warm outlines, readable at 32–64 pixels.
> Center the icon on a perfectly flat solid `#ff00ff` chroma-key background.
> No text, frame, shadow, reflection, or watermark.

## Market Cart prompt

> Create one standalone “Market Cart” upgrade illustration: a sturdy wooden
> farm market cart with large wooden wheels, a striped cream-and-forest-green
> awning, neatly arranged crates of colorful produce, and a tiny brass coin
> box. Use polished detailed 16-bit / early-32-bit farming-game pixel art with
> crisp square pixel clusters and dark brown outlines. Show exactly one cart
> from a front three-quarter view, centered and fully visible on a perfectly
> flat solid `#ff00ff` chroma-key background. No text, UI frame, shadow, or
> watermark.

## Pollinator Garden prompt

> Create one standalone “Pollinator Garden” upgrade illustration: a compact
> oval flower garden overflowing with lavender, daisies, yellow marigolds, and
> pink blossoms around a rustic wooden bee house, with two small readable
> honeybees. Use polished detailed 16-bit / early-32-bit farming-game pixel art
> with crisp square pixel clusters and dark natural outlines. Preserve one
> centered cohesive garden silhouette. The final removal source uses a flat
> `#00ffff` key so the pink and lavender flower pixels remain intact. No text,
> UI frame, shadow, or watermark.

## Moon Irrigation prompt

> Create one standalone “Moon Irrigation” upgrade illustration: a compact
> enchanted irrigation fountain made from dark slate stone, with a silver
> crescent-moon ornament, pale-blue flowing water, and a ring of healthy
> seedlings. Add restrained moon-blue highlights. Use polished detailed
> 16-bit / early-32-bit farming-fantasy pixel art with crisp square pixel
> clusters. Center the fully visible scene on a perfectly flat solid `#ff00ff`
> chroma-key background. No text, UI frame, shadow, or watermark.

## Ancient Greenhouse prompt

> Create one standalone “Ancient Greenhouse” upgrade illustration: a grand old
> greenhouse built from mossy warm stone foundations and dark bronze framing,
> with opaque pale-aqua glass panels, a rounded peaked roof, flourishing vines,
> and a warmly lit doorway showing a few seedlings. Use polished detailed
> 16-bit / early-32-bit farming-fantasy pixel art with crisp square pixel
> clusters. Show one centered, fully visible greenhouse on a perfectly flat
> solid `#ff00ff` chroma-key background. No text, UI frame, shadow, or
> watermark.

## Seed Ledger prompt

> Create one standalone “Seed Ledger” upgrade illustration: a rustic open farm
> ledger with warm cream pages, a worn honey-brown leather cover, decorative
> handwritten line marks, three colorful seed packets, a pressed green leaf,
> brass clasp, and simple page tabs. Use polished detailed 16-bit /
> early-32-bit farming-game pixel art with crisp square pixel clusters. Center
> the fully visible arrangement on a perfectly flat solid `#ff00ff` chroma-key
> background. No readable words or numbers, UI frame, shadow, or watermark.

## Compost Bin prompt

> Create one standalone “Compost Bin” upgrade illustration: a tidy square
> slatted wooden compost bin with warm honey-brown boards, dark iron corner
> brackets, rich finished compost, a few dry golden leaves, two small green
> clippings, and a simple wooden lid propped behind it. Use polished detailed
> 16-bit / early-32-bit farming-game pixel art with crisp square pixel
> clusters. Center the fully visible bin on a perfectly flat solid `#ff00ff`
> chroma-key background. No worms as a main focus, text, UI frame, shadow, or
> watermark.
