(() => {
  "use strict";

  const STORAGE_KEY = "repdrop-combined-v1";
  const LEGACY_FARM_KEY = "meadowstep-farm-v1";
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const SHORT_DAYS = ["S", "M", "T", "W", "T", "F", "S"];
  const STARTER_EXERCISES = ["pushup", "squat", "situp"];
  const EXTRA_EXERCISES = ["burpee", "climber", "jumpingJack"];
  const EXERCISES = {
    steps: { name: "Steps", singular: "step", icon: "steps" },
    pushup: { name: "Pushups", singular: "pushup", icon: "↔" },
    squat: { name: "Squats", singular: "squat", icon: "↧" },
    situp: { name: "Sit-ups", singular: "sit-up", icon: "⌁" },
    burpee: { name: "Burpees", singular: "burpee", icon: "⚡" },
    climber: { name: "Mountain climbers", singular: "mountain climber", icon: "⛰" },
    jumpingJack: { name: "Jumping jacks", singular: "jumping jack", icon: "✦" }
  };

  const DEFAULT_TARGETS = [
    { steps: 7500, pushup: 30, squat: 40, situp: 25 },
    { steps: 7500, pushup: 20, squat: 35, situp: 30 },
    { steps: 7500, pushup: 30, squat: 40, situp: 25 },
    { steps: 7500, pushup: 25, squat: 30, situp: 30 },
    { steps: 7500, pushup: 30, squat: 40, situp: 25 },
    { steps: 7500, pushup: 20, squat: 50, situp: 20 },
    { steps: 7500, pushup: 15, squat: 25, situp: 20 }
  ];

  const COLLECTIONS = [
    { id: "gemstones", name: "Gemstone Vault", short: "Gems", symbol: "◆", tone: "#7066e8", cover: "assets/repdrop/sapphire-gem-card-pixel-v2.webp", description: "10 pixel gems" },
    { id: "bloom", name: "Bloom Atelier", short: "Bloom", symbol: "✿", tone: "#e86e84", cover: "assets/repdrop/poppy-muse-botanical-ink.webp", description: "10 painted botanicals" },
    { id: "cosmic", name: "Cosmic Crew", short: "Cosmic", symbol: "🚀", tone: "#318bdc", emoji: "🪐", description: "10 space friends" }
  ];

  const CARDS = [
    { id: "ruby", set: "gemstones", name: "Crimson Ruby", rarity: "EPIC", art: "assets/repdrop/ruby-gem-card-pixel-v2.webp" },
    { id: "sapphire", set: "gemstones", name: "Ocean Sapphire", rarity: "RARE", art: "assets/repdrop/sapphire-gem-card-pixel-v2.webp" },
    { id: "emerald", set: "gemstones", name: "Verdant Emerald", rarity: "EPIC", art: "assets/repdrop/emerald-gem-card-pixel-v2.webp" },
    { id: "amethyst", set: "gemstones", name: "Violet Amethyst", rarity: "RARE", art: "assets/repdrop/amethyst-gem-card-pixel-v2.webp" },
    { id: "citrine", set: "gemstones", name: "Solar Citrine", rarity: "COMMON", art: "assets/repdrop/citrine-gem-card-pixel-v2.webp" },
    { id: "diamond", set: "gemstones", name: "Starlight Diamond", rarity: "LEGENDARY", art: "assets/repdrop/diamond-gem-card-pixel-v2.webp" },
    { id: "aquamarine", set: "gemstones", name: "Aquamarine Tide", rarity: "RARE", art: "assets/repdrop/aquamarine-gem-card-pixel-v2.webp" },
    { id: "opal", set: "gemstones", name: "Dream Opal", rarity: "EPIC", art: "assets/repdrop/opal-gem-card-pixel-v2.webp" },
    { id: "garnet", set: "gemstones", name: "Heart Garnet", rarity: "RARE", art: "assets/repdrop/garnet-gem-card-pixel-v2.webp" },
    { id: "peridot", set: "gemstones", name: "Meadow Peridot", rarity: "COMMON", art: "assets/repdrop/peridot-gem-card-pixel-v2.webp" },
    { id: "poppy", set: "bloom", name: "Poppy Muse", rarity: "EPIC", art: "assets/repdrop/poppy-muse-botanical-ink.webp" },
    { id: "golden", set: "bloom", name: "Golden Hour", rarity: "RARE", art: "assets/repdrop/golden-hour-card-art.webp" },
    { id: "bluebell", set: "bloom", name: "Bluebell Waltz", rarity: "COMMON", art: "assets/repdrop/bluebell-waltz-card-art.webp" },
    { id: "dahlia", set: "bloom", name: "Dahlia Drama", rarity: "EPIC", art: "assets/repdrop/dahlia-drama-card-art.webp" },
    { id: "wild", set: "bloom", name: "Wild Daisy", rarity: "COMMON", art: "assets/repdrop/wild-daisy-card-art.webp" },
    { id: "iris", set: "bloom", name: "Iris Ink", rarity: "RARE", art: "assets/repdrop/iris-ink-card-art.webp" },
    { id: "peony", set: "bloom", name: "Peony Blush", rarity: "EPIC", art: "assets/repdrop/peony-blush-card-art.webp" },
    { id: "lavender", set: "bloom", name: "Lavender Hush", rarity: "COMMON", art: "assets/repdrop/lavender-hush-card-art.webp" },
    { id: "tulip", set: "bloom", name: "Tulip Tempo", rarity: "RARE", art: "assets/repdrop/tulip-tempo-card-art.webp" },
    { id: "moon-orchid", set: "bloom", name: "Moon Orchid", rarity: "EPIC", art: "assets/repdrop/moon-orchid-card-art.webp" },
    { id: "luna", set: "cosmic", name: "Luna", rarity: "RARE", emoji: "🌙" },
    { id: "solar", set: "cosmic", name: "Solar", rarity: "EPIC", emoji: "☀️" },
    { id: "comet", set: "cosmic", name: "Comet", rarity: "RARE", emoji: "☄️" },
    { id: "nova", set: "cosmic", name: "Nova", rarity: "EPIC", emoji: "⭐" },
    { id: "rex", set: "cosmic", name: "Rex", rarity: "RARE", emoji: "🚀" },
    { id: "ringo", set: "cosmic", name: "Ringo", rarity: "COMMON", emoji: "🪐" },
    { id: "orbit", set: "cosmic", name: "Orbit", rarity: "EPIC", emoji: "👽" },
    { id: "scout", set: "cosmic", name: "Scout", rarity: "RARE", emoji: "🛸" },
    { id: "terra", set: "cosmic", name: "Terra", rarity: "COMMON", emoji: "🌍" },
    { id: "rocky", set: "cosmic", name: "Rocky", rarity: "COMMON", emoji: "🪨" }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const cloneTargets = () => DEFAULT_TARGETS.map((targets) => ({ ...targets }));
  const dayKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const clampNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Math.min(max, Math.max(min, Number(value) || 0));
  const formatNumber = (value) => Math.floor(clampNumber(value)).toLocaleString();

  function freshState() {
    return {
      version: 1,
      coins: 10000,
      coinGrantVersion: 1,
      capsules: 1,
      packOwned: false,
      collection: [],
      plans: cloneTargets(),
      dailyCounts: {},
      completedDays: {},
      rewardedDays: {},
      todaySteps: 0,
      stepDate: dayKey(),
      trackingStatus: "saved",
      activeSet: "gemstones",
      activeExercise: "pushup"
    };
  }

  function normalizedPlan(plan, packOwned) {
    const keys = packOwned ? ["steps", ...STARTER_EXERCISES, ...EXTRA_EXERCISES] : ["steps", ...STARTER_EXERCISES];
    return Object.fromEntries(keys.map((id) => [id, clampNumber(plan?.[id], 0, id === "steps" ? 100000 : 999)]));
  }

  function loadState() {
    const initial = freshState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") {
        const merged = { ...initial, ...saved };
        merged.coins = clampNumber(merged.coins);
        if (!saved.coinGrantVersion) {
          merged.coins += 10000;
          merged.coinGrantVersion = 1;
        }
        merged.capsules = clampNumber(merged.capsules);
        merged.packOwned = Boolean(merged.packOwned);
        merged.collection = Array.isArray(merged.collection) ? [...new Set(merged.collection.filter((id) => CARDS.some((card) => card.id === id)))] : [];
        merged.plans = DEFAULT_TARGETS.map((fallback, index) => normalizedPlan({ ...fallback, ...(merged.plans?.[index] || {}) }, merged.packOwned));
        merged.dailyCounts = merged.dailyCounts && typeof merged.dailyCounts === "object" ? merged.dailyCounts : {};
        merged.completedDays = merged.completedDays && typeof merged.completedDays === "object" ? merged.completedDays : {};
        merged.rewardedDays = merged.rewardedDays && typeof merged.rewardedDays === "object" ? merged.rewardedDays : {};
        if (!COLLECTIONS.some((collection) => collection.id === merged.activeSet)) merged.activeSet = "gemstones";
        if (!EXERCISES[merged.activeExercise]) merged.activeExercise = "pushup";
        return merged;
      }
    } catch (error) {
      console.warn("RepDrop save could not be loaded.", error);
    }

    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_FARM_KEY) || "null");
      if (legacy && typeof legacy === "object") {
        initial.todaySteps = clampNumber(legacy.todaySteps ?? legacy.stepsToday ?? 0);
        initial.trackingStatus = initial.todaySteps > 0 ? "connected" : "saved";
      }
    } catch (_) {
      // A malformed legacy farm save should never prevent RepDrop from starting.
    }
    return initial;
  }

  let state = loadState();
  let selectedScheduleDay = new Date().getDay();
  let scheduleDraft = null;
  let toastTimer = null;

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("RepDrop progress could not be saved.", error);
    }
  }

  function ownedExercises() {
    return state.packOwned ? [...STARTER_EXERCISES, ...EXTRA_EXERCISES] : [...STARTER_EXERCISES];
  }

  function scheduledExercises() {
    return ["steps", ...ownedExercises()];
  }

  function activeCollection() {
    return COLLECTIONS.find((collection) => collection.id === state.activeSet) || COLLECTIONS[0];
  }

  function cardsFor(setId) {
    return CARDS.filter((card) => card.set === setId);
  }

  function progressCount(id) {
    return id === "steps" ? clampNumber(state.todaySteps) : clampNumber(currentCounts()[id]);
  }

  function exerciseIcon(id) {
    return id === "steps"
      ? '<img class="step-exercise-icon" src="assets/farm/ui-v3/step-currency-v2-96.png" alt="">'
      : EXERCISES[id].icon;
  }

  function currentCounts() {
    const key = dayKey();
    if (!state.dailyCounts[key] || typeof state.dailyCounts[key] !== "object") state.dailyCounts[key] = {};
    return state.dailyCounts[key];
  }

  function todayRequirements() {
    const plan = state.plans[new Date().getDay()] || DEFAULT_TARGETS[new Date().getDay()];
    return scheduledExercises()
      .map((id) => ({ id, target: clampNumber(plan[id], 0, id === "steps" ? 100000 : 999) }))
      .filter((item) => item.target > 0);
  }

  function completedToday() {
    const requirements = todayRequirements();
    return requirements.length > 0 && requirements.every(({ id, target }) => progressCount(id) >= target);
  }

  function syncCompletion() {
    const key = dayKey();
    if (completedToday()) state.completedDays[key] = true;
    else if (!state.rewardedDays[key]) delete state.completedDays[key];
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function renderHeader() {
    const collection = activeCollection();
    $("#coinCount").textContent = formatNumber(state.coins);
    $("#shopCoinCount").textContent = formatNumber(state.coins);
    $("#capsuleCount").textContent = formatNumber(state.capsules);
    $("#capsuleChip").classList.toggle("has-capsule", state.capsules > 0);
    $("#capsuleBannerTitle").textContent = `${collection.name} capsule ready`;
    $("#capsuleBannerCopy").textContent = `Open it to reveal a ${collection.short.toLowerCase()} card`;
  }

  function renderToday() {
    syncCompletion();
    const counts = currentCounts();
    const requirements = todayRequirements();
    const complete = completedToday();
    const completeCount = requirements.filter(({ id, target }) => progressCount(id) >= target).length;
    let hero = requirements.find(({ id }) => id === state.activeExercise) || requirements[0];
    if (!hero) hero = { id: "pushup", target: 0 };
    state.activeExercise = hero.id;
    const heroCount = progressCount(hero.id);
    const percent = hero.target ? Math.min(100, Math.round((heroCount / hero.target) * 100)) : 100;

    $("#todayEyebrow").textContent = `${DAYS[new Date().getDay()].toUpperCase()} · TODAY`;
    $("#todayTitle").textContent = complete ? "Routine complete!" : heroCount > 0 ? "Keep it moving." : "Ready to move?";
    $("#stepStatus").textContent = state.trackingStatus === "connected" ? "Live steps connected" : `${formatNumber(state.todaySteps)} steps today`;
    $("#heroCount").textContent = formatNumber(heroCount);
    $("#heroGoal").textContent = `OF ${formatNumber(hero.target)} ${EXERCISES[hero.id].name.toUpperCase()}`;
    $("#heroPercent").textContent = `${percent}%`;
    const ring = $("#heroRing");
    ring.style.setProperty("--progress", `${percent * 3.6}deg`);
    ring.setAttribute("aria-valuemax", String(hero.target));
    ring.setAttribute("aria-valuenow", String(Math.min(heroCount, hero.target)));

    const card = $("#requirementsCard");
    card.classList.toggle("complete", complete);
    $("#requirementsSummary").textContent = complete ? "Every requirement finished—nice work." : `${Math.max(0, requirements.length - completeCount)} requirement${requirements.length - completeCount === 1 ? "" : "s"} remaining`;
    $("#requirementsStatus").textContent = `${completeCount}/${requirements.length}`;
    $("#requirementGrid").innerHTML = requirements.length
      ? requirements.map(({ id, target }) => {
          const count = progressCount(id);
          const itemPercent = target ? Math.min(100, Math.round((count / target) * 100)) : 100;
          return `<button class="requirement${count >= target ? " complete" : ""}" type="button" data-exercise="${id}" aria-label="Track ${EXERCISES[id].name}">
            <span class="requirement-circle${count >= target ? " done" : ""}" style="--progress:${itemPercent * 3.6}deg"><i>${count >= target ? "✓" : exerciseIcon(id)}</i></span>
            <b>${EXERCISES[id].name}</b><small>${formatNumber(count)} / ${formatNumber(target)}</small>
          </button>`;
        }).join("")
      : `<div class="rest-day"><span>☁</span><b>Rest day</b><small>Add an exercise from your weekly schedule.</small></div>`;

    const rewarded = Boolean(state.rewardedDays[dayKey()]);
    const rewardCard = $("#rewardCard");
    rewardCard.classList.toggle("ready", complete && !rewarded);
    rewardCard.classList.toggle("claimed", rewarded);
    $("#rewardTitle").textContent = rewarded ? "Today’s reward claimed" : complete ? "Your reward is ready" : "Complete today’s routine";
    const claim = $("#claimReward");
    claim.disabled = !complete || rewarded;
    claim.textContent = rewarded ? "CLAIMED" : "+50";
    $("#openCapsule").hidden = state.capsules < 1;
    renderWeek();
  }

  function renderWeek() {
    const today = new Date();
    const start = new Date(today);
    const mondayOffset = (today.getDay() + 6) % 7;
    start.setDate(today.getDate() - mondayOffset);
    const dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
    const completed = dates.filter((date) => Boolean(state.completedDays[dayKey(date)])).length;
    $("#weekSummary").textContent = `${completed} of 7 daily routines complete`;
    $("#weekPercent").textContent = `${Math.round((completed / 7) * 100)}%`;
    $("#weekRow").innerHTML = dates.map((date) => {
      const isToday = dayKey(date) === dayKey(today);
      const isComplete = Boolean(state.completedDays[dayKey(date)]);
      const label = SHORT_DAYS[date.getDay()];
      return `<span class="week-day${isToday ? " today" : ""}${isComplete ? " complete" : ""}" aria-label="${DAYS[date.getDay()]}${isComplete ? ", complete" : ""}"><b>${label}</b><i>${isComplete ? "✓" : date.getDate()}</i></span>`;
    }).join("");
  }

  function cardMarkup(card, owned, reveal = false) {
    const className = reveal ? "reveal-card" : "collectible";
    const collection = COLLECTIONS.find((item) => item.id === card.set) || COLLECTIONS[0];
    const number = String(cardsFor(card.set).findIndex((item) => item.id === card.id) + 1).padStart(3, "0");
    if (!owned && !reveal) {
      return `<article class="${className} locked" aria-label="Undiscovered ${collection.name} card"><div class="card-back"><small>${collection.short.toUpperCase()} · CARD</small><i>?</i><b>REPDROP</b><small>KEEP MOVING</small></div></article>`;
    }
    const art = card.art
      ? `<img src="${card.art}" alt="${card.name}">`
      : `<span class="emoji-art" aria-hidden="true">${card.emoji}</span>`;
    return `<article class="${className} owned rarity-${card.rarity.toLowerCase()}">
      <div class="collectible-top"><span>${collection.short.toUpperCase()}</span><span class="card-number">#${number}</span></div>
      <div class="collectible-art">${art}</div>
      <div class="collectible-info"><b>${card.name}</b><span class="rarity ${card.rarity.toLowerCase()}">${card.rarity}</span></div>
      <div class="collectible-foot"><span>REPDROP</span><span>MOVE · EARN · REVEAL</span></div>
    </article>`;
  }

  function renderCollectionLibrary() {
    $("#collectionLibraryGrid").innerHTML = COLLECTIONS.map((collection) => {
      const cards = cardsFor(collection.id);
      const owned = cards.filter((card) => state.collection.includes(card.id)).length;
      const cover = collection.cover
        ? `<img src="${collection.cover}" alt="">`
        : `<span class="series-tab-emoji" aria-hidden="true">${collection.emoji}</span>`;
      const active = collection.id === state.activeSet;
      return `<button class="series-tab${active ? " active" : ""}" type="button" role="tab" aria-selected="${active}" data-open-collection="${collection.id}" style="--collection-tone:${collection.tone}" aria-label="Select ${collection.name}">
        <span class="series-tab-art">${cover}</span>
        <span><b>${collection.name}</b><small>${owned}/${cards.length} FOUND</small></span>
      </button>`;
    }).join("");
  }

  function renderCollections() {
    const collection = activeCollection();
    const cards = cardsFor(state.activeSet);
    const owned = cards.filter((card) => state.collection.includes(card.id)).length;
    const totalOwned = CARDS.filter((card) => state.collection.includes(card.id)).length;
    renderCollectionLibrary();
    $("#albumTotalProgress").textContent = `${totalOwned}/${CARDS.length}`;
    $("#collectionSymbol").textContent = collection.symbol;
    $("#collectionTitle").textContent = collection.name;
    $("#collectionMeta").textContent = `${collection.short.toUpperCase()} SERIES · ${cards.length} CARDS`;
    $("#collectionProgress").textContent = `${owned}/${cards.length}`;
    $("#collectionProgressBar").style.width = `${(owned / cards.length) * 100}%`;
    $("#collectionProgressBar").style.background = collection.tone;
    $("#collectionDetail").style.setProperty("--collection-tone", collection.tone);
    const cover = collection.cover
      ? `<img src="${collection.cover}" alt="">`
      : `<span>${collection.emoji}</span>`;
    $("#albumCoverArt").innerHTML = cover;
    $("#albumCoverArt").style.setProperty("--collection-tone", collection.tone);
    $("#collectionGrid").innerHTML = cards.map((card) => cardMarkup(card, state.collection.includes(card.id))).join("");
  }

  function showCollection(setId) {
    if (COLLECTIONS.some((collection) => collection.id === setId)) state.activeSet = setId;
    renderCollections();
    saveState();
  }

  function renderShop() {
    $("#shopCoinCount").textContent = formatNumber(state.coins);
    $("#shopCapsuleCopy").textContent = `Opens a card from ${activeCollection().name}.`;
    const pack = $("#exercisePack");
    pack.classList.toggle("owned", state.packOwned);
    $("#packPrice").textContent = state.packOwned ? "OWNED" : "$3.99";
    pack.setAttribute("aria-label", state.packOwned ? "Exercise pack owned" : "Unlock the exercise pack locally");
  }

  function renderAll() {
    renderHeader();
    renderToday();
    renderCollections();
    renderShop();
    saveState();
  }

  function navigate(screenId) {
    $$(".screen").forEach((screen) => {
      const active = screen.id === screenId;
      screen.hidden = !active;
      screen.classList.toggle("active", active);
    });
    $$('[data-screen]').forEach((button) => {
      const active = button.dataset.screen === screenId;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (screenId === "collections") {
      renderCollections();
    }
    if (screenId === "shop") renderShop();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showDialog(dialog) {
    if (!dialog.open) dialog.showModal();
  }

  function renderTracker() {
    const ids = ownedExercises();
    if (!ids.includes(state.activeExercise)) state.activeExercise = ids[0];
    const select = $("#trackerExercise");
    select.innerHTML = ids.map((id) => `<option value="${id}"${id === state.activeExercise ? " selected" : ""}>${EXERCISES[id].name}</option>`).join("");
    const plan = state.plans[new Date().getDay()] || {};
    const count = clampNumber(currentCounts()[state.activeExercise]);
    const goal = clampNumber(plan[state.activeExercise]);
    $("#trackerCount").textContent = formatNumber(count);
    $("#trackerGoal").textContent = `${EXERCISES[state.activeExercise].name.toUpperCase()} GOAL · ${formatNumber(goal)}`;
    $("#trackerCue").textContent = count ? "Rep detected—keep going" : "Get into position";
  }

  function openTracker(exerciseId) {
    if (exerciseId && ownedExercises().includes(exerciseId)) state.activeExercise = exerciseId;
    renderTracker();
    showDialog($("#trackerModal"));
    saveState();
  }

  function simulateRep() {
    const counts = currentCounts();
    counts[state.activeExercise] = clampNumber(counts[state.activeExercise]) + 1;
    syncCompletion();
    renderTracker();
    renderHeader();
    renderToday();
    saveState();
  }

  function claimReward() {
    const key = dayKey();
    if (!completedToday() || state.rewardedDays[key]) return;
    state.coins += 50;
    state.capsules += 1;
    state.rewardedDays[key] = true;
    state.completedDays[key] = true;
    renderAll();
    showToast("Daily reward claimed: +50 coins and +1 capsule!");
  }

  function renderSchedule() {
    const today = new Date().getDay();
    $("#scheduleDays").innerHTML = DAYS.map((day, index) => `<button type="button" role="tab" data-schedule-day="${index}" aria-selected="${index === selectedScheduleDay}" class="schedule-day${index === selectedScheduleDay ? " active" : ""}"><b>${day.slice(0, 3)}</b><small>${index === today ? "TODAY" : ""}</small></button>`).join("");
    $("#editingDay").textContent = `${DAYS[selectedScheduleDay]}’s exercises`;
    $("#scheduleList").innerHTML = scheduledExercises().map((id) => {
      const max = id === "steps" ? 100000 : 999;
      const target = clampNumber(scheduleDraft[selectedScheduleDay][id], 0, max);
      return `<label class="plan-exercise"><i class="plan-emoji">${exerciseIcon(id)}</i><span class="plan-copy"><b>${EXERCISES[id].name}</b><small>${target ? "Daily target" : "Not scheduled"}</small></span><input type="number" inputmode="numeric" min="0" max="${max}" value="${target}" data-schedule-exercise="${id}" aria-label="${EXERCISES[id].name} target for ${DAYS[selectedScheduleDay]}"><small>${id === "steps" ? "steps" : "reps"}</small></label>`;
    }).join("");
  }

  function openSchedule() {
    selectedScheduleDay = new Date().getDay();
    scheduleDraft = state.plans.map((plan) => ({ ...plan }));
    renderSchedule();
    showDialog($("#scheduleModal"));
  }

  function saveSchedule() {
    state.plans = scheduleDraft.map((plan) => normalizedPlan(plan, state.packOwned));
    syncCompletion();
    renderAll();
    showToast("Weekly schedule saved.");
  }

  function renderCapsuleChooser() {
    const collection = activeCollection();
    const cards = cardsFor(collection.id);
    $("#capsuleCollectionLabel").textContent = `${collection.name.toUpperCase()} COLLECTION`;
    $("#capsuleTitle").textContent = `Your ${collection.name} drop`;
    $("#capsuleDescription").textContent = `Reveal one of ${cards.length} collectible cards.`;
    $("#capsuleBannerTitle").textContent = `${collection.name} capsule ready`;
    $("#capsuleBannerCopy").textContent = `Open it to reveal a ${collection.short.toLowerCase()} card`;
    $("#capsuleStage").style.setProperty("--collection-tone", collection.tone);
    $("#capsuleChoose").hidden = false;
    $("#revealView").hidden = true;
    $("#capsuleStage").classList.remove("opening");
    $("#revealCapsule").disabled = state.capsules < 1;
    $("#revealCapsule").textContent = state.capsules > 0 ? `Open this capsule · ${state.capsules} owned` : "No capsules available";
  }

  function openCapsuleDialog() {
    if (state.capsules < 1) {
      navigate("shop");
      showToast("Visit the shop to get a mystery capsule.");
      return;
    }
    renderCapsuleChooser();
    showDialog($("#capsuleModal"));
  }

  function revealCapsule() {
    if (state.capsules < 1) return;
    const collection = activeCollection();
    const cards = cardsFor(collection.id);
    const card = cards[Math.floor(Math.random() * cards.length)];
    const duplicate = state.collection.includes(card.id);
    state.capsules -= 1;
    if (duplicate) state.coins += 25;
    else state.collection.push(card.id);
    $("#revealCapsule").disabled = true;
    $("#capsuleStage").classList.add("opening");
    $("#openingCapsule").classList.add("opening");
    saveState();
    setTimeout(() => {
      $("#capsuleChoose").hidden = true;
      const view = $("#revealView");
      view.hidden = false;
      view.innerHTML = `<span class="eyebrow lime">${duplicate ? "DUPLICATE DROP" : "NEW CARD"}</span>${cardMarkup(card, true, true)}<h2>${card.name}</h2><p>${duplicate ? "You already own this card, so it returned 25 coins." : `Added to ${collection.name}.`}</p><button class="open-capsule-button" type="button" data-finish-reveal>${state.capsules > 0 ? "Open another" : "Done"}</button>`;
      $("#capsuleStage").classList.remove("opening");
      $("#openingCapsule").classList.remove("opening");
      renderHeader();
      renderCollections();
      renderShop();
    }, 850);
  }

  function buyCapsules(amount, cost) {
    if (state.coins < cost) {
      showToast(`You need ${formatNumber(cost - state.coins)} more coins.`);
      return;
    }
    state.coins -= cost;
    state.capsules += amount;
    renderAll();
    openCapsuleDialog();
    showToast("Capsule purchased—opening now!");
    setTimeout(revealCapsule, 260);
  }

  function unlockExercisePack() {
    if (state.packOwned) {
      showToast("The full exercise pack is already unlocked.");
      return;
    }
    state.packOwned = true;
    state.plans = DEFAULT_TARGETS.map((fallback, index) => normalizedPlan({ ...fallback, ...(state.plans[index] || {}) }, true));
    renderAll();
    showToast("Exercise pack unlocked locally—no payment was made.");
  }

  function postNative(message) {
    try {
      if (window.ReactNativeWebView?.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
        return true;
      }
    } catch (_) {
      // The bridge is optional in an ordinary browser.
    }
    return false;
  }

  function receiveSteps(payload = {}) {
    const currentDate = payload.date || dayKey();
    if (state.stepDate !== currentDate) state.todaySteps = 0;
    state.stepDate = currentDate;
    if (payload.today != null) state.todaySteps = clampNumber(payload.today);
    else if (payload.steps != null) state.todaySteps = clampNumber(payload.steps);
    state.trackingStatus = payload.available === false ? "unavailable" : "connected";
    renderHeader();
    renderToday();
    saveState();
  }

  window.IronboundSteps = { receive: receiveSteps };
  window.addEventListener("ironbound-native-pedometer", (event) => receiveSteps(event.detail || {}));

  $$('[data-screen]').forEach((button) => button.addEventListener("click", () => navigate(button.dataset.screen)));
  $("#openTracker").addEventListener("click", () => openTracker());
  $("#requirementGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-exercise]");
    if (!button) return;
    if (button.dataset.exercise === "steps") {
      if (!postNative({ type: "requestPedometer" })) showToast("Step tracking connects automatically in the installed mobile app.");
      return;
    }
    openTracker(button.dataset.exercise);
  });
  $("#trackerExercise").addEventListener("change", (event) => {
    state.activeExercise = event.target.value;
    renderTracker();
    renderToday();
    saveState();
  });
  $("#simulateRep").addEventListener("click", simulateRep);
  $("#claimReward").addEventListener("click", claimReward);
  $("#openSchedule").addEventListener("click", openSchedule);
  $("#scheduleDays").addEventListener("click", (event) => {
    const button = event.target.closest("[data-schedule-day]");
    if (!button) return;
    selectedScheduleDay = Number(button.dataset.scheduleDay);
    renderSchedule();
  });
  $("#scheduleList").addEventListener("input", (event) => {
    if (!event.target.matches("[data-schedule-exercise]")) return;
    const id = event.target.dataset.scheduleExercise;
    scheduleDraft[selectedScheduleDay][id] = clampNumber(event.target.value, 0, id === "steps" ? 100000 : 999);
  });
  $("#scheduleForm").addEventListener("submit", () => saveSchedule());
  $("#collectionLibraryGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-collection]");
    if (button) showCollection(button.dataset.openCollection);
  });
  $("#openCollectionCapsule").addEventListener("click", openCapsuleDialog);
  $("#openCapsule").addEventListener("click", openCapsuleDialog);
  $("#capsuleChip").addEventListener("click", openCapsuleDialog);
  $("#revealCapsule").addEventListener("click", revealCapsule);
  $("#revealView").addEventListener("click", (event) => {
    if (!event.target.closest("[data-finish-reveal]")) return;
    if (state.capsules > 0) renderCapsuleChooser();
    else $("#capsuleModal").close();
  });
  $$('[data-buy-capsules]').forEach((button) => button.addEventListener("click", () => buyCapsules(Number(button.dataset.buyCapsules), Number(button.dataset.cost))));
  $("#exercisePack").addEventListener("click", unlockExercisePack);
  $$('[data-close]').forEach((button) => button.addEventListener("click", () => $("#" + button.dataset.close)?.close()));
  $$("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) postNative({ type: "requestPedometer" });
  });

  window.__repdropTest = {
    getState: () => JSON.parse(JSON.stringify(state)),
    exercises: Object.keys(EXERCISES),
    collections: COLLECTIONS.map((collection) => collection.id),
    cardCounts: Object.fromEntries(COLLECTIONS.map((collection) => [collection.id, cardsFor(collection.id).length])),
    receiveSteps
  };

  renderAll();
  postNative({ type: "pedometerReady" });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
