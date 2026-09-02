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
check((html.match(/data-buy-capsules=/g) || []).length === 3, "shop should only expose the hero, one-pack and three-pack capsule purchases");
check(html.includes("$3.99"), "exercise pack price is missing");
check(html.includes("Payment processing is not connected"), "prototype payment disclosure is missing");
check(js.includes('const STARTER_EXERCISES = ["pushup", "squat", "situp"]'), "starter exercises are incorrect");
check(js.includes('const EXTRA_EXERCISES = ["burpee", "climber", "jumpingJack"]'), "exercise pack exercises are incorrect");
check((js.match(/set: "gemstones"/g) || []).length === 10, "Gemstone Vault must contain 10 cards");
check(!/Cosmic Crew|Snack Squad|Bloom Atelier/.test(html + js), "retired collections are still present");
check(!html.includes("collectionTabs") && !js.includes("collectionTabs"), "the single collection must not show a collection selector");
check(js.includes("state.coins += 50") && js.includes("state.capsules += 1"), "daily completion reward logic is incomplete");
check(js.includes("if (duplicate) state.coins += 25"), "duplicate refund must be 25 coins");
check(js.includes("data-cost=\"75\"") || html.includes('data-cost="75"'), "single capsule must cost 75 coins");
check(html.includes('data-cost="190"'), "three capsules must cost 190 coins");
check(js.includes("localStorage.setItem(STORAGE_KEY"), "local progress persistence is missing");
check(js.includes("window.IronboundSteps = { receive: receiveSteps }"), "native step bridge is missing");
check(!js.includes("state.steps -=") && !js.includes("state.todaySteps -="), "steps must not be spent as currency");
check(css.includes(".requirements-card.complete"), "completed Today styling is missing");
check(css.includes(".requirement-circle"), "completion circle styling is missing");
check(sw.includes('const CACHE = "repdrop-v2"'), "offline cache version is incorrect");
check(manifest.name.startsWith("RepDrop"), "manifest is still branded as the farm app");

for (const asset of [
  "assets/farm/ui-v3/step-currency-v2-96.png",
  "assets/repdrop/repdrop-capsule-open-v1.webp",
  "assets/repdrop/ruby-gem-card-v1.webp",
  "assets/repdrop/diamond-gem-card-v1.webp",
  "assets/repdrop/opal-gem-card-v1.webp",
  "assets/repdrop/peridot-gem-card-v1.webp"
]) check(fs.existsSync(path.join(root, asset)), `missing required asset: ${asset}`);

if (failures.length) {
  console.error(`RepDrop validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("RepDrop validation passed: exercise tracking, rewards, the gemstone collection, shop, schedules, step bridge and offline shell are present.");
