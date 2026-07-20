import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Test-phone OTPs (set in Firebase console under Authentication → Phone →
// "Phone numbers for testing") only deliver when reCAPTCHA validation is off.
// Toggle is local-dev only — never set the env var in prod.
if (import.meta.env.VITE_DISABLE_PHONE_APP_VERIFICATION_FOR_TESTING === "true") {
  auth.settings.appVerificationDisabledForTesting = true;
}
