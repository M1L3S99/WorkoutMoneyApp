/* WorkoutMoney payments client (ES module).
   Wires Firebase Auth + Callable Functions + Stripe.js. Import this from a page
   that has already: (1) loaded config.js (sets window.WM_CONFIG), and
   (2) loaded Stripe.js via <script src="https://js.stripe.com/v3"></script>.

   Usage sketch:
     import * as pay from './payments.js';
     await pay.init();
     await pay.signInEmail(email, pw);         // or pay.signInAnon() for testing
     const card = pay.mountCard('#card');      // Stripe card field into an element
     await pay.addCard();                      // confirms the SetupIntent -> saves card
     await pay.saveContract({amount, charity, name, schedule});
     await pay.logWorkout({dateKey, reps, items});
     await pay.assessMe();                     // recompute + charge any owed forfeit
*/
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { getFunctions, httpsCallable }
  from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-functions.js';

let app, auth, fns, stripe, elements, cardEl, lastPaymentMethodId = null;

export async function init() {
  const cfg = window.WM_CONFIG;
  if (!cfg) throw new Error('Missing config.js (window.WM_CONFIG).');
  app = initializeApp(cfg.firebase);
  auth = getAuth(app);
  fns = getFunctions(app, cfg.functionsRegion || 'us-central1');
  stripe = Stripe(cfg.stripePublishableKey);
  elements = stripe.elements();
  return new Promise((res) => onAuthStateChanged(auth, (u) => res(u)));
}

export const signInAnon = () => signInAnonymously(auth);
export const signInEmail = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
export const registerEmail = (email, pw) => createUserWithEmailAndPassword(auth, email, pw);
export const currentUser = () => auth && auth.currentUser;

const call = (name, data) => httpsCallable(fns, name)(data).then((r) => r.data);

export function mountCard(selector) {
  cardEl = elements.create('card', { style: { base: { color: '#e2e2e3', fontSize: '16px', '::placeholder': { color: '#8a9386' } } } });
  cardEl.mount(selector);
  return cardEl;
}

// Create a SetupIntent on the server, then confirm it in the browser to save the card.
export async function addCard() {
  const { clientSecret } = await call('createSetupIntent', {});
  const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, { payment_method: { card: cardEl } });
  if (error) throw error;
  lastPaymentMethodId = setupIntent.payment_method;
  return lastPaymentMethodId;
}

export const saveContract = ({ amount, charity, name, schedule }) =>
  call('saveContract', { amount, charity, name, schedule, paymentMethodId: lastPaymentMethodId });

export const logWorkout = ({ dateKey, reps, items }) => call('logWorkout', { dateKey, reps, items });
export const useSkipToken = (dateKey) => call('useSkipToken', { dateKey });
export const assessMe = () => call('assessMe', {});
