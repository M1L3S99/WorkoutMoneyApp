# WorkoutMoneyApp — Mobile (Expo)

The phone version of WorkoutMoneyApp. Runs on your own phone through the free
**Expo Go** app — no App Store submission or Xcode/Android Studio needed.

## Run it in 5 steps

You need [Node.js](https://nodejs.org) installed on your computer, and the
**Expo Go** app on your phone (App Store / Google Play).

```bash
# 1. Go into this folder
cd mobile

# 2. Install dependencies
npm install

# 3. Start the dev server
npx expo start
```

4. A **QR code** appears in the terminal.
5. Open **Expo Go** on your phone and scan the QR code (iPhone: use the Camera
   app; Android: scan from inside Expo Go). The app loads on your phone.

Your phone and computer must be on the **same Wi-Fi**. If it won't connect, run
`npx expo start --tunnel` instead.

> **SDK note:** Expo Go always runs the *latest* Expo SDK. If the app won't open
> in Expo Go because of a version mismatch, the most reliable fix is to scaffold
> a fresh project and drop in `App.js`:
> ```bash
> npx create-expo-app@latest wm && cd wm
> npx expo install expo-camera @react-native-async-storage/async-storage
> # then copy App.js and app.json from this folder over the new ones
> npx expo start
> ```

## What works

Everything from the web version: regimen setup, contract signing with stake +
forfeiture engine, history, stats, and camera-verified workouts. Data is saved
on the device with AsyncStorage.

## About "AI verification" on phones

Fully-automatic pushup counting is **not available in Expo Go** — real-time
on-device pose detection needs a custom *dev build* with a native camera frame
processor (e.g. `react-native-vision-camera` + a pose plugin), which Expo Go
can't load. This version turns the camera on to keep you honest and you tap once
per rep (auto-completing at your target). Moving to automatic counting is the
main "dev build" upgrade for later.

## ⚠️ Prototype limitations

No real money is charged — billing/forfeiture is simulated. The contract is not
legally enforceable. Real money handling needs a backend + payment processor
(e.g. Stripe) and legal review.
