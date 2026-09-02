const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const js = read("repdrop.js");
const css = read("repdrop.css");
const sw = read("sw.js");
const manifest = JSON.parse(read("manifest.webmanifest"));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(html.includes("Today’s requirements"), "Today requirements are missing");
check(html.includes("Simulate detected rep"), "simulated AI rep control is missing");
check(html.includes("full pose detection is not implemented yet"), "pose detection limitation is not disclosed");
check(html.includes("Earn 50 coins + 1 mystery capsule"), "daily reward copy is incorrect");
check((html.match(/data-screen=/g) || []).length === 3, "bottom navigation must have exactly three screens");
check(!/data-screen="(?:farm|quests|silo|upgrade)"/.test(html), "retired farm navigation is still present");
check((html.match(/data-buy-capsules=/g) || []).length === 1, "shop must expose exactly one capsule offer");
check(!html.includes('data-buy-capsules="3"') && !html.includes('data-cost="190"'), "retired multi-capsule offer is still present");
check(html.includes("$3.99"), "exercise pack price is missing");
check(html.includes("Payment processing is not connected"), "prototype payment disclosure is missing");
check(js.includes('const STARTER_EXERCISES = ["pushup", "squat", "situp"]'), "starter exercises are incorrect");
check(js.includes('const EXTRA_EXERCISES = ["burpee", "climber", "jumpingJack"]'), "exercise pack exercises are incorrect");
check(js.includes('steps: { name: "Steps"') && js.includes('{ steps: 7500,'), "steps are not available as a scheduled daily requirement");
check((js.match(/set: "gemstones"/g) || []).length === 10, "Gemstone Vault must contain 10 cards");
check((js.match(/set: "bloom"/g) || []).length === 10, "Bloom Atelier must contain 10 cards");
check((js.match(/set: "cosmic"/g) || []).length === 10, "Cosmic Crew must contain 10 cards");
check(js.includes('name: "Gemstone Vault"') && js.includes('name: "Bloom Atelier"') && js.includes('name: "Cosmic Crew"'), "the three collection definitions are incomplete");
check(html.includes('id="collectionPage"') && html.includes('id="collectionLibraryGrid"') && html.includes('id="openBinderCapsule"'), "functional card binder page is missing");
check(js.includes("data-open-collection") && js.includes("cardsFor(state.activeSet)"), "collection selection does not control capsule drops");
check(js.includes('page.classList.add("turning-out")') && js.includes('page.classList.add("turning-in")'), "folder page-turn behavior is missing");
check(js.includes("state.coins += 50") && js.includes("state.capsules += 1"), "daily completion reward logic is incomplete");
check(js.includes("if (duplicate) state.coins += 25"), "duplicate refund must be 25 coins");
check(js.includes("data-cost=\"75\"") || html.includes('data-cost="75"'), "single capsule must cost 75 coins");
check(js.includes("localStorage.setItem(STORAGE_KEY"), "local progress persistence is missing");
check(js.includes("window.IronboundSteps = { receive: receiveSteps }"), "native step bridge is missing");
check(!js.includes("state.steps -=") && !js.includes("state.todaySteps -="), "steps must not be spent as currency");
check(!html.includes('id="stepChip"') && !html.includes('id="stepCount"'), "steps still look like a header currency");
check(js.includes("coinGrantVersion") && js.includes("merged.coins += 10000") && js.includes("coins: 10000"), "10,000-coin launch grant is missing");
check(html.includes("coin-dumbbell-pixel-v1.png"), "custom dumbbell coin icon is not used");
check(js.includes("setTimeout(revealCapsule, 260)"), "purchased capsules do not open automatically");
check(css.includes("@keyframes capsule-split-top") && css.includes("@keyframes capsule-split-bottom"), "two-piece capsule animation is missing");
check(css.includes(".requirements-card.complete"), "completed Today styling is missing");
check(css.includes(".requirement-circle"), "completion circle styling is missing");
check(css.includes("@keyframes binder-page-out") && css.includes("@keyframes binder-page-in"), "folder page-turn animation is missing");
check(css.includes(".binder-folder-tab") && css.includes(".binder-capsule-button"), "card binder styling is incomplete");
check(sw.includes('const CACHE = "repdrop-v6"'), "offline cache version is incorrect");
check(html.includes('repdrop.css?v=6') && html.includes('repdrop.js?v=6'), "RepDrop asset cache-busters are stale");
check(manifest.name.startsWith("RepDrop"), "manifest is still branded as the farm app");

for (const asset of [
  "assets/farm/ui-v3/step-currency-v2-96.png",
  "assets/repdrop/repdrop-capsule-open-v1.webp",
  "assets/repdrop/coin-dumbbell-pixel-v1.png",
  "assets/repdrop/ruby-gem-card-pixel-v2.webp",
  "assets/repdrop/diamond-gem-card-pixel-v2.webp",
  "assets/repdrop/opal-gem-card-pixel-v2.webp",
  "assets/repdrop/peridot-gem-card-pixel-v2.webp",
  "assets/repdrop/poppy-muse-botanical-ink.webp",
  "assets/repdrop/moon-orchid-card-art.webp"
]) check(fs.existsSync(path.join(root, asset)), `missing required asset: ${asset}`);

if (failures.length) {
  console.error(`RepDrop validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("RepDrop validation passed: exercise tracking, rewards, three collectible-card series, shop, schedules, step bridge and offline shell are present.");
