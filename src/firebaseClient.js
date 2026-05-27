import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

function getMissingKeys() {
  return requiredKeys.filter((key) => !firebaseConfig[key]);
}

export function assertFirebaseConfigured() {
  const missing = getMissingKeys();
  if (missing.length > 0) {
    throw new Error(
      `Firebase env vars missing: ${missing.join(', ')}. Add VITE_FIREBASE_* values in .env.`
    );
  }
}

export function getFirestoreDb() {
  assertFirebaseConfigured();
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}
