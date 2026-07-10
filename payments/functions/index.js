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

admin.initializeApp();
const db = admin.firestore();
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
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
  const { amount, charity, name, paymentMethodId, schedule } = req.data || {};
  if (!(amount > 0)) throw new HttpsError('invalid-argument', 'A stake amount is required.');
  if (!paymentMethodId) throw new HttpsError('invalid-argument', 'A saved card is required.');
  if (!Array.isArray(schedule) || schedule.length !== 7) throw new HttpsError('invalid-argument', 'A 7-day schedule is required.');
  const u = await getUser(uid);
  if (!u.stripeCustomerId) throw new HttpsError('failed-precondition', 'Add a card before signing.');
  const stripe = stripeClient();
  // make this card the default for future off-session (automatic) charges
  try { await stripe.customers.update(u.stripeCustomerId, { invoice_settings: { default_payment_method: paymentMethodId } }); }
  catch (e) { surface(e, 'Save contract'); }
  const contract = {
    amount: Math.round(amount), charity: charity || '', name: name || '',
    schedule, signedAt: new Date().toISOString(), forfeitedCharged: 0, active: true,
  };
  await db.doc(`users/${uid}`).set({ name: name || '', contract, exempt: [], skipsUsed: 0 }, { merge: true });
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

/* ---- forfeit math (mirrors the app's rules) ---- */
function computeForfeited(contract, logSet, exemptSet) {
  const invested = contract.amount;
  let balance = invested, forfeited = 0;
  const start = new Date(contract.signedAt); start.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isRest = (d) => contract.schedule[d.getDay()] && contract.schedule[d.getDay()].rest;
  // penalty: >2 missed non-rest days in a signing-anchored month -> forfeit 1/4
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
