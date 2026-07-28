const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/);
if (!script) throw new Error("Embedded script missing");
new Function(script[1]);
console.log("Embedded JavaScript syntax OK");

const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicates.length) throw new Error(`Duplicate IDs: ${duplicates.join(", ")}`);
console.log(`Unique DOM IDs: ${ids.length}`);

const references = [...script[1].matchAll(/\$\("#([A-Za-z0-9_-]+)"\)/g)].map((match) => match[1]);
const missing = [...new Set(references.filter((id) => !ids.includes(id)))];
if (missing.length) throw new Error(`Missing DOM IDs: ${missing.join(", ")}`);
console.log("Static DOM references OK");

for (const required of [
  "requestPedometer",
  "pedometerReady",
  "window.IronboundSteps",
  "iridium:1",
  "MAX_BEDS = 10",
  "stepBalance",
  "nativeLifetime",
]) {
  if (!script[1].includes(required)) throw new Error(`Missing required implementation: ${required}`);
}
console.log("Farming and native-step invariants OK");

const hook = '      $$(".nav-btn").forEach(button=>button.onclick';
if (!script[1].includes(hook)) throw new Error("Could not locate runtime test hook");
const instrumented = script[1].replace(
  hook,
  `      globalThis.__farmTest = { CROPS, ITEMS, FERTILISERS, BED_COSTS, MAX_BEDS, qualityOdds, freshState };
      return;
${hook}`
);
global.window = { addEventListener() {} };
global.localStorage = { getItem() { return null; }, setItem() {} };
new Function(instrumented)();

const farm = global.__farmTest;
if (farm.MAX_BEDS !== 10 || farm.BED_COSTS.length !== 10) {
  throw new Error("The farm must support exactly ten beds");
}
if (farm.freshState().unlockedBeds !== 1) {
  throw new Error("A new farm must start with one unlocked bed");
}
const itemTypes = new Set(farm.ITEMS.map((item) => item.type));
for (const type of ["boots", "gloves", "tools"]) {
  if (!itemTypes.has(type)) throw new Error(`Missing shop item type: ${type}`);
}
if (Math.max(...farm.ITEMS.map((item) => item.cost)) !== 100000) {
  throw new Error("The top Iridium equipment price must be 100,000 steps");
}
const twoHourCrop = farm.CROPS.find((crop) => crop.expiryHours === 2);
const eightHourCrop = farm.CROPS.find((crop) => crop.expiryHours === 8);
if (twoHourCrop?.riskMultiplier !== 2 || eightHourCrop?.riskMultiplier !== 1) {
  throw new Error("Crop expiry value multipliers are incorrect");
}
const baseOdds = farm.qualityOdds(null);
if (Math.abs(baseOdds.iridium - 1) > 0.001) {
  throw new Error(`Base Iridium chance must be 1%, received ${baseOdds.iridium}`);
}
console.log(
  `Economy checks OK: ${farm.CROPS.length} crops, ${farm.ITEMS.length} equipment items, ${farm.FERTILISERS.length} fertilisers`
);
