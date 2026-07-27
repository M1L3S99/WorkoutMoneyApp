const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');

const PACKAGE_PATH = ['com', 'm1l3s99', 'ironbound'];
const SOURCE_FILES = ['StepDetectorModule.kt', 'StepDetectorPackage.kt'];

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

module.exports = (config) =>
  withStepDetectorSources(withStepDetectorPackage(config));
