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
  "harvestBed",
  "updateFarmTimes",
  "MILES-FARM",
  "dailyStock",
  "upgradeSelectedItem",
  "adminGrowAll",
  "doubleStepCap",
  "doubleGoldSales",
  "dailyQuests",
  "requestLocalWeatherPermission",
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
  `      globalThis.__farmTest = { CROPS, ITEMS, FERTILISERS, BED_COSTS, BED_REQUIREMENTS, MAX_BEDS, FARM_UPGRADES, qualityOdds, freshState, dailyStock, dailyQuests, weatherFromCurrent, upgradeRecipe, ITEM_UPGRADE_MAX };
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
if (!radish.image?.includes("radish-crop-64") || !radish.seedImage?.includes("radish-seeds-96")) {
  throw new Error("The radish crop and seed packet sprites must be configured");
}
if (html.includes("TAP TO HARVEST") || html.includes("harvest-ready 1.5s") || html.includes("pullAndHarvest") || html.includes("pull-radish") || html.includes("pull-dirt")) {
  throw new Error("Ready crops must not move, bob, or display a tap-to-harvest label");
}
for (const id of ["seedModal", "seedDetailName", "seedDetailInfo", "seedDetailBuy", "seedSizeControl", "seedShopSize", "seedSizeDown", "seedSizeUp", "seedShopSizeValue"]) {
  if (!ids.includes(id)) throw new Error(`Missing seed detail control: ${id}`);
}
for (const id of ["fertModal", "fertModalCard", "fertDetailName", "fertDetailArt", "fertDetailInfo", "fertDetailBuy"]) {
  if (!ids.includes(id)) throw new Error(`Missing fertiliser detail control: ${id}`);
}
if (!html.includes("data-seed-view") || html.includes("data-seed-buy")) {
  throw new Error("Seed cards must open details instead of buying immediately");
}
for (const asset of ["assets/farm/crops/radish-seeds-96.png", "assets/farm/ui/gold-coin-64.png", "assets/farm/ui/step-token-64.png"]) {
  const size = fs.statSync(asset).size;
  if (size < 100 || size > 20000) throw new Error(`Generated pixel asset has an unexpected size: ${asset} (${size} bytes)`);
}
for (const id of ["toggleAssetPreview", "assetPreviewPanel", "assetPreviewGrid"]) {
  if (!ids.includes(id)) throw new Error(`Missing asset preview control: ${id}`);
}
if (!html.includes("asset-preview") || !html.includes("File ${image.naturalWidth}×${image.naturalHeight}px") || !html.includes("seed-grid")) {
  throw new Error("The exact-dimension asset preview and compact seed grid are required");
}
if (html.includes("gold-coin-32.png") || html.includes("step-token-32.png") || html.includes("${value}${label?")) {
  throw new Error("Currency UI must use the high-definition symbol-only assets");
}
if (!html.includes(".currency{display:inline;") || !html.includes("vertical-align:-2px") || !html.includes('width:13px;height:13px')) {
  throw new Error("Inline currency symbols must preserve a uniform text line");
}
if (html.includes('${currencyMarkup("steps",crop.steps)} · ${state.adminMode?') || html.includes('Plant · ${currencyMarkup("steps",crop.steps)} to grow')) {
  throw new Error("The crop picker must list seeds without growth-step pricing");
}
if (html.includes(".shop-item:before") || !html.includes("background:radial-gradient(circle at 50% 42%")) {
  throw new Error("Shop rarity must use the full card background without a side band");
}
if (farm.freshState().seedShopSize !== 40 || !html.includes("--seed-shop-size") || !html.includes("detailLinesMarkup")) {
  throw new Error("Persistent seed sizing and one-line-per-stat shop details are required");
}
if (!html.includes(".shop-grid{display:grid;grid-template-columns:repeat(3") || html.includes("large-seeds") || html.includes("data-fert-buy")) {
  throw new Error("The reference-style shop must remain three wide with popup purchasing");
}
if (!html.includes("data-fert-view") || !html.includes("shopLayoutVersion:6") || !html.includes("class=\"seed-shop-row")) {
  throw new Error("The seed shop must use the compact reference-list layout and migration");
}
if (!html.includes("grid-template-columns:var(--seed-shop-size) minmax(0,1fr) auto") || !html.includes("seed-row-price") || !html.includes("seed-row-steps")) {
  throw new Error("Seed rows must align the unframed packet, growing steps, name, and price");
}
if (!html.includes('font-family:"DM Sans"') || !html.includes("font-weight:800") || !html.includes("background:transparent;") || !html.includes("border:0;border-radius:0")) {
  throw new Error("The refined seed ledger requires thick modern typography and a transparent outer field");
}
if (!html.includes('${fmt(crop.seedCost)}<img class="currency-icon"') || !html.includes("border:3px solid #856a49") || !html.includes("border-radius:20px")) {
  throw new Error("Seed prices and the substantial rounded outer frame must match the polished design");
}
if (html.includes("discountedCrop") || html.includes("data-discount") || html.includes("half price") || html.includes("seed-shop-row discount")) {
  throw new Error("The daily seed discount must be removed completely");
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
if (!farm.CROPS.some((crop, index) => index > 0 && crop.steps < farm.CROPS[index - 1].steps)) {
  throw new Error("Higher-level crops must not always require more steps");
}
for (const crop of farm.CROPS) {
  const expected = Math.max(1, Math.round(crop.steps * 0.018 * crop.levelMultiplier * crop.expiryMultiplier * crop.stepEfficiency));
  if (crop.sellValue !== expected || crop.seedCost !== Math.max(5, Math.round(expected * 0.32))) {
    throw new Error(`Derived crop pricing is incorrect for ${crop.id}`);
  }
}
const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const twoHourRates = farm.CROPS.filter((crop) => crop.expiryHours === 2).map((crop) => crop.sellValue / crop.steps);
const eightHourRates = farm.CROPS.filter((crop) => crop.expiryHours === 8).map((crop) => crop.sellValue / crop.steps);
if (average(twoHourRates) <= average(eightHourRates)) {
  throw new Error("Short-expiry crops must pay more gold per step");
}
if (!farm.CROPS.every((crop) => crop.stepEfficiency < 1 && crop.stepEfficiency > 0.85)) {
  throw new Error("Longer crops must have a modestly lower per-step efficiency");
}
const lettuce = farm.CROPS.find((crop) => crop.id === "lettuce");
const spinach = farm.CROPS.find((crop) => crop.id === "spinach");
if (!(spinach.level > lettuce.level && spinach.steps < lettuce.steps && spinach.sellValue / spinach.steps > lettuce.sellValue / lettuce.steps)) {
  throw new Error("The crop curve must include higher-level, lower-step, better-paying alternatives");
}
if (farm.ITEM_UPGRADE_MAX !== 3 || !farm.upgradeRecipe(farm.ITEMS[0], 3)?.cropId) {
  throw new Error("Every gear item must support three crop-backed upgrades");
}
const baseOdds = farm.qualityOdds(null);
if (Math.abs(baseOdds.iridium - 1) > 0.001) {
  throw new Error(`Base Iridium chance must be 1%, received ${baseOdds.iridium}`);
}
console.log(
  `Economy checks OK: ${farm.CROPS.length} crops, ${farm.ITEMS.length} equipment items, ${farm.FERTILISERS.length} fertilisers`
);
