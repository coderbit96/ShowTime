import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getApps, initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "missing-api-key",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "missing-auth-domain",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "missing-project-id",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "missing-storage-bucket",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    "missing-messaging-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "missing-app-id",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "missing-measurement-id",
};

export const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics() {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  analyticsPromise ??= isSupported().then((supported) => {
    if (!supported) {
      return null;
    }

    return getAnalytics(firebaseApp);
  });

  return analyticsPromise;
}
