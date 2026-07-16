# Ironbound

Ironbound is a mobile-first push-up RPG. Camera-based pose tracking turns each complete push-up into an attack, while verified training builds XP, strength and dungeon progress.

## Game loop

- Start an AI push-up session from the Great Hall or while fighting a dungeon guardian.
- MediaPipe Pose Landmarker follows shoulder, elbow, wrist, hip and ankle points in the browser. A rep requires good depth, full extension and a straight body line.
- Every push-up earns XP. Dungeon reps also deal damage based on the equipped weapon and invested damage points.
- Swipe through F-, C-, A- and S-tier dungeons. Each selection shows its enemies, enemy hit chances, gold, gems and guaranteed crate.
- Enemy attacks stay dormant until the first push-up or the end of the five-second camera grace period. Combat shows the enemy at the top, the hero at the bottom, and a live attack timer and hit chance.
- Defeat a dungeon to reach a loot claim screen. Claiming currency immediately starts a slot-machine crate animation that awards a weapon, armour piece or charm.
- Buy equipment in the Market, win rarer equipment from crates, and equip weapons, armour and charms in Inventory.
- Choose daily quests in the Great Hall for gold and XP.
- Manual reps remain available on unsupported devices, but are identified as practice reps in combat.

## Levels, stats and loot

Every level after level 1 awards one spendable point. Damage adds 5% per point, Health adds 10 HP to the 100 HP base pool, Luck improves the weighting of rarer crate items, and Defence lowers each enemy's displayed hit chance. Equipment can add further damage, health, luck or defence.

Weapons and dungeons carry F-to-S ratings. Dungeon rewards use the existing server-verified gold and gem system; item rolls are stored in local RPG progress and duplicates are converted to bonus gold.

## Gems and Stripe

Firebase authentication and Stripe billing are preserved. Signed-in players can save a card with Stripe and purchase fixed gem packs. Pack prices and gem awards are selected and verified by Firebase Functions, while duplicate submissions are protected with Stripe idempotency keys. Gems can also be earned in dungeons and exchanged for gold.

The Oath tab has been removed. Accounts with an older active Oath can remove it from Profile; no new Oaths are offered in the RPG interface.

Card details never pass through this repository. The Stripe secret remains in Firebase Functions.

## Sprite Lab

The in-app Sprite Lab accepts individual PNG, WebP or JPG frames and large sprite sheets. Sprite sheets are cut into cells from left to right, then top to bottom. Original source dimensions and colours are kept untouched; background removal, colour reduction and speck removal are optional export-time effects.

Draw one reference box around a recognisable patch of pixels and Sprite Lab finds the closest lossless match in every frame. Each match receives a confidence score and becomes that frame's centre anchor; uncertain frames stay clearly marked for review. Previous, current and next views plus an adjustable onion-skin overlay make one-pixel drift easy to spot. A pixel grid, whole-pixel placement, 1:1 source-pixel mode and a 16–512 output-definition control prevent accidental downscaling. Confirmed frames export as a variable-resolution sprite sheet or a ZIP containing individually named PNG files and a matching/anchor manifest.

Uploaded artwork is processed locally in the browser and is not sent to Firebase or any other server. ZIP creation also happens locally.

## Run locally

Serve the repository with a static web server and open it through `localhost` or HTTPS. Camera tracking requires a secure browser context. There is no build step.

## Deployment

The repository is configured for GitHub Pages. `manifest.webmanifest` makes the site installable as a portrait mobile web app, and `sw.js` provides a network-first offline app shell.
