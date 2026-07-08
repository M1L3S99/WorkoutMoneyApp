# WorkoutMoney — real payments setup (Firebase + Stripe)

This turns the prototype into a real system where the contract/log live
server-side and cards are actually charged on forfeit. Follow the numbered
steps. **You only paste public values into files; the Stripe secret key stays
inside Firebase and is never in the app.**

Time: ~45–60 min the first time. Cost: ~$0 at low volume (Firebase Blaze is
pay-as-you-go; Stripe takes ~2.9% + 30¢ per real charge).

---

## 1. Create a Stripe account
1. Sign up at https://stripe.com and stay in **Test mode** (toggle, top right).
2. Developers → **API keys**. Copy the **Publishable key** (`pk_test_…`) and the
   **Secret key** (`sk_test_…`). Keep the secret one private.

## 2. Create a Firebase project
1. https://console.firebase.google.com → **Add project**.
2. Build → **Authentication** → Get started → enable **Anonymous** (for testing)
   and **Email/Password** (for real users).
3. Build → **Firestore Database** → Create (Production mode, any region).
4. Upgrade the project to the **Blaze** plan (Settings → Usage and billing).
   Required so Functions can reach Stripe. It's pay-as-you-go and effectively
   free at small scale.
5. Project settings → **General** → "Your apps" → add a **Web app** → copy the
   **firebaseConfig** object (apiKey, authDomain, projectId, appId).

## 3. Install tools (one-time, on your computer)
```bash
# Node 20+ from https://nodejs.org, then:
npm install -g firebase-tools
firebase login
```

## 4. Point this folder at your project + install deps
```bash
cd payments
firebase use --add            # pick your project, alias it "default"
cd functions && npm install && cd ..
```

## 5. Give the function your Stripe SECRET key (never goes in the app)
```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
# paste your sk_test_... when prompted
```

## 6. Deploy the rules + functions
```bash
firebase deploy --only firestore:rules,functions
```

## 7. Fill in the public config for the browser
```bash
cd web
cp config.example.js config.js
# edit config.js: paste your firebaseConfig values + your pk_test_ publishable key
```

## 8. Test the whole pipeline
Serve the `web/` folder (any static server), e.g.:
```bash
npx serve .        # from payments/web, then open the printed URL + /pay-test.html
```
On **pay-test.html**, click 1→5. Use Stripe test card **4242 4242 4242 4242**,
any future expiry, any CVC/ZIP. Then check:
- Firebase Console → Firestore: a `users/{uid}` doc with your contract + a `log` entry.
- Stripe Dashboard → Payments: the forfeit charge from step 5 (only appears once
  a forfeit is actually owed).

---

## What's here
| File | What it is |
|------|------------|
| `functions/index.js` | The server: save card, sign contract, log workout, spend token, assess + charge forfeits (daily + on demand). |
| `firestore.rules` | Read-your-own-data only; **all writes go through functions** (tamper-proof). |
| `web/payments.js` | Reusable browser client (Firebase Auth + Stripe.js). |
| `web/pay-test.html` | Standalone page to verify everything before wiring it into the app. |
| `web/config.example.js` | Copy to `config.js` and fill in (public values only). |

## After it works
Tell me and I'll wire `payments.js` into the main app (`index.html`): sign-in,
the Stripe card field on the contract screen, and routing workout logs + the
forfeit assessment through the server instead of localStorage.

## Going live (later)
Switch Stripe to live keys, add a real Terms of Service + privacy policy, and
review the "charge on failure" model — Stripe requires clear disclosure and may
review the account. Holding/charging others' money can carry legal obligations;
get advice before taking real money.
