# RepDrop

RepDrop is a mobile-first exercise tracker with collectible rewards. It combines customizable daily routines with the existing native step counter; steps are displayed as activity data and are never used as currency.

## Daily loop

- Track pushups, squats and sit-ups against a different schedule for every weekday.
- Use the full-screen AI tracker prototype and its simulated detected-rep control. Browser pose detection is intentionally not implemented yet.
- Finish every scheduled requirement to turn the Today section green and claim 50 coins plus one mystery capsule once per day.
- Unlock burpees, mountain climbers, jumping jacks and future exercise types with the local exercise-pack prototype.

## Collections and shop

- Choose Bloom Atelier, Cosmic Crew or Snack Squad before opening each capsule.
- Each independent collection contains 10 card-shaped collectibles.
- A duplicate card returns 25 coins.
- Capsules cost 75 coins for one or 190 coins for three.
- The $3.99 pack control documents that payment processing is not connected and only unlocks locally.

Exercise counts, schedules, coins, capsules and collected cards are stored in local browser storage. The Android wrapper retains the native background pedometer and sends the current daily total into the web app.

## Run locally

Serve the repository with any static server, for example:

```powershell
python -m http.server 4173
```

Open `http://127.0.0.1:4173`. The installed Android wrapper is required for hardware and background step tracking.

Run the static product checks with:

```powershell
node scripts/validate-repdrop-ui.cjs
```

## Deployment

The repository deploys through GitHub Pages. The service worker caches the RepDrop shell and collectible artwork for offline use while checking the network first for deployed updates.
