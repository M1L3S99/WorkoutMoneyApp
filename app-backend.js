/* Optional backend bridge for the main app.
   Loads Firebase Auth + Callable Functions + Stripe.js and exposes them as
   window.WMB. If the config or CDNs aren't available (e.g. the artifact preview,
   or before setup), it stays disabled and the app runs local-only. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { getFunctions, httpsCallable }
  from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-functions.js';
import { getFirestore, doc, getDoc, collection, getDocs }
  from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

const cfg = window.WM_CONFIG;
const ok = cfg && cfg.firebase && cfg.firebase.apiKey && cfg.firebase.apiKey.indexOf('PASTE') !== 0 && window.Stripe;
if (!ok) {
  console.warn('WorkoutMoney: backend not configured — running local-only.');
} else {
  const app = initializeApp(cfg.firebase);
  const auth = getAuth(app);
  const fdb = getFirestore(app);
  const fns = getFunctions(app, cfg.functionsRegion || 'us-central1');
  const stripe = Stripe(cfg.stripePublishableKey);
  const call = (n, d) => httpsCallable(fns, n)(d).then((r) => r.data);
  let elements = null, cardEl = null, lastPM = null;

  window.WMB = {
    enabled: true, ready: false, user: null,
    signUp: (e, p) => createUserWithEmailAndPassword(auth, e, p),
    signIn: (e, p) => signInWithEmailAndPassword(auth, e, p),
    signOut: () => signOut(auth),
    mountCard(sel) {
      elements = stripe.elements();
      cardEl = elements.create('card', { style: { base: { color: '#e2e2e3', fontFamily: 'Inter, sans-serif', fontSize: '16px', '::placeholder': { color: '#8a9386' } } } });
      cardEl.mount(sel); lastPM = null; return cardEl;
    },
    hasCard: () => !!lastPM,
    async addCard() {
      const { clientSecret } = await call('createSetupIntent', {});
      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, { payment_method: { card: cardEl } });
      if (error) throw new Error(error.message);
      lastPM = setupIntent.payment_method; return lastPM;
    },
    saveContract: (d) => call('saveContract', { ...d, paymentMethodId: lastPM }),
    async loadState() {
      const uid = auth.currentUser && auth.currentUser.uid; if (!uid) return null;
      const snap = await getDoc(doc(fdb, 'users', uid));
      const u = snap.exists() ? snap.data() : {};
      const log = {};
      const logSnap = await getDocs(collection(fdb, 'users', uid, 'log'));
      logSnap.forEach((d) => { log[d.id] = d.data(); });
      return { contract: u.contract || null, exempt: u.exempt || [], skipsUsed: u.skipsUsed || 0, name: u.name || '', log };
    },
    logWorkout: (d) => call('logWorkout', d),
    useSkipToken: (k) => call('useSkipToken', { dateKey: k }),
    assessMe: () => call('assessMe', {}),
    chargeTest: (amount) => call('chargeTest', { amount }),
    clearContract: () => call('clearContract', {}),
  };
  onAuthStateChanged(auth, (u) => {
    window.WMB.user = u; window.WMB.ready = true;
    document.dispatchEvent(new CustomEvent('wmb', { detail: { user: u } }));
  });
}
