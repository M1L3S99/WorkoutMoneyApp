const fs = require("fs");
const crypto = require("crypto");
const html = fs.readFileSync("index.html", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
const serviceWorker = fs.readFileSync("sw.js", "utf8");
const theme = fs.readFileSync("assets/farm/ui-v3/theme-v3.css", "utf8");
const farmArtBuilder = fs.readFileSync("scripts/build_generated_farm_art.py", "utf8");
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/);
if (!script) throw new Error("Embedded script missing");
new Function(script[1]);
console.log("Embedded JavaScript syntax OK");

const serviceWorkerAssetHook = "self.addEventListener('install'";
if (!serviceWorker.includes(serviceWorkerAssetHook)) throw new Error("Could not inspect service-worker asset list");
const offlineAssets = new Function(serviceWorker.replace(serviceWorkerAssetHook, `return ASSETS;\n${serviceWorkerAssetHook}`))();
if (!Array.isArray(offlineAssets)) throw new Error("Service-worker asset list is not an array");

function functionSource(name) {
  const marker = `function ${name}`;
  const start = script[1].indexOf(marker);
  if (start < 0) return "";
  const opening = script[1].indexOf("{", start + marker.length);
  if (opening < 0) return "";
  let depth = 0;
  for (let index = opening; index < script[1].length; index++) {
    if (script[1][index] === "{") depth++;
    if (script[1][index] === "}" && --depth === 0) return script[1].slice(start, index + 1);
  }
  return "";
}

function pngMetadata(asset) {
  const data = fs.readFileSync(asset);
  const signature = "89504e470d0a1a0a";
  if (data.length < 33 || data.subarray(0, 8).toString("hex") !== signature || data.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error(`Invalid PNG container: ${asset}`);
  }
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  const bitDepth = data[24];
  const colorType = data[25];
  let hasTransparencyChunk = false;
  for (let offset = 8; offset + 12 <= data.length;) {
    const chunkSize = data.readUInt32BE(offset);
    const chunk = data.toString("ascii", offset + 4, offset + 8);
    const next = offset + 12 + chunkSize;
    if (next > data.length) throw new Error(`Truncated PNG chunk in ${asset}`);
    if (chunk === "tRNS") hasTransparencyChunk = true;
    offset = next;
    if (chunk === "IEND") break;
  }
  return {
    width,
    height,
    bitDepth,
    colorType,
    hasAlpha:colorType === 4 || colorType === 6 || hasTransparencyChunk,
    bytes:data.length,
    sha256:crypto.createHash("sha256").update(data).digest("hex")
  };
}

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
  `      globalThis.__farmTest = { CROPS, ITEMS, FERTILISERS, BED_COSTS, BED_REQUIREMENTS, MAX_BEDS, FARM_UPGRADES, FARM_UPGRADE_ART, CHARACTER_PROFILES, qualityOdds, bedState, freshState, dailyStock, dailyQuests, weatherFromCurrent, upgradeRecipe, ITEM_UPGRADE_MAX };
      return;
${hook}`
);
global.window = { addEventListener() {} };
global.localStorage = { getItem() { return null; }, setItem() {} };
new Function(instrumented)();

const farm = global.__farmTest;
const TOPDOWN_ASSETS = {
  soil:"assets/farm/soil-plot-topdown-v2-256x192.png",
  radishPlanted:"assets/farm/crops/radish-planted-meadow-v3-64.png",
  radishGrown:"assets/farm/crops/radish-grown-meadow-v3-64.png",
  compostBin:"assets/farm/upgrades-v3/compost-bin-topdown-v2-192.png",
  deepBeds:"assets/farm/upgrades-v3/deep-beds-topdown-v2-192.png"
};
const pngContracts = [
  [TOPDOWN_ASSETS.soil,256,192,4000,24000,"0499995ec01756b0228a6563643cd6b000d0466a1dfd23f0eb7785e73b1ac863"],
  [TOPDOWN_ASSETS.radishPlanted,64,64,500,4000,"e715770e8bbd01436320f4a5f25b8f8e12a116048a84c7014843b3c49136f08e"],
  [TOPDOWN_ASSETS.radishGrown,64,64,1000,10000,"7fa98861b298797288b58212d44220bac8a27c15835b4e34c2e7589e5a2d9014"],
  [TOPDOWN_ASSETS.compostBin,192,192,3000,20000,"389ad414f5f8a03396fe6910c1d43c1b90af1afb042e0b745b9ca876f44a77aa"],
  [TOPDOWN_ASSETS.deepBeds,192,192,3000,20000,"a148fb267bba298ec8e9d99e261dc3cb5b5db2d4ee718d85b55420ab95d3b343"]
];
for (const [asset,width,height,minBytes,maxBytes,sha256] of pngContracts) {
  const metadata=pngMetadata(asset);
  if (metadata.width !== width || metadata.height !== height || !metadata.hasAlpha ||
      metadata.bytes < minBytes || metadata.bytes > maxBytes || metadata.sha256 !== sha256) {
    throw new Error(`Top-down PNG contract failed for ${asset}: ${JSON.stringify(metadata)}`);
  }
}
if (!farmArtBuilder.includes("HAND_AUTHORED_CROP_STAGES") ||
    !farmArtBuilder.includes("radish-planted-meadow-v3-64.png") ||
    !farmArtBuilder.includes("radish-grown-meadow-v3-64.png") ||
    farmArtBuilder.includes("radish-planted-topdown-v2-64.png") ||
    farmArtBuilder.includes("radish-grown-topdown-v2-64.png") ||
    !farmArtBuilder.includes("shutil.copyfile(source, path)")) {
  throw new Error("Farm art builds must preserve and copy both hand-authored Meadow v3 radish stages");
}
if (farm.MAX_BEDS !== 20 || farm.BED_COSTS.length !== 20 || farm.BED_REQUIREMENTS.length !== 20) {
  throw new Error("The farm must support exactly twenty progressively unlocked beds");
}
if (farm.freshState().unlockedBeds !== 1) {
  throw new Error("A new farm must start with one unlocked bed");
}
if (farm.freshState().cropArtVersion !== 3) {
  throw new Error("New farms must use crop art layout version 3");
}
const loadStateSource = functionSource("loadState");
const cropPlacementDeletes = [...loadStateSource.matchAll(/delete\s+merged\.cropPlacements\[["']([^"']+)["']\]/g)]
  .map((match) => match[1]).sort();
if (!/saved\.cropArtVersion\s*!==\s*3/.test(loadStateSource) ||
    !/merged\.cropArtVersion\s*=\s*3/.test(loadStateSource) ||
    cropPlacementDeletes.join("|") !== "radish:grown|radish:planted") {
  throw new Error("Crop art v3 migration must reset only radish:planted and radish:grown placement overrides exactly once");
}
if (Object.hasOwn(farm.freshState(), "plotLayouts") || !loadStateSource.includes("delete merged.plotLayouts")) {
  throw new Error("Per-plot Arrange state must be retired so every planter keeps the same geometry");
}
if ((farm.freshState().seeds?.radish || 0) < 1) {
  throw new Error("A new farm must start with radish seeds");
}
const radish = farm.CROPS.find((crop) => crop.id === "radish");
if (!radish?.stages?.planted || !radish?.stages?.grown || radish?.stages?.half) {
  throw new Error("Radish must have exactly planted and ready growth sprites");
}
if (radish.stages.planted !== TOPDOWN_ASSETS.radishPlanted || radish.stages.grown !== TOPDOWN_ASSETS.radishGrown) {
  throw new Error("Radish growth must use the approved smaller Meadow v3 planted and ready sprites");
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
for (const id of [
  "stepRing",
  "todaySteps",
  "dailyGoalLabel",
  "accountName",
  "accountLevel",
  "growingCount",
  "readyCount",
  "bedsGrid",
  "farmOverview",
  "cropArea",
  "plantAll",
  "replantAll",
  "profileButton",
  "accountAvatar",
  "profileModal",
  "profileChoices",
]) {
  if (!ids.includes(id)) throw new Error(`Missing modern Farm control: ${id}`);
}
for (const id of [
  "openPlotLayout",
  "plotLayoutEditor",
  "plotLayoutSelect",
  "plotLayoutX",
  "plotLayoutXValue",
  "plotLayoutY",
  "plotLayoutYValue",
  "plotLayoutScale",
  "plotLayoutScaleValue",
  "resetPlotLayout",
  "resetAllPlotLayouts",
  "savePlotLayout",
]) {
  if (ids.includes(id)) throw new Error(`Removed Arrange control must not remain: ${id}`);
}
for (const removedId of ["dailyPercent", "stepStatus", "dailyProgress"]) {
  if (ids.includes(removedId)) throw new Error(`The simplified step hero must not retain ${removedId}`);
}
const composterSections = [...html.matchAll(/<section\b[^>]*class="[^"]*\bcrop-composter\b[^"]*"[^>]*>[\s\S]*?<\/section>/g)];
const composterMarkup = composterSections[0]?.[0] || "";
const compostSlots = [...composterMarkup.matchAll(/<[^>]+class="[^"]*\bcompost-slot\b[^"]*"[^>]*>/g)];
const compostQuadrants = compostSlots.map((match) => match[0].match(/data-compost-quadrant="(tl|tr|bl|br)"/)?.[1]).sort();
if (composterSections.length !== 1 || compostSlots.length !== 4 ||
    compostQuadrants.join("|") !== "bl|br|tl|tr" ||
    !composterMarkup.slice(0,composterMarkup.indexOf(">") + 1).includes('aria-hidden="true"') ||
    /<(?:a|button|input|select|textarea)\b|\btabindex\s*=|\bonclick\s*=/.test(composterMarkup)) {
  throw new Error("Crop Area must contain one decorative low-profile composter with four noninteractive tl/tr/bl/br slots");
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
const backgroundAssets = [
  ["assets/farm/ui/farm-background-v2.webp", 50000, 150000],
  ["assets/farm/ui/farm-background-master-v6.webp", 70000, 220000],
  ["assets/farm/ui/farm-ground-sand-v6.webp", 25000, 120000],
  ["assets/farm/ui/farm-overview-scene-v1.webp", 80000, 180000],
  ["assets/farm/ui/crop-area-ground-v1.webp", 50000, 130000]
];
for (const [backgroundAsset, minSize, maxSize] of backgroundAssets) {
  const backgroundSize = fs.statSync(backgroundAsset).size;
  if (backgroundSize < minSize || backgroundSize > maxSize ||
      !serviceWorker.includes(`./${backgroundAsset}`)) {
    throw new Error(`A compressed offline Farm background is missing or too heavy: ${backgroundAsset} (${backgroundSize} bytes)`);
  }
}
if (!html.includes(backgroundAssets[0][0]) ||
    !theme.includes("../ui/farm-background-master-v6.webp") ||
    !theme.includes("../ui/farm-ground-sand-v6.webp") ||
    !theme.includes("../ui/farm-overview-scene-v1.webp") ||
    !theme.includes("../ui/crop-area-ground-v1.webp") ||
    theme.includes("crop-area-scene-v2-432x864.webp") ||
    serviceWorker.includes("crop-area-scene-v2-432x864.webp") ||
    !serviceWorker.includes("ironbound-farm-v45")) {
  throw new Error("The top-down Farm backgrounds or v45 offline cache are not fully integrated");
}
const farmOverviewStart = html.indexOf('<div class="farm-overview" id="farmOverview">');
const farmPlotsStart = html.indexOf('<section class="farm-plots" id="cropArea" role="region" aria-label="Farm plots">');
if (farmOverviewStart < 0 || farmPlotsStart <= farmOverviewStart ||
    html.includes('id="openCropArea"') ||
    html.includes('id="closeCropArea"') ||
    html.includes('class="farm-subview') ||
    html.includes("Enter Crop Area") ||
    script[1].includes("farmSubview") ||
    script[1].includes("syncFarmSubview") ||
    script[1].includes("setFarmSubview") ||
    !/#farm\s*\{[^}]*height:\s*auto;[^}]*overflow:\s*visible;/s.test(theme) ||
    !/#cropArea \.beds-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s.test(theme) ||
    !theme.includes('url("../ui/crop-area-ground-v1.webp")') ||
    ["crop-area-entry","farm-overview-landmark","farm-subview","crop-area-open"].some((hook) => html.includes(hook) || theme.includes(hook)) ||
    ["Back to Farm","cropAreaTitle"].some((hook) => html.includes(hook))) {
  throw new Error("The Farm hero, weather and all plots must share one continuous main screen without a Crop Area gateway");
}
const renderBedSource = functionSource("renderBed");
if (!script[1].includes('Array.from({length:MAX_BEDS},(_,index)=>renderBed(index)).join("")') ||
    !renderBedSource.includes("locked-future") ||
    renderBedSource.includes('return ""')) {
  throw new Error("The Crop Area must render all twenty plots, including visible future locked plots");
}
if (renderBedSource.includes("plotLayout") || renderBedSource.includes("--plot-x") ||
    renderBedSource.includes("--plot-y") || renderBedSource.includes("--plot-scale") ||
    /<article class="bed[^`]*style="\$\{style\}"/.test(renderBedSource)) {
  throw new Error("Farm rendering must not apply any individual position or scale to a planter");
}
const soilPlotAsset = TOPDOWN_ASSETS.soil;
const obsoleteOfflineArt = [
  "./assets/farm/soil-plot-ground-v1-256x192.webp",
  "./assets/farm/planter-bed-complete-v7-256x232.webp",
  "./assets/farm/crops/radish-planted-64.png",
  "./assets/farm/crops/radish-grown-64.png",
  "./assets/farm/crops/radish-planted-topdown-v2-64.png",
  "./assets/farm/crops/radish-grown-topdown-v2-64.png",
  "./assets/farm/upgrades-v3/compost-bin-192.png",
  "./assets/farm/upgrades-v3/deep-beds-192.png"
];
if (!html.includes(soilPlotAsset) ||
    Object.values(TOPDOWN_ASSETS).some((asset) => offlineAssets.filter((cached) => cached === `./${asset}`).length !== 1) ||
    obsoleteOfflineArt.some((asset) => offlineAssets.includes(asset))) {
  throw new Error("The v45 cache must contain each approved Farm asset exactly once and exclude superseded radish and perspective art");
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
  "assets/farm/ui-v3/step-currency-v2-96.png",
  "assets/farm/ui-v3/gold-currency-v2-96.png",
  ...["garden-paths","rain-barrel","seed-ledger","compost-bin","deep-beds","glass-cloche","market-cart","pollinator-garden","moon-irrigation","ancient-greenhouse"]
    .map((id) => id === "compost-bin" ? TOPDOWN_ASSETS.compostBin : id === "deep-beds" ? TOPDOWN_ASSETS.deepBeds : `assets/farm/upgrades-v3/${id}-192.png`)
];
for (const asset of uiV3Assets) {
  if (!fs.existsSync(asset)) throw new Error(`Missing Meadowstep v3 asset: ${asset}`);
  const size = fs.statSync(asset).size;
  if (size < 100 || size > 120000) throw new Error(`Meadowstep v3 asset has an unexpected size: ${asset} (${size} bytes)`);
  if (!html.includes(asset) && !serviceWorker.includes(`./${asset}`)) {
    throw new Error(`Meadowstep v3 asset is not integrated: ${asset}`);
  }
}
const profileIds = farm.CHARACTER_PROFILES.map((profile) => profile.id);
const profileImages = farm.CHARACTER_PROFILES.map((profile) => profile.image);
if (farm.CHARACTER_PROFILES.length < 4 || new Set(profileIds).size !== farm.CHARACTER_PROFILES.length ||
    new Set(profileImages).size !== farm.CHARACTER_PROFILES.length ||
    !profileIds.includes(farm.freshState().characterProfile) ||
    !functionSource("renderHeader").includes('$("#accountAvatar").src=profile.image') ||
    !functionSource("openProfilePicker").includes('$("#profileModal").classList.add("show")') ||
    !functionSource("selectCharacterProfile").includes("state.characterProfile=profile.id")) {
  throw new Error("The header must provide at least four unique, persistent character profile choices");
}
for (const asset of profileImages) {
  if (!fs.existsSync(asset) || offlineAssets.filter((cached) => cached === `./${asset}`).length !== 1) {
    throw new Error(`Character profile asset must exist and be cached exactly once: ${asset}`);
  }
  const metadata=pngMetadata(asset);
  if (metadata.width < 96 || metadata.height < 96 || !metadata.hasAlpha) {
    throw new Error(`Character profile asset must be a transparent portrait: ${asset}`);
  }
}
for (const hook of ["assetTransforms", "layoutAssetSelect", "prepareAssetLayouts", "upgradeSettings"]) {
  if (!html.includes(hook)) throw new Error(`Missing Meadowstep v3 layout hook: ${hook}`);
}
for (const farmHook of ["FARM_CURRENCY_ICONS", "farm-view", "compactFmt", "step-ring-icon", "weather-status", "bed-plaque", "bed-ready-banner"]) {
  if (!html.includes(farmHook) && !theme.includes(farmHook)) {
    throw new Error(`Missing Farm reference redesign hook: ${farmHook}`);
  }
}
if (!theme.includes("#farm:before") ||
    !theme.includes("url(\"../ui/farm-background-master-v6.webp\")") ||
    !theme.includes("background-size:100% 100%,100% auto,100% 100%") ||
    !theme.includes("#farm .garden-panel:before") ||
    !theme.includes("url(\"../ui/farm-ground-sand-v6.webp\")") ||
    !theme.includes("background-repeat:no-repeat,repeat-y") ||
    !theme.includes("--farm-gutter:13px") ||
    !theme.includes("#farm .garden-panel") ||
    !theme.includes("background:transparent") ||
    !theme.includes("#farm .bed-plaque")) {
  throw new Error("The Farm screen must keep its full-bleed scenery and integrated planter composition");
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
if (!html.includes("border:0;border-radius:0;color:var(--soil);background:transparent;box-shadow:none")) {
  throw new Error("Unlocked soil plots must remain integrated without surrounding plot cards");
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
if (!/#farm \.bed-progress\s*\{[^}]*transform:\s*translateY\(4px\)/s.test(theme)) {
  throw new Error("The crop step counter must remain slightly lowered");
}
if (!theme.includes("--plot-aspect:1.04") ||
    !/#cropArea \.bed,\s*#cropArea \.bed\.empty,\s*#cropArea \.bed\.locked,\s*#cropArea \.bed\.ready\s*\{[^}]*width:100%;[^}]*height:auto;[^}]*aspect-ratio:var\(--plot-aspect\)/s.test(theme) ||
    !/#cropArea \.bed>\.bed-scene\s*\{[^}]*width:100%;[^}]*height:100%;[^}]*transform:none!important/s.test(theme)) {
  throw new Error("Every empty, growing, ready, and locked planter must share one responsive geometry");
}
if (!theme.includes("--hero-weather-gap:28px") ||
    !/#farmOverview \.weather-card\s*\{[^}]*margin:var\(--hero-weather-gap\) auto 0/s.test(theme)) {
  throw new Error("The local weather card must keep an explicit visual gap below the step ring");
}
if (!/\.app img,\s*\.modal img\s*\{[^}]*image-rendering:auto!important/s.test(theme)) {
  throw new Error("Foreground icons, crops, and character portraits must use smooth browser scaling");
}
if (ids.includes("plantBedNumber") || /Plant bed\s/i.test(html) || script[1].includes('$("#plantBedNumber")') ||
    !html.includes('<h2 id="plantModalTitle">Choose what to plant</h2>')) {
  throw new Error("The planting picker must use a generic heading without a plot number");
}
const scalablePlantingIds = [
  "plantTargetSummary", "plantSelectionCrop", "plantSelectionFertiliser",
  "plantSeedsTab", "plantFertiliserTab", "plantSeedCount", "plantFertiliserCount",
  "plantSeedsPanel", "plantFertiliserPanel", "plantSeedSearch", "plantFertiliserSearch",
  "plantSeedFilters", "plantFertiliserFilters", "plantSeedResultCount",
  "plantFertiliserResultCount", "plantingFooterSummary"
];
for (const id of scalablePlantingIds) {
  if (!ids.includes(id)) throw new Error(`Missing scalable planting-picker control: ${id}`);
}
if (!html.includes('class="plant-picker-tabs" role="tablist"') ||
    !html.includes('id="plantSeedsTab" type="button" role="tab"') ||
    !html.includes('aria-controls="plantSeedsPanel"') ||
    !html.includes('id="plantFertiliserTab" type="button" role="tab"') ||
    !html.includes('aria-controls="plantFertiliserPanel"') ||
    !html.includes('id="plantSeedsPanel" role="tabpanel"') ||
    !html.includes('aria-labelledby="plantSeedsTab"') ||
    !html.includes('id="plantFertiliserPanel" role="tabpanel"') ||
    !html.includes('aria-labelledby="plantFertiliserTab" hidden')) {
  throw new Error("The planting picker must expose accessible tabs and matching tab panels");
}
const scalablePlantingHooks = [
  "function plantableCrops", "function plantSearchMatches", "function plantTargetCount",
  "function plantableCount", "function setPlantPickerTab", 'data-seed-scope="${scope}"',
  'data-fert-family="${family}"', '$("#plantSeedSearch").oninput',
  '$("#plantFertiliserSearch").oninput', 'event.key==="Escape"', 'event.key!=="Tab"',
  'document.body.classList.add("modal-open")', "possibleCount=plantableCount"
];
if (scalablePlantingHooks.some((hook) => !script[1].includes(hook)) ||
    !/#plantModal \.planting-modal-card\s*\{[^}]*display:grid;[^}]*grid-template-rows:auto auto auto minmax\(0,1fr\) auto;[^}]*overflow:hidden;/s.test(theme) ||
    !/#plantModal \.plant-picker-results\s*\{[^}]*overflow-y:auto;[^}]*overscroll-behavior:contain;/s.test(theme) ||
    !theme.includes("grid-template-columns:repeat(auto-fill,minmax(92px,1fr))") ||
    !theme.includes(".planting-footer{") ||
    !theme.includes("body.modal-open{overflow:hidden")) {
  throw new Error("The planting picker must remain searchable, filterable, internally scrollable, and ready for larger catalogues");
}
const plantIntoSource = functionSource("plantInto");
if (!plantIntoSource.includes("Number.isInteger(index)") ||
    !plantIntoSource.includes("index>=state.unlockedBeds") ||
    !plantIntoSource.includes("crop.level>levelInfo().level") ||
    !plantIntoSource.includes("fertiliserId&&!fertiliser")) {
  throw new Error("Planting must reject invalid plots, locked crops, and unknown fertilisers");
}
if (!html.includes('class="farm-hero"') || !html.includes('class="garden-panel"') || !html.includes("#farm .farm-hero") || !html.includes('class="bed ${status}"') ||
    html.includes("WALK-POWERED FARM") || html.includes("MOVE TO GROW") || html.includes("Walk. Grow. Harvest.")) {
  throw new Error("The Farm must use the clean step-ring-only hero and condensed plot board");
}
if (!html.includes("#farm .bed-scene,.placement-bed-scene{") ||
    !html.includes("#farm .crop-visual,.placement-bed-scene .crop-visual{") ||
    !html.includes('class="placement-bed-scene"') ||
    !html.includes(".placement-preview .plot-surface{pointer-events:none") ||
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
const placementPreviewSource = functionSource("renderPlacementPreview");
if (!script[1].includes(`const PLANTER_ART="${soilPlotAsset}"`) ||
    !html.includes('class="bed empty"') ||
    !html.includes('class="bed-scene bed-action"') ||
    !html.includes('class="bed-plaque"><strong>Empty</strong>') ||
    !renderBedSource.includes('${planterArt()}<div class="crop-visual"') ||
    !placementPreviewSource.includes('${planterArt()}<div class="crop-visual editing"') ||
    renderBedSource.includes('planterArt("planter-front")') ||
    placementPreviewSource.includes('planterArt("planter-front")') ||
    html.includes("planter-front") ||
    theme.includes("planter-front") ||
    theme.includes("--planter-front-cut")) {
  throw new Error("Soil plots must use one perspective-safe ground layer with crops anchored above it in gameplay and placement previews");
}
const removedCropGroundHooks = ["CROP_GROUND_Y", "cropGroundY", "--crop-ground-y"];
if (removedCropGroundHooks.some((hook) => html.includes(hook) || theme.includes(hook)) ||
    /data-center-axis\s*=\s*["']x["']/.test(html) ||
    !/transform:\s*translate\(-50%,-50%\)\s*translate\(var\(--crop-x,0px\),var\(--crop-y,0px\)\)\s*scale\(var\(--crop-scale,1\)\)/.test(theme)) {
  throw new Error("Top-down crop sprites must share a true centred anchor without legacy ground-Y offsets or horizontal-only alpha centring");
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
const expectedGeneratedArtCount = farm.CROPS.length * 4 + farm.ITEMS.length + farm.FERTILISERS.length + questNpcs.length;
if (generatedArtPaths.length !== expectedGeneratedArtCount || new Set(generatedArtPaths).size !== expectedGeneratedArtCount) {
  throw new Error(`Expected ${expectedGeneratedArtCount} unique generated production sprites, received ${new Set(generatedArtPaths).size}`);
}
let generatedBytes = 0;
for (const asset of generatedArtPaths) {
  const size = fs.statSync(asset).size;
  if (size < 250 || size > 30000) throw new Error(`Generated sprite has an unexpected size: ${asset} (${size} bytes)`);
  generatedBytes += size;
}
const generatedByteBudget = generatedArtPaths.length * 12_500;
if (generatedBytes > generatedByteBudget || !serviceWorker.includes("const GENERATED_ART") || !serviceWorker.includes("...GENERATED_ART")) {
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
const baselineFertilisers = [
  "speed-bronze", "speed-silver", "speed-gold", "speed-iridium",
  "quality-bronze", "quality-silver", "quality-gold", "quality-iridium"
];
if (farm.FERTILISERS.length < baselineFertilisers.length ||
    baselineFertilisers.some((id) => !farm.FERTILISERS.some((item) => item.id === id)) ||
    fertiliserFamilies.has("double") ||
    !farm.FERTILISERS.some((item) => item.id === "quality-iridium" && item.guaranteed === "iridium")) {
  throw new Error("Speed Grow and Quality Fertiliser must each offer Bronze through Iridium tiers");
}
if (farm.FARM_UPGRADES.length < 8 || farm.FARM_UPGRADES.some((item) => !item.level || !item.gold)) {
  throw new Error("Farmhouse upgrades must be one-time, level-gated purchases");
}
const compostBin = farm.FARM_UPGRADES.find((upgrade) => upgrade.id === "compost-bin");
if (!compostBin || compostBin.level !== 5 || compostBin.gold !== 350 ||
    compostBin.effect?.quality !== 5 || Object.keys(compostBin.effect || {}).length !== 1 ||
    farm.FARM_UPGRADE_ART?.["compost-bin"] !== TOPDOWN_ASSETS.compostBin) {
  throw new Error("The Compost Bin must remain the level-5, 350-gold, +5% quality upgrade with approved top-down artwork");
}
if (farm.FARM_UPGRADE_ART?.["deep-beds"] !== TOPDOWN_ASSETS.deepBeds) {
  throw new Error("Deep Beds must use approved top-down artwork");
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
