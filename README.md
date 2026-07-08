# WorkoutMoneyApp

A commitment-device workout app. Set a daily exercise regimen, verify each
workout in front of an AI (webcam pushup counter), then optionally put money
on the line: miss two scheduled days in a row and you forfeit half your balance.

## Two versions

- **Web** — `index.html` at the repo root. Open it in a browser; no install needed.
- **Mobile (Expo Go)** — in the [`mobile/`](mobile/) folder. Run it on your phone
  through the free Expo Go app. See [`mobile/README.md`](mobile/README.md).

## Run the web version

Open `index.html` in a modern browser (Chrome, Edge, or Safari). Allow camera
access when prompted so the AI can count your reps. No install or server needed.

## Features

- **Regimen** — choose an exercise and target reps for each weekday, mark rest days.
- **AI verification** — the webcam + pose detection counts real pushups (elbow
  angle: down then up = one rep). Reaching your target auto-logs the day. A
  manual "I did it" button is available if the camera/AI can't load.
- **Contract & invest** — pick a preset stake or a custom amount, read the
  contract, and sign by typing your name and agreeing. The contract states:
  **"If you miss two days in a row you will be billed half the sum you agreed on."**
- **No cancellation** — once signed there is no cancel, only a health exception
  that pauses billing.
- **Forfeiture engine** — two consecutive missed scheduled days forfeit half the
  remaining balance (repeats per additional pair). Rest days never count as a miss.
- **History & stats** — streak, invested, balance, forfeited, and a full log.
  All data is stored locally in the browser (localStorage).

## ⚠️ Prototype limitations

- **No real money is charged.** Billing and balances are simulated on screen.
  Real payments require a backend and a payment processor (e.g. Stripe) plus
  identity verification.
- **The contract is not legally enforceable** as written. A real product of this
  kind needs legal review.

## Tech

Single self-contained `index.html` (vanilla HTML/CSS/JS). AI pose detection via
TensorFlow.js MoveNet, loaded from a CDN at runtime.
