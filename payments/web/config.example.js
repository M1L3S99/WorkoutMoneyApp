/* Copy this file to `config.js` and fill in your values.
   These are all SAFE to be public (they ship in the browser) — they are NOT
   secrets. Your Stripe SECRET key never goes here; it lives only in the
   Cloud Function (see payments/SETUP.md). */
window.WM_CONFIG = {
  firebase: {
    apiKey: "PASTE_FIREBASE_apiKey",
    authDomain: "PASTE_projectId.firebaseapp.com",
    projectId: "PASTE_projectId",
    appId: "PASTE_appId"
  },
  stripePublishableKey: "pk_test_PASTE_YOUR_PUBLISHABLE_KEY",
  functionsRegion: "us-central1"
};
