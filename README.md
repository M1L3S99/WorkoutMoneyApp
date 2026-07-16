# Ironbound

Ironbound is a mobile-first push-up RPG. Camera-based pose tracking turns each complete push-up into an attack, while verified training builds XP, strength and dungeon progress.

## Game loop

- Start an AI push-up session from the Great Hall or while fighting a dungeon guardian.
- MediaPipe Pose Landmarker follows shoulder, elbow, wrist, hip and ankle points in the browser. A rep requires good depth, full extension and a straight body line.
- Every push-up earns XP. Dungeon reps also deal damage based on the equipped weapon.
- Defeat enemies for gold and occasional gems, then unlock harder dungeons.
- Buy equipment in the Market and equip weapons, armour and charms in Inventory.
- Choose daily quests in the Great Hall for gold and XP.
- Manual reps remain available on unsupported devices, but are identified as practice reps in combat.

## Gems and Stripe

Firebase authentication and Stripe billing are preserved. Signed-in players can save a card with Stripe and purchase fixed gem packs. Pack prices and gem awards are selected and verified by Firebase Functions, while duplicate submissions are protected with Stripe idempotency keys. Gems can also be earned in dungeons and exchanged for gold.

The Oath tab has been removed. Accounts with an older active Oath can remove it from Profile; no new Oaths are offered in the RPG interface.

Card details never pass through this repository. The Stripe secret remains in Firebase Functions.

## Sprite Lab

The in-app Sprite Lab accepts individual PNG, WebP or JPG frames and large sprite sheets. Sprite sheets are cut into cells from left to right, then top to bottom. Original source dimensions and colours are kept untouched; background removal, colour reduction and speck removal are optional export-time effects.

Each frame has its own anchor point so the same body point can remain centred across an animation. A pixel grid, whole-pixel placement, 1:1 source-pixel mode and a 16–512 output-definition control prevent accidental downscaling. Confirmed frames export as a variable-resolution sprite sheet or a ZIP containing individually named PNG files and an anchor manifest.

Uploaded artwork is processed locally in the browser and is not sent to Firebase or any other server. ZIP creation also happens locally.

## Run locally

Serve the repository with a static web server and open it through `localhost` or HTTPS. Camera tracking requires a secure browser context. There is no build step.

## Deployment

The repository is configured for GitHub Pages. `manifest.webmanifest` makes the site installable as a portrait mobile web app, and `sw.js` provides a network-first offline app shell.
