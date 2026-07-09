/* Public config for the WorkoutMoney payment client.
   Every value here is safe to be public (Firebase web config + Stripe
   PUBLISHABLE key). The Stripe SECRET key is NOT here — it lives only in the
   Cloud Function (set via `firebase functions:secrets:set STRIPE_SECRET_KEY`). */
window.WM_CONFIG = {
  firebase: {
    apiKey: "AIzaSyA5IkrXi9Sh7XiKQpwBpEN_2SMAwHfg6Tk",
    authDomain: "workoutmoney.firebaseapp.com",
    projectId: "workoutmoney",
    storageBucket: "workoutmoney.firebasestorage.app",
    messagingSenderId: "224344577354",
    appId: "1:224344577354:web:06da4371172c9fdb8c5db3"
  },
  stripePublishableKey: "pk_test_51Tr20FJlUoW67NV0kvZVjjDeYvJnlLnVBagQcA12JI4IyGpTyn6qxfFBagywaAPKXJIpBpLPrc28RDAKKZjVsO9b00qoQt2Zls",
  functionsRegion: "us-central1"
};
