# Ironbound

Ironbound is a mobile-first push-up RPG. Camera-based pose tracking turns each complete push-up into an attack, while verified training builds XP, strength and dungeon progress.

## Game loop

- Start an AI push-up session from the Great Hall or while fighting a dungeon guardian.
- MediaPipe Pose Landmarker follows shoulder, elbow, wrist, hip and ankle points in the browser. A rep requires good depth, full extension and a straight body line.
- Every push-up earns XP. Dungeon reps also deal damage based on the equipped weapon.
- Defeat enemies for gold, unlock deeper floors, and buy stronger weapons in the Arsenal.
- Complete the adjustable daily push-up quest for a gold reward.
- Manual reps remain available on unsupported devices, but are identified as practice reps in combat.

## Oaths and Stripe

The existing Firebase authentication and Stripe billing system is preserved. A player can choose required push-up days, save a card with Stripe and activate an optional commitment Oath. Completing the daily target records the day through the existing backend; missed contracted days remain subject to the existing one-quarter forfeit rule.

Card details never pass through this repository. The Stripe secret remains in Firebase Functions.

## Run locally

Serve the repository with a static web server and open it through `localhost` or HTTPS. Camera tracking requires a secure browser context. There is no build step.

## Deployment

The repository is configured for GitHub Pages. `manifest.webmanifest` makes the site installable as a portrait mobile web app, and `sw.js` provides a network-first offline app shell.
