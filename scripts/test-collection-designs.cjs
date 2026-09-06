/* Logic-level regression checks using a small DOM adapter, not a visual browser test. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "repdrop.js"), "utf8");
const STATE_KEY = "repdrop-combined-v1";
const DESIGN_KEY = "repdrop-collection-design-v1";

function boot({ url = "https://example.test/?collectionDesign=album#collections", preference, blockedStorage = false } = {}) {
  const nodes = new Map();
  let document;
  function node(id = "") {
    const listeners = new Map();
    const classes = new Set();
    return {
      id, dataset: {}, attributes: {}, innerHTML: "", textContent: "", hidden: false,
      style: { setProperty(key, value) { this[key] = value; } },
      classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        contains: (name) => classes.has(name),
        toggle(name, on = !classes.has(name)) { if (on) classes.add(name); else classes.delete(name); }
      },
      setAttribute(key, value) { this.attributes[key] = value; },
      removeAttribute(key) { delete this.attributes[key]; },
      addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(callback); },
      dispatch(type, event = {}) { for (const callback of listeners.get(type) || []) callback({ target: this, preventDefault() {}, ...event }); },
      closest(selector) { return selector === "[data-open-collection]" && this.dataset.openCollection ? this : null; },
      showModal() { this.open = true; }, close() { this.open = false; },
      focus() { document.activeElement = this; }
    };
  }
  const get = (id) => { if (!nodes.has(id)) nodes.set(id, node(id)); return nodes.get(id); };
  const designs = ["album", "gallery", "journal"].map((design) => { const item = node(); item.dataset.collectionDesign = design; return item; });
  const screens = ["today", "collections", "shop"].map(get);
  const nav = screens.map((screen) => { const item = node(); item.dataset.screen = screen.id; return item; });
  const buy = node(); buy.dataset = { buyCapsules: "1", cost: "75" };
  document = {
    body: node(), documentElement: node(), activeElement: null,
    querySelector: (selector) => get(selector.replace(/^#/, "")),
    querySelectorAll: (selector) => {
      if (selector === "[data-collection-design]") return designs;
      if (selector === "[data-screen]") return nav;
      if (selector === "[data-buy-capsules]") return [buy];
      if (selector === ".screen") return screens;
      return [];
    },
    addEventListener() {}
  };
  const data = new Map([[STATE_KEY, JSON.stringify({
    coinGrantVersion: 1, coins: 4321, capsules: 2, collection: ["ruby", "sapphire"], activeSet: "gemstones"
  })]]);
  if (preference) data.set(DESIGN_KEY, preference);
  const localStorage = {
    getItem(key) { if (blockedStorage) throw Error("Storage unavailable"); return data.get(key) || null; },
    setItem(key, value) { if (blockedStorage) throw Error("Storage unavailable"); data.set(key, value); }
  };
  const location = new URL(url);
  const timers = new Map();
  let timerId = 0;
  const math = Object.create(Math); math.random = () => 0;
  const window = { addEventListener() {}, scrollTo() {} };
  const context = {
    document, localStorage, location, window, navigator: {}, URL, URLSearchParams, Date, Math: math,
    console: { warn() {}, log() {} },
    history: { replaceState(_state, _title, next) { location.href = new URL(next, location).href; } },
    setTimeout(callback) { timers.set(++timerId, callback); return timerId; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(source, context);
  function flush() { while (timers.size) { const [id, callback] = timers.entries().next().value; timers.delete(id); callback(); } }
  function delegated(id, dataset) { get(id).dispatch("click", { target: { closest: () => ({ dataset }) } }); }
  const state = () => JSON.parse(JSON.stringify(window.__repdropTest.getState()));
  return { get, designs, nav, data, state, location, flush, delegated, buy };
}

const app = boot();
const before = app.state();
assert.equal(app.get("collections").dataset.design, "album");
assert.equal(app.get("collections").hidden, false, "deep link opens the collection");
assert.equal((app.get("collectionGrid").innerHTML.match(/data-view-card=/g) || []).length, 10);
assert.equal(app.get("collectionProgress").textContent, "2 / 10 collected");
assert.equal(app.get("collectionTotal").textContent, "2 / 30");

for (const design of app.designs) {
  design.dispatch("click");
  assert.equal(app.get("collections").dataset.design, design.dataset.collectionDesign);
  assert.equal(app.data.get(DESIGN_KEY), design.dataset.collectionDesign);
  assert.equal(app.location.searchParams.get("collectionDesign"), design.dataset.collectionDesign);
  assert.deepEqual(app.state(), before, "changing presentation cannot mutate progress");
}

app.get("collectionFilter").dispatch("change", { target: { value: "owned" } });
assert.equal((app.get("collectionGrid").innerHTML.match(/data-view-card=/g) || []).length, 2);
app.delegated("collectionGrid", { viewCard: "ruby" });
assert.equal(app.get("cardDetailTitle").textContent, "Crimson Ruby");
assert.equal(app.get("cardDetailModal").open, true);
assert.equal(app.get("previousCard").disabled, true);
app.get("nextCard").dispatch("click");
assert.equal(app.get("cardDetailTitle").textContent, "Ocean Sapphire");
assert.equal(app.get("nextCard").disabled, true);
app.get("collectionFilter").dispatch("change", { target: { value: "all" } });
app.delegated("collectionGrid", { viewCard: "diamond" });
assert.equal(app.get("cardDetailTitle").textContent, "Still to be discovered");
assert.ok(!app.get("cardDetailArt").innerHTML.includes("diamond-gem"), "locked artwork must stay hidden");
assert.deepEqual(app.state(), before, "inspection and filtering cannot mutate progress");

app.delegated("collectionLibraryGrid", { openCollection: "bloom" });
assert.ok(app.get("collectionPage").classList.contains("turning-out"));
app.flush();
assert.equal(app.get("collectionTitle").textContent, "Bloom Atelier");
assert.equal(app.state().activeSet, "bloom");
assert.equal(app.get("collectionGrid").attributes["aria-labelledby"], "folder-bloom");
assert.equal(app.get("capsuleBannerTitle").textContent, "Bloom Atelier capsule ready");
app.get("collectionFilter").dispatch("change", { target: { value: "owned" } });
assert.ok(app.get("collectionGrid").innerHTML.includes("Your story starts here."));
app.get("collectionLibraryGrid").dispatch("keydown", { key: "ArrowRight" });
app.flush();
assert.equal(app.state().activeSet, "cosmic");
assert.equal(app.state().coins, before.coins);
assert.deepEqual(app.state().plans, before.plans);
assert.deepEqual(app.state().collection, before.collection);

assert.equal(boot({ url: "https://example.test/#collections", preference: "journal" }).get("collections").dataset.design, "journal");
assert.equal(boot({ url: "https://example.test/?collectionDesign=gallery#collections", preference: "journal" }).get("collections").dataset.design, "gallery");
assert.equal(boot({ url: "https://example.test/?collectionDesign=invalid#collections", preference: "invalid" }).get("collections").dataset.design, "album");
const noStorage = boot({ blockedStorage: true });
noStorage.designs[1].dispatch("click");
assert.equal(noStorage.get("collections").dataset.design, "gallery");

const purchase = boot();
purchase.buy.dispatch("click");
purchase.flush();
assert.equal(purchase.state().coins, 4321 - 75 + 25, "existing duplicate refund stays 25 coins");
assert.equal(purchase.state().capsules, 2, "purchase opens automatically");
assert.deepEqual(purchase.state().collection, ["ruby", "sapphire"], "duplicates do not duplicate owned cards");
assert.equal(purchase.get("collectionTotal").textContent, "2 / 30");
console.log("Collection regression checks passed: three designs, deep links, preference isolation, filters, detail navigation, locked cards, folder turns, keyboard tabs and capsule synchronization.");
