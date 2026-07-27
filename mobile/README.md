# Ironbound Android app

This is the native phone shell for the current Ironbound step RPG. It loads the
live game and bridges Android's hardware pedometer into the web game.

## What the native app adds

- Android **Physical activity** permission
- hardware pedometer readings through `expo-sensors`
- native daily-step persistence
- raw Android hardware-counter reconciliation, including steps taken while the
  app was backgrounded on the same device boot
- verified step batches sent into active enemy combat
- an in-app permission and settings recovery screen

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

The APK is written to:

`android/app/build/outputs/apk/release/app-release.apk`

Android pauses live callbacks while the app is fully in the background. When
the app resumes, Ironbound compares the device's raw step counter with its last
saved reading and recovers the missed steps. A device reboot starts a new raw
counter baseline.
