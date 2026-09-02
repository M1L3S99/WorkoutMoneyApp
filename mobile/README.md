# RepDrop Android app

This native phone shell loads the live RepDrop web app and bridges Android’s hardware pedometer into its read-only daily step display.

## What the native app adds

- Android Physical activity permission
- hardware pedometer readings through `expo-sensors`
- native daily-step persistence
- raw Android hardware-counter reconciliation, including steps taken while the app was backgrounded on the same device boot
- an in-app permission and settings recovery screen

Steps are activity data in RepDrop, not a spendable currency. Exercise repetitions still use the simulated tracker control until pose detection is implemented.

## Local development

```powershell
cd mobile
npm install
npx expo prebuild --platform android
npx expo run:android
```

## Build an installable APK

After prebuild:

```powershell
cd android
.\gradlew.bat assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`.

Android pauses live callbacks while the app is fully in the background. When the app resumes, RepDrop compares the device’s raw step counter with its last saved reading and recovers missed steps. A device reboot starts a new raw-counter baseline.
