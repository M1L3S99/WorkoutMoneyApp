# Ironbound Android app

This is the native phone shell for the current Ironbound step RPG. It loads the
live game and bridges Android's hardware pedometer into the web game.

## What the native app adds

- Android **Physical activity** permission
- hardware pedometer readings through `expo-sensors`
- native daily-step persistence
- verified step events sent into dungeon combat
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

The app counts steps while it is open. Android does not deliver Expo pedometer
updates while the app is fully in the background; background history can be
added later with Health Connect.
