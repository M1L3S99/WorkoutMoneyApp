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
  "MAX_BEDS = 20",
  "stepBalance",
  "nativeLifetime",
  "pullAndHarvest",
  "updateFarmTimes",
  "MILES-FARM",
  "dailyStock",
  "upgradeSelectedItem",
  "adminGrowAll",
  "doubleStepCap",
  "doubleGoldSales",
  "dailyQuests",
  "discountedCrop",
  "loadLocalWeather",
  "replantAll",
  "sellSelectedGear",
]) {
  if (!script[1].includes(required)) throw new Error(`Missing required implementation: ${required}`);
}
console.log("Farming and native-step invariants OK");

const hook = '      $$(".nav-btn").forEach(button=>button.onclick';
if (!script[1].includes(hook)) throw new Error("Could not locate runtime test hook");
const instrumented = script[1].replace(
  hook,
  `      globalThis.__farmTest = { CROPS, ITEMS, FERTILISERS, BED_COSTS, BED_REQUIREMENTS, MAX_BEDS, FARM_UPGRADES, qualityOdds, freshState, dailyStock, dailyQuests, discountedCrop, weatherFromCurrent, upgradeRecipe, ITEM_UPGRADE_MAX };
      return;
${hook}`
);
global.window = { addEventListener() {} };
global.localStorage = { getItem() { return null; }, setItem() {} };
new Function(instrumented)();

const farm = global.__farmTest;
if (farm.MAX_BEDS !== 20 || farm.BED_COSTS.length !== 20 || farm.BED_REQUIREMENTS.length !== 20) {
  throw new Error("The farm must support exactly twenty progressively unlocked beds");
}
if (farm.freshState().unlockedBeds !== 1) {
  throw new Error("A new farm must start with one unlocked bed");
}
if ((farm.freshState().seeds?.radish || 0) < 1) {
  throw new Error("A new farm must start with radish seeds");
}
const radish = farm.CROPS.find((crop) => crop.id === "radish");
if (!radish?.stages?.planted || !radish?.stages?.grown || radish?.stages?.half) {
  throw new Error("Radish must have exactly planted and ready growth sprites");
}
if (!radish.stages.grown.includes("radish-ready-planted")) {
  throw new Error("The ready radish must remain visibly planted in the soil");
}
if (!radish.image?.includes("radish-crop-64") || !radish.seedImage?.includes("radish-seeds-64")) {
  throw new Error("The radish crop and seed packet sprites must be configured");
}
if (html.includes("TAP TO HARVEST") || html.includes("harvest-ready 1.5s")) {
  throw new Error("Ready crops must not bob or display a tap-to-harvest label");
}
if (farm.CROPS.length < 20) {
  throw new Error("The crop catalogue must include at least twenty crops");
}
const fertiliserFamilies = new Set(farm.FERTILISERS.map((item) => item.family));
const fertiliserTiers = new Set(farm.FERTILISERS.map((item) => item.tier));
if (farm.FERTILISERS.length !== 12 || fertiliserFamilies.size !== 3 || fertiliserTiers.size !== 4 || !farm.FERTILISERS.some((item) => item.id === "quality-iridium" && item.guaranteed === "iridium")) {
  throw new Error("The three fertiliser families must each offer Bronze through Iridium tiers");
}
if (farm.FARM_UPGRADES.length < 8 || farm.FARM_UPGRADES.some((item) => !item.level || !item.gold)) {
  throw new Error("Farmhouse upgrades must be one-time, level-gated purchases");
}
if (farm.dailyQuests().length !== 3 || !farm.dailyQuests().some((quest) => quest.reward.type === "gear")) {
  throw new Error("Three deterministic daily NPC quests including a gear trade are required");
}
if (farm.discountedCrop().seedCost < 1) throw new Error("The daily discounted seed must resolve to a crop");
const rain = farm.weatherFromCurrent({ weather_code: 61, temperature_2m: 16, precipitation: 2 });
if (rain.growth <= 0 || rain.quality <= 0) throw new Error("Rain should provide a positive crop modifier");
const itemTypes = new Set(farm.ITEMS.map((item) => item.type));
for (const type of ["boots", "gloves", "tools"]) {
  if (!itemTypes.has(type)) throw new Error(`Missing shop item type: ${type}`);
  if (farm.dailyStock(type).length !== 3) throw new Error(`Daily ${type} stock must contain three items`);
}
if (farm.ITEMS.length < 18 || !farm.ITEMS.some((item) => Object.keys(item.effect).length >= 3)) {
  throw new Error("The gear catalogue must contain varied multi-benefit items");
}
if (Math.max(...farm.ITEMS.map((item) => item.cost)) !== 100000) {
  throw new Error("The top Iridium equipment price must be 100,000 steps");
}
if (Math.max(...farm.CROPS.map((crop) => crop.steps)) !== 20000) {
  throw new Error("The longest crop must require exactly 20,000 steps");
}
const valueRates = farm.CROPS.map((crop) => crop.sellValue / crop.steps);
if (valueRates.some((rate, index) => index > 0 && rate + 0.0002 < valueRates[index - 1])) {
  throw new Error("Higher crops must remain slightly more valuable per step");
}
if (farm.ITEM_UPGRADE_MAX !== 3 || !farm.upgradeRecipe(farm.ITEMS[0], 3)?.cropId) {
  throw new Error("Every gear item must support three crop-backed upgrades");
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
