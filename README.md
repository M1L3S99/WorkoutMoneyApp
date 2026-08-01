# Ironbound

Ironbound is a mobile-first step farming game. Walking produces spendable steps and grows every planted crop; harvested crops can be sold for gold and experience.

## Farming loop

- Start with one planting plot and unlock up to twenty with gold.
- View the step ring, local weather and all farm plots together on one continuous meadow screen.
- Plant level-gated crops with different step requirements, experience rewards and sale values.
- Every walked step advances all active beds. The Android app keeps a native lifetime ledger so steps collected in the background remain available across day changes.
- Harvest crops in standard, Bronze, Silver, Gold or Iridium quality. Iridium has a 1% base chance.
- Sell harvested crops for gold; crop values scale from their walking requirements and progression level.
- Spend gold on permanent irrigation, soil-quality and market-value improvements.
- Spend steps on Boots, Gloves, Tools and single-use Fertiliser. Equipment improves crop growth, quality or sale value.

## Currency and progression

- **Steps** come only from walking and are used in the Country Store.
- **Gold** comes from selling crops and is used for new beds and farm upgrades.
- Harvesting awards experience. Higher-level crops require more steps but award more experience and gold.

## Background Android tracking

The Android wrapper uses the hardware step detector and cumulative step counter through a foreground health service. It stores both today’s steps and a lifetime total, displays an ongoing notification, restarts after reboot, and requests Physical Activity, notification and battery-optimization permissions through Android.

## Run locally

Serve the repository with a static web server:

```powershell
python -m http.server 4173
```

Open `http://127.0.0.1:4173`. The native Android wrapper is required for hardware and background step tracking.

Run the static farming checks with:

```powershell
node scripts/validate-farm-ui.cjs
```

## Deployment

The repository is configured for GitHub Pages. `manifest.webmanifest` provides the portrait install metadata, while `sw.js` uses a network-first app-shell cache so deployed updates remain fresh and the last successful version works offline.
