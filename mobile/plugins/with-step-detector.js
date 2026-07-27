const fs = require('node:fs');
const path = require('node:path');
const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');

const PACKAGE_PATH = ['com', 'm1l3s99', 'ironbound'];
const SOURCE_FILES = [
  'StepBootReceiver.kt',
  'StepDetectorModule.kt',
  'StepDetectorPackage.kt',
  'StepTrackingService.kt',
];

function withStepDetectorSources(config) {
  return withDangerousMod(config, [
    'android',
    async (androidConfig) => {
      const sourceRoot = path.join(__dirname, 'step-detector');
      const destinationRoot = path.join(
        androidConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        ...PACKAGE_PATH
      );
      fs.mkdirSync(destinationRoot, { recursive: true });
      for (const fileName of SOURCE_FILES) {
        fs.copyFileSync(
          path.join(sourceRoot, fileName),
          path.join(destinationRoot, fileName)
        );
      }
      return androidConfig;
    },
  ]);
}

function withStepDetectorPackage(config) {
  return withMainApplication(config, (androidConfig) => {
    const registration = 'add(StepDetectorPackage())';
    if (androidConfig.modResults.contents.includes(registration)) return androidConfig;

    const placeholder = '// add(MyReactNativePackage())';
    if (!androidConfig.modResults.contents.includes(placeholder)) {
      throw new Error('Could not find the React Native package registration point.');
    }
    androidConfig.modResults.contents = androidConfig.modResults.contents.replace(
      placeholder,
      registration
    );
    return androidConfig;
  });
}

function withStepTrackingManifest(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const application = androidConfig.modResults.manifest.application[0];
    application.service = application.service || [];
    if (!application.service.some((entry) =>
      entry.$?.['android:name'] === '.StepTrackingService'
    )) {
      application.service.push({
        $: {
          'android:name': '.StepTrackingService',
          'android:exported': 'false',
          'android:foregroundServiceType': 'health',
          'android:stopWithTask': 'false',
        },
      });
    }
    application.receiver = application.receiver || [];
    if (!application.receiver.some((entry) =>
      entry.$?.['android:name'] === '.StepBootReceiver'
    )) {
      application.receiver.push({
        $: {
          'android:name': '.StepBootReceiver',
          'android:enabled': 'true',
          'android:exported': 'true',
        },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }],
        }],
      });
    }
    return androidConfig;
  });
}

module.exports = (config) =>
  withStepDetectorSources(
    withStepTrackingManifest(withStepDetectorPackage(config))
  );
