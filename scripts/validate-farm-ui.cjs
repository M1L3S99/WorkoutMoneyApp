const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
const serviceWorker = fs.readFileSync("sw.js", "utf8");
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
  `      globalThis.__farmTest = { CROPS, ITEMS, FERTILISERS, BED_COSTS, BED_REQUIREMENTS, MAX_BEDS, FARM_UPGRADES, qualityOdds, bedState, freshState, dailyStock, dailyQuests, weatherFromCurrent, upgradeRecipe, ITEM_UPGRADE_MAX };
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
if (!radish.stages.grown.includes("radish-grown-64")) {
  throw new Error("The ready radish must remain visibly planted in the soil");
}
if (!radish.image?.includes("radish-crop-64") || !radish.seedImage?.includes("radish-seeds-96")) {
  throw new Error("The radish crop and seed packet sprites must be configured");
}
if (html.includes("TAP TO HARVEST") || html.includes("harvest-ready 1.5s") || html.includes("pullAndHarvest") || html.includes("pull-radish") || html.includes("pull-dirt")) {
  throw new Error("Ready crops must not move, bob, or display a tap-to-harvest label");
}
for (const id of ["seedModal", "seedDetailName", "seedDetailInfo", "seedDetailBuy", "seedDetailAdjust", "seedSizeControl", "seedShopSize", "seedSizeDown", "seedSizeUp", "seedShopSizeValue"]) {
  if (!ids.includes(id)) throw new Error(`Missing seed detail control: ${id}`);
}
for (const id of ["stepRing", "todaySteps", "dailyGoalLabel", "accountName", "accountLevel", "growingCount", "readyCount", "bedsGrid"]) {
  if (!ids.includes(id)) throw new Error(`Missing modern Farm control: ${id}`);
}
for (const removedId of ["dailyPercent", "stepStatus", "dailyProgress"]) {
  if (ids.includes(removedId)) throw new Error(`The simplified step hero must not retain ${removedId}`);
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
const backgroundAsset = "assets/farm/ui/farm-background-v2.webp";
const backgroundSize = fs.statSync(backgroundAsset).size;
if (backgroundSize < 50000 || backgroundSize > 150000 || !html.includes(backgroundAsset) || !serviceWorker.includes(`./${backgroundAsset}`) || !serviceWorker.includes("ironbound-farm-v27")) {
  throw new Error(`The compressed offline Farm background is missing or too heavy (${backgroundSize} bytes)`);
}
const uiV3Assets = [
  "assets/farm/ui-v3/theme-v3.css",
  "assets/farm/ui-v3/avatar-96.png",
  "assets/farm/ui-v3/nav-farm-64.png",
  "assets/farm/ui-v3/nav-shop-64.png",
  "assets/farm/ui-v3/nav-quests-64.png",
  "assets/farm/ui-v3/nav-silo-64.png",
  "assets/farm/ui-v3/nav-upgrade-64.png",
  "assets/farm/ui-v3/weather-partly-sunny-64.png",
  ...["garden-paths","rain-barrel","seed-ledger","compost-bin","deep-beds","glass-cloche","market-cart","pollinator-garden","moon-irrigation","ancient-greenhouse"]
    .map((id) => `assets/farm/upgrades-v3/${id}-192.png`)
];
for (const asset of uiV3Assets) {
  if (!fs.existsSync(asset)) throw new Error(`Missing Meadowstep v3 asset: ${asset}`);
  const size = fs.statSync(asset).size;
  if (size < 100 || size > 120000) throw new Error(`Meadowstep v3 asset has an unexpected size: ${asset} (${size} bytes)`);
  if (!html.includes(asset) && !serviceWorker.includes(`./${asset}`)) {
    throw new Error(`Meadowstep v3 asset is not integrated: ${asset}`);
  }
}
for (const hook of ["assetTransforms", "layoutAssetSelect", "prepareAssetLayouts", "upgradeSettings"]) {
  if (!html.includes(hook)) throw new Error(`Missing Meadowstep v3 layout hook: ${hook}`);
}
if (!html.includes('background-attachment:fixed,fixed') ||
    !html.includes('linear-gradient(rgba(255,255,255,.58),rgba(255,255,255,.68))') ||
    !html.includes('background:linear-gradient(180deg,rgba(255,255,255,.16)')) {
  throw new Error("The farming artwork must remain visible behind the translucent app shell");
}
if (!html.includes('.bottom-nav{') ||
    !html.includes('left:50%;bottom:0;transform:translateX(-50%)') ||
    !html.includes('width:min(100%,480px)') ||
    !html.includes('env(safe-area-inset-bottom)')) {
  throw new Error("The bottom navigation must stay pinned to the visible phone viewport");
}
if (html.includes('class="brand"') || !html.includes('class="account-summary" aria-label="Account"') || !html.includes('class="wallet" aria-label="Steps and gold"')) {
  throw new Error("The top bar must show the account and level on the left with currencies on the right");
}
if (!html.includes("width:min(104%,180px)") || !html.includes("border:0;border-radius:0;color:var(--soil);background:transparent;box-shadow:none")) {
  throw new Error("Unlocked planter art must be enlarged and shown without surrounding plot cards");
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
if (html.includes(".shop-item:before") || !html.includes("background:linear-gradient(180deg,#fff,#f7f3e9)") || html.includes("background:radial-gradient(circle at 50% 42%,color-mix")) {
  throw new Error("Shop items must use neutral full-card backplates without a rarity side band");
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
if (html.includes('<div class="section-head"><h1>Shop</h1></div>') ||
    !html.includes("#shop>#shopTabs{margin-top:1px}") ||
    !html.includes("background:linear-gradient(180deg,rgba(255,255,255,.94),rgba(244,248,239,.91))")) {
  throw new Error("The seed shop must use the clean mobile list without a redundant Shop heading");
}
if (!html.includes('src="${CURRENCY_ICONS.steps}" alt="Steps">${fmt(crop.steps)}')) {
  throw new Error("Every seed row must show that crop's growing steps with the step icon");
}
for (const forbiddenTimer of ["expiryHours", "effectiveExpiryMs", "data-bed-time", "plant-expiry", "seed-row-expiry", 'label:"Expires"', '"withered"', "crop lifetime"]) {
  if (html.includes(forbiddenTimer)) throw new Error(`Crop timing must be removed completely: ${forbiddenTimer}`);
}
if (!html.includes('font-family:"DM Sans"') || !html.includes("font-weight:800") || !html.includes("background:transparent;") || !html.includes("border:0;border-radius:0")) {
  throw new Error("The refined seed ledger requires thick modern typography and a transparent outer field");
}
if (!html.includes('${fmt(crop.seedCost)}<img class="currency-icon"') || !html.includes("border-radius:24px") || !html.includes(".seed-shop-row:last-child{border-bottom:0}")) {
  throw new Error("Seed prices and the polished rounded mobile list must remain intact");
}
if (html.includes("discountedCrop") || html.includes("data-discount") || html.includes("half price") || html.includes("seed-shop-row discount")) {
  throw new Error("The daily seed discount must be removed completely");
}
if (!html.includes("width:min(104%,180px);height:10px;margin:1px auto 0;border:2px solid #804615") || !html.includes("background:linear-gradient(90deg,#a7b86b,#60753a)")) {
  throw new Error("The thicker garden crop-progress bar must be preserved");
}
if (!html.includes("height:189px;min-height:189px") ||
    !html.includes("height:181px;min-height:181px") ||
    !html.includes("width:min(104%,180px);height:10px")) {
  throw new Error("Empty, growing, and ready planters must keep identical fixed geometry");
}
if (!html.includes('class="farm-hero"') || !html.includes('class="garden-panel"') || !html.includes("#farm .farm-hero") || !html.includes('if(!next)return ""') || !html.includes('class="bed ${status}"') ||
    html.includes("WALK-POWERED FARM") || html.includes("MOVE TO GROW") || html.includes("Walk. Grow. Harvest.")) {
  throw new Error("The Farm must use the clean step-ring-only hero and condensed plot board");
}
if (!html.includes("#farm .bed-scene,.placement-bed-scene{") ||
    !html.includes("#farm .crop-visual,.placement-bed-scene .crop-visual{") ||
    !html.includes('class="placement-bed-scene"') ||
    !html.includes(".placement-preview .bed-art{pointer-events:none") ||
    !html.includes("preview.onpointerdown=event=>") ||
    !html.includes("preview.ontouchstart=event=>") ||
    !html.includes('<option value="seed">Seed packet</option>') ||
    !html.includes('class="seed-placement-scene"') ||
    !html.includes("adjustSelectedSeedPosition")) {
  throw new Error("The crop editor must position seeds and crop stages with phone-safe dragging");
}
if (!html.includes('id="moveAllCrops"') ||
    !html.includes("globalCropPlacement:{x:0,y:0,scale:1}") ||
    !html.includes("placementAllCrops") ||
    !html.includes('state.globalCropPlacement={...placementDraft}')) {
  throw new Error("The crop editor must support moving every crop image together");
}
if (!html.includes('class="empty-head-spacer"') || !html.includes('<span class="bed-scene"><img class="bed-art')) {
  throw new Error("Empty planters must preserve the occupied bed geometry after harvesting");
}
if (!html.includes("background:linear-gradient(180deg,#fff,#f7f3e9)") || !html.includes('id="detailQualityLine"') || !html.includes("Quality · ${QUALITY_LABELS[selectedItem.quality]||\"Standard\"}")) {
  throw new Error("Gear cards must use neutral backplates with quality shown beneath the description");
}
const generatedArtPaths = [];
for (const crop of farm.CROPS) {
  const paths = [crop.seedImage, crop.stages?.planted, crop.stages?.grown, crop.image];
  if (paths.some((asset) => !asset)) throw new Error(`Crop art is incomplete for ${crop.id}`);
  generatedArtPaths.push(...paths);
}
for (const item of farm.ITEMS) {
  if (!item.image?.includes(`/gear/${item.id}-96.png`)) throw new Error(`Gear art is incomplete for ${item.id}`);
  generatedArtPaths.push(item.image);
}
for (const fertiliser of farm.FERTILISERS) {
  if (!fertiliser.image?.includes(`/fertilisers/${fertiliser.id}-96.png`)) {
    throw new Error(`Fertiliser art is incomplete for ${fertiliser.id}`);
  }
  generatedArtPaths.push(fertiliser.image);
}
const questNpcs = farm.dailyQuests();
if (questNpcs.length !== 3 || questNpcs.some((quest) => !quest.image?.includes(`/npcs/${quest.id}-96.png`))) {
  throw new Error("Every quest NPC must use a generated portrait");
}
generatedArtPaths.push(...questNpcs.map((quest) => quest.image));
if (generatedArtPaths.length !== 123 || new Set(generatedArtPaths).size !== 123) {
  throw new Error(`Expected 123 unique generated production sprites, received ${new Set(generatedArtPaths).size}`);
}
let generatedBytes = 0;
for (const asset of generatedArtPaths) {
  const size = fs.statSync(asset).size;
  if (size < 250 || size > 30000) throw new Error(`Generated sprite has an unexpected size: ${asset} (${size} bytes)`);
  generatedBytes += size;
}
if (generatedBytes > 1_500_000 || !serviceWorker.includes("const GENERATED_ART") || !serviceWorker.includes("...GENERATED_ART")) {
  throw new Error(`The generated art catalogue is not efficiently compressed and cached (${generatedBytes} bytes)`);
}
if (!html.includes('spriteMarkup(item,"gear-sprite")') || !html.includes('spriteMarkup(quest,"npc-sprite")') || !fs.existsSync("scripts/build_generated_farm_art.py")) {
  throw new Error("Generated gear and NPC sprites must be wired into every UI surface with a reproducible build script");
}
if (!html.includes('<meta name="theme-color" content="#304c35">') || manifest.theme_color !== "#304c35" || manifest.background_color !== "#ffffff" || html.includes("Golden farm-shop theme")) {
  throw new Error("The clean cream-and-green app theme must remain restored");
}
if (farm.CROPS.length < 20) {
  throw new Error("The crop catalogue must include at least twenty crops");
}
const fertiliserFamilies = new Set(farm.FERTILISERS.map((item) => item.family));
const fertiliserTiers = new Set(farm.FERTILISERS.map((item) => item.tier));
if (farm.FERTILISERS.length !== 8 || fertiliserFamilies.size !== 2 || fertiliserFamilies.has("double") || fertiliserTiers.size !== 4 || !farm.FERTILISERS.some((item) => item.id === "quality-iridium" && item.guaranteed === "iridium")) {
  throw new Error("Speed Grow and Quality Fertiliser must each offer Bronze through Iridium tiers");
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
  const expected = Math.max(1, Math.round(crop.steps * 0.018 * crop.levelMultiplier * crop.stepEfficiency));
  if (crop.sellValue !== expected || crop.seedCost !== Math.max(5, Math.round(expected * 0.32))) {
    throw new Error(`Derived crop pricing is incorrect for ${crop.id}`);
  }
}
if (farm.CROPS.some((crop) => "expiryHours" in crop) ||
    farm.ITEMS.some((item) => "expiry" in item.effect) ||
    farm.FARM_UPGRADES.some((upgrade) => "expiry" in upgrade.effect) ||
    farm.bedState({ cropId: "radish", growth: 0, expiresAt: 0 }) !== "growing") {
  throw new Error("Crops, gear, upgrades, and old saves must be completely independent of time");
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
if (baseOdds.base < 79.9 || Math.abs(baseOdds.iridium - 1) > 0.001) {
  throw new Error(`Base crop quality should be common while preserving 1% Iridium: ${JSON.stringify(baseOdds)}`);
}
if (!html.includes('item?spriteMarkup(item,"loadout-sprite"):icon') || !html.includes(".loadout-slot .loadout-sprite")) {
  throw new Error("Equipped gear must keep using its generated item artwork");
}
for (const id of ["imageCenterAsset", "imageCenterPreview", "imageCenterY", "imageCenterUp", "imageCenterDown", "resetImageCenter", "saveImageCenter"]) {
  if (!ids.includes(id)) throw new Error(`Missing permanent sprite-centre control: ${id}`);
}
if (!html.includes("imageCenterY:{}") ||
    !html.includes("function applyImageCentering()") ||
    !html.includes("getImageData(0,0,width,height)") ||
    !html.includes("data-center-src") ||
    !html.includes("saveNow();renderAll();toast(\"Image centre saved\")")) {
  throw new Error("Gameplay sprites must be alpha-centred with permanent per-image vertical corrections");
}
if (html.includes("<h1>Farmhouse</h1>") || html.includes("first farmhouse upgrade")) {
  throw new Error("The redundant Farmhouse heading must be removed");
}
console.log(
  `Economy checks OK: ${farm.CROPS.length} crops, ${farm.ITEMS.length} equipment items, ${farm.FERTILISERS.length} fertilisers`
);
