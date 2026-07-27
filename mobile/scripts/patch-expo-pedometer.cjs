const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-sensors',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'sensors',
  'modules',
  'PedometerModule.kt'
);

if (!fs.existsSync(modulePath)) {
  throw new Error(`Expo pedometer source was not found at ${modulePath}`);
}

const source = fs.readFileSync(modulePath, 'utf8');
if (source.includes('putDouble("rawSteps"')) {
  process.stdout.write('Expo pedometer raw step counter already enabled.\n');
  process.exit(0);
}

const line =
  'putDouble("steps", (sensorEvent.values[0] - (stepsAtTheBeginning ?: (sensorEvent.values[0].toInt() - 1))).toDouble())';
if (!source.includes(line)) {
  throw new Error('The Expo pedometer implementation changed; raw step patch was not applied.');
}

const patched = source.replace(
  line,
  `${line}\n        putDouble("rawSteps", sensorEvent.values[0].toDouble())`
);
fs.writeFileSync(modulePath, patched, 'utf8');
process.stdout.write('Enabled the Android raw hardware step counter.\n');
