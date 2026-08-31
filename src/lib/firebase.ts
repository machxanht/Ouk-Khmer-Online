import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import appletConfig from "../../firebase-applet-config.json";

/**
 * Firebase Client Configuration
 * Prioritizes provisioned applet configuration from firebase-applet-config.json,
 * then falls back to environment variables prefixed with VITE_FIREBASE_*.
 */
const firebaseConfig = {
  apiKey: appletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain:
    appletConfig.authDomain ||
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    `${appletConfig.projectId || "project-by-khang"}.firebaseapp.com`,
  projectId:
    appletConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || "project-by-khang",
  storageBucket:
    appletConfig.storageBucket ||
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    `${appletConfig.projectId || "project-by-khang"}.firebasestorage.app`,
  messagingSenderId:
    appletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: appletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || "",
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const db: Firestore = appletConfig.firestoreDatabaseId
  ? getFirestore(app, appletConfig.firestoreDatabaseId)
  : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

export default app;
