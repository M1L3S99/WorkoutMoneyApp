/* ============================================================
   WorkoutMoney — Cloud Functions (the server that talks to Stripe)

   Endpoints (all "callable" from the web app after the user signs in):
     createSetupIntent  -> get a client secret so the browser can save a card
     saveContract       -> store the signed contract + make the card the default
     logWorkout         -> record a completed day (server-side = tamper-proof)
     useSkipToken       -> spend an earned token to exempt a day
     assessMe           -> recompute forfeits for the caller and charge the delta

   Scheduled:
     assessForfeits     -> runs daily, charges any newly-owed forfeits off-session

   The Stripe SECRET key is never in the app — it lives only here, injected as
   a Firebase secret (see payments/SETUP.md).
============================================================ */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Stripe = require('stripe');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const ADMIN_REDEEM_CODE = defineSecret('ADMIN_REDEEM_CODE');
const stripeClient = () => new Stripe((STRIPE_SECRET_KEY.value() || '').trim(), { apiVersion: '2024-06-20' });

const requireUid = (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Please sign in first.');
  return uid;
};
const getUser = async (uid) => { const s = await db.doc(`users/${uid}`).get(); return s.exists ? s.data() : {}; };

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function addMonths(d, n) {
  const x = new Date(d); const day = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + n);
  const dim = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(day, dim)); return x;
}

// surface the real Stripe/error message to the client instead of a generic "internal"
function surface(e, where) {
  console.error(where + ' failed:', e && e.message, e);
  throw new HttpsError('failed-precondition', (e && e.message) ? `${where}: ${e.message}` : `${where} failed.`);
}

/* ---- 1. Save a card (no charge yet) ---- */
exports.createSetupIntent = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const uid = requireUid(req);
  try {
    const stripe = stripeClient();
    const u = await getUser(uid);
    let customerId = u.stripeCustomerId;
    if (!customerId) {
      const c = await stripe.customers.create({ metadata: { uid } });
      customerId = c.id;
      await db.doc(`users/${uid}`).set({ stripeCustomerId: customerId }, { merge: true });
    }
    const si = await stripe.setupIntents.create({ customer: customerId, usage: 'off_session', payment_method_types: ['card'] });
    return { clientSecret: si.client_secret, customerId };
  } catch (e) { surface(e, 'Card setup'); }
});

/* ---- 2. Sign the contract ---- */
exports.saveContract = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const uid = requireUid(req);
  const { amount, charity, name, paymentMethodId, schedule, cycle, scheduleVersion, taskIds } = req.data || {};
  if (!(amount > 0)) throw new HttpsError('invalid-argument', 'A stake amount is required.');
  if (!paymentMethodId) throw new HttpsError('invalid-argument', 'A saved card is required.');
  if (!Array.isArray(schedule) || ![7, 14].includes(schedule.length)) throw new HttpsError('invalid-argument', 'A 7-day or 14-day schedule is required.');
  if (scheduleVersion === 3 && (!Array.isArray(taskIds) || !taskIds.length)) throw new HttpsError('invalid-argument', 'Select at least one contract task.');
  if (scheduleVersion === 3 && !schedule.some((day) => Array.isArray(day.tasks) && day.tasks.length)) throw new HttpsError('invalid-argument', 'Selected tasks must be scheduled.');
  const u = await getUser(uid);
  if (!u.stripeCustomerId) throw new HttpsError('failed-precondition', 'Add a card before signing.');
  const stripe = stripeClient();
  // make this card the default for future off-session (automatic) charges
  try { await stripe.customers.update(u.stripeCustomerId, { invoice_settings: { default_payment_method: paymentMethodId } }); }
  catch (e) { surface(e, 'Save contract'); }
  const contract = {
    amount: Math.round(amount), charity: charity || '', name: name || '',
    schedule, cycle: cycle === 'biweekly' ? 'biweekly' : 'weekly', scheduleVersion: [2, 3].includes(scheduleVersion) ? scheduleVersion : 1,
    taskIds: scheduleVersion === 3 ? [...new Set(taskIds.map(String))] : [],
    signedAt: new Date().toISOString(), forfeitedCharged: 0, active: true,
  };
  await db.doc(`users/${uid}`).set({ name: name || '', contract, exempt: [], skipsUsed: 0 }, { merge: true });
  return { ok: true };
});

/* ---- 2b. Clear the user's contract + history (used by Reset all data) ---- */
exports.clearContract = onCall({ invoker: 'public' }, async (req) => {
  const uid = requireUid(req);
  await db.doc(`users/${uid}`).set(
    { contract: admin.firestore.FieldValue.delete(), exempt: [], skipsUsed: 0, streakFreezes: 0, coinGrantTotal: 0, redeemedCodes: [] },
    { merge: true }
  );
  const logs = await db.collection(`users/${uid}/log`).get();
  if (!logs.empty) { const batch = db.batch(); logs.forEach((d) => batch.delete(d.ref)); await batch.commit(); }
  return { ok: true };
});

/* ---- 3. Log a completed workout ---- */
exports.logWorkout = onCall(async (req) => {
  const uid = requireUid(req);
  const { dateKey, reps, items } = req.data || {};
  if (!/^\d{4}-\d\d-\d\d$/.test(dateKey || '')) throw new HttpsError('invalid-argument', 'Bad date key.');
  await db.doc(`users/${uid}/log/${dateKey}`).set({
    completed: true, reps: reps || 0, items: items || [], at: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { ok: true };
});

/* ---- 4. Spend a skip token (1 earned every 2 weeks since signing) ---- */
exports.useSkipToken = onCall(async (req) => {
  const uid = requireUid(req);
  const { dateKey } = req.data || {};
  if (!/^\d{4}-\d\d-\d\d$/.test(dateKey || '')) throw new HttpsError('invalid-argument', 'Bad date key.');
  const u = await getUser(uid);
  const c = u.contract; if (!c || !c.active) throw new HttpsError('failed-precondition', 'No active contract.');
  const days = Math.floor((Date.now() - new Date(c.signedAt).getTime()) / 86400000);
  const earned = Math.max(0, Math.floor(days / 14));
  const used = u.skipsUsed || 0;
  if (earned - used <= 0) throw new HttpsError('failed-precondition', 'No skip tokens available.');
  const exempt = new Set(u.exempt || []); exempt.add(dateKey);
  await db.doc(`users/${uid}`).set({ exempt: [...exempt], skipsUsed: used + 1 }, { merge: true });
  return { ok: true };
});

/* ---- 3b. Buy and activate shop Streak Freezes ---- */
exports.purchaseStreakFreeze = onCall({ invoker: 'public' }, async (req) => {
  const uid = requireUid(req);
  const ref = db.doc(`users/${uid}`);
  const count = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref); const current = Number(snap.data()?.streakFreezes || 0);
    tx.set(ref, { streakFreezes: current + 1 }, { merge: true }); return current + 1;
  });
  return { ok: true, streakFreezes: count };
});

function contractDayHasTasks(contract, d) {
  if (!contract || !contract.active || !Array.isArray(contract.schedule)) return false;
  if (![2, 3].includes(contract.scheduleVersion)) {
    const day = contract.schedule[d.getDay()];
    return !!day && !day.rest;
  }
  const mondayDay = (d.getDay() + 6) % 7;
  if (contract.cycle !== 'biweekly' || contract.schedule.length !== 14) {
    const day = contract.schedule[mondayDay]; return !!day && !day.rest;
  }
  const anchor = Date.UTC(2025, 0, 6), current = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const weeks = Math.floor((current - anchor) / 604800000), cycleWeek = ((weeks % 2) + 2) % 2;
  const day = contract.schedule[cycleWeek * 7 + mondayDay]; return !!day && !day.rest;
}

exports.useStreakFreeze = onCall({ invoker: 'public' }, async (req) => {
  const uid = requireUid(req), dateKey = req.data?.dateKey;
  if (!/^\d{4}-\d\d-\d\d$/.test(dateKey || '')) throw new HttpsError('invalid-argument', 'Bad date key.');
  const date = new Date(`${dateKey}T12:00:00Z`), now = new Date(), today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
  if (Math.abs(date - today) > 86400000) throw new HttpsError('invalid-argument', 'A Streak Freeze can only be activated for the current day.');
  const ref = db.doc(`users/${uid}`);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref), user = snap.data() || {}, count = Number(user.streakFreezes || 0);
    if (count < 1) throw new HttpsError('failed-precondition', 'No Streak Freezes are available.');
    if (user.contract?.active && !contractDayHasTasks(user.contract, date)) throw new HttpsError('failed-precondition', 'No contracted tasks are scheduled for this day.');
    const exempt = new Set(user.exempt || []);
    if (exempt.has(dateKey)) throw new HttpsError('already-exists', 'This day is already protected.');
    exempt.add(dateKey); tx.set(ref, { streakFreezes: count - 1, exempt: [...exempt] }, { merge: true });
    return { streakFreezes: count - 1 };
  });
  return { ok: true, dateKey, ...result };
});

/* ---- 3c. Secure code redemption + account-scoped admin tools ---- */
const PUBLIC_REDEEM_CODES = { WELCOME100: { coins: 100, message: 'Welcome reward redeemed.' } };
const normalizeCode = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '');
function sameSecret(a, b) {
  const left = Buffer.from(String(a)), right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

exports.redeemCode = onCall({ invoker: 'public', secrets: [ADMIN_REDEEM_CODE] }, async (req) => {
  const uid = requireUid(req), code = normalizeCode(req.data?.code);
  if (!code || code.length > 80) throw new HttpsError('invalid-argument', 'Enter a valid code.');
  const adminCode = normalizeCode(ADMIN_REDEEM_CODE.value());
  if (adminCode && sameSecret(code, adminCode)) {
    await db.doc(`users/${uid}`).set({ adminMode: true }, { merge: true });
    return { ok: true, adminMode: true, message: 'Admin mode enabled.' };
  }
  const reward = PUBLIC_REDEEM_CODES[code];
  if (!reward) throw new HttpsError('not-found', 'That code is not valid.');
  const ref = db.doc(`users/${uid}`);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref), user = snap.data() || {}, redeemed = new Set(user.redeemedCodes || []);
    if (redeemed.has(code)) throw new HttpsError('already-exists', 'That code has already been redeemed.');
    redeemed.add(code); const coinGrantTotal = Number(user.coinGrantTotal || 0) + reward.coins;
    tx.set(ref, { redeemedCodes: [...redeemed], coinGrantTotal }, { merge: true });
    return { coinGrantTotal };
  });
  return { ok: true, adminMode: false, coins: reward.coins, message: reward.message, ...result };
});

exports.adminAddCoins = onCall({ invoker: 'public' }, async (req) => {
  const uid = requireUid(req), amount = Math.floor(Number(req.data?.amount));
  if (!(amount >= 1 && amount <= 1000000)) throw new HttpsError('invalid-argument', 'Enter between 1 and 1,000,000 coins.');
  const ref = db.doc(`users/${uid}`);
  const coinGrantTotal = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref), user = snap.data() || {};
    if (user.adminMode !== true) throw new HttpsError('permission-denied', 'Admin mode is not enabled for this account.');
    const total = Number(user.coinGrantTotal || 0) + amount;
    tx.set(ref, { coinGrantTotal: total }, { merge: true }); return total;
  });
  return { ok: true, amount, coinGrantTotal };
});

/* ---- forfeit math (mirrors the app's rules) ---- */
function computeForfeited(contract, logSet, exemptSet) {
  const invested = contract.amount;
  let balance = invested, forfeited = 0;
  const start = new Date(contract.signedAt); start.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isRest = (d) => {
    if (![2, 3].includes(contract.scheduleVersion)) return contract.schedule[d.getDay()] && contract.schedule[d.getDay()].rest;
    const mondayDay = (d.getDay() + 6) % 7;
    if (contract.cycle !== 'biweekly' || contract.schedule.length !== 14) return !contract.schedule[mondayDay] || contract.schedule[mondayDay].rest;
    const anchor = Date.UTC(2025, 0, 6);
    const current = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const weeks = Math.floor((current - anchor) / 604800000);
    const cycleWeek = ((weeks % 2) + 2) % 2;
    const item = contract.schedule[cycleWeek * 7 + mondayDay];
    return !item || item.rest;
  };
  // Version 3: each missed contracted day forfeits 1/4 of the original investment.
  if (contract.scheduleVersion === 3) {
    for (let d = new Date(start); d < today && balance > 0; d.setDate(d.getDate() + 1)) {
      if (isRest(d) || exemptSet.has(dayKey(d)) || logSet.has(dayKey(d))) continue;
      const loss = Math.min(invested / 4, balance);
      forfeited += loss; balance -= loss;
    }
    return { forfeited: Math.round(forfeited * 100) / 100, balance: Math.round(balance * 100) / 100 };
  }
  // Legacy contracts: >2 missed non-rest days in a signing-anchored month forfeits 1/4.
  let k = 0;
  while (addMonths(start, k + 1) <= today) {
    const cs = addMonths(start, k), ce = addMonths(start, k + 1); let missed = 0;
    for (let d = new Date(cs); d < ce; d.setDate(d.getDate() + 1)) {
      if (isRest(d) || exemptSet.has(dayKey(d))) continue;
      if (!logSet.has(dayKey(d))) missed++;
    }
    if (missed > 2 && balance > 0) { const l = Math.min(invested / 4, balance); forfeited += l; balance -= l; }
    k++;
  }
  return { forfeited: Math.round(forfeited * 100) / 100, balance: Math.round(balance * 100) / 100 };
}

async function assessUser(uid) {
  const u = await getUser(uid);
  const c = u.contract; if (!c || !c.active) return { charged: 0 };
  const logSnap = await db.collection(`users/${uid}/log`).get();
  const logSet = new Set(); logSnap.forEach((doc) => { if (doc.data().completed) logSet.add(doc.id); });
  const exemptSet = new Set(u.exempt || []);
  const { forfeited } = computeForfeited(c, logSet, exemptSet);
  const already = c.forfeitedCharged || 0;
  const dueCents = Math.round((forfeited - already) * 100);
  if (dueCents < 50) return { charged: 0 };                 // below Stripe's ~$0.50 minimum
  const stripe = stripeClient();
  const pi = await stripe.paymentIntents.create({
    amount: dueCents, currency: 'usd', customer: u.stripeCustomerId,
    off_session: true, confirm: true,
    description: `WorkoutMoney forfeit${c.charity ? ` → ${c.charity}` : ''}`,
  });
  await db.doc(`users/${uid}`).set({ contract: { ...c, forfeitedCharged: already + dueCents / 100 } }, { merge: true });
  await db.collection(`users/${uid}/charges`).add({
    amount: dueCents / 100, currency: 'usd', stripeId: pi.id, status: pi.status,
    charity: c.charity || '', at: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { charged: dueCents / 100, stripeId: pi.id };
}

/* ---- 5. Manual assess (handy for testing) ---- */
exports.assessMe = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const uid = requireUid(req);
  return await assessUser(uid);
});

/* ---- 5b. Small test charge to the saved card (validate live payments safely) ---- */
exports.chargeTest = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const uid = requireUid(req);
  let cents = Math.round(((req.data && req.data.amount) || 1) * 100);
  if (!(cents >= 50)) cents = 100;                    // Stripe minimum is ~$0.50; default $1
  if (cents > 500) throw new HttpsError('invalid-argument', 'Test charge is capped at $5.');
  const u = await getUser(uid);
  if (!u.stripeCustomerId) throw new HttpsError('failed-precondition', 'No customer on file.');
  const stripe = stripeClient();
  const cust = await stripe.customers.retrieve(u.stripeCustomerId);
  const pm = cust.invoice_settings && cust.invoice_settings.default_payment_method;
  if (!pm) throw new HttpsError('failed-precondition', 'No saved card. Sign a contract (which saves your card) first.');
  const pi = await stripe.paymentIntents.create({
    amount: cents, currency: 'usd', customer: u.stripeCustomerId, payment_method: pm,
    off_session: true, confirm: true, description: 'WorkoutMoney test charge',
  });
  await db.collection(`users/${uid}/charges`).add({
    amount: cents / 100, currency: 'usd', stripeId: pi.id, status: pi.status, test: true,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { charged: cents / 100, stripeId: pi.id, status: pi.status };
});

/* ---- Scheduled: charge everyone's newly-owed forfeits once a day ---- */
exports.assessForfeits = onSchedule({ schedule: 'every day 06:00', timeZone: 'Etc/UTC', secrets: [STRIPE_SECRET_KEY] }, async () => {
  const users = await db.collection('users').get();
  for (const doc of users.docs) {
    try { await assessUser(doc.id); }
    catch (e) { console.error('assess failed for', doc.id, e.message); }
  }
});
