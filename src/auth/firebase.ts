import { initializeApp } from 'firebase/app';
import {
    browserLocalPersistence,
    browserPopupRedirectResolver,
    browserSessionPersistence,
    initializeAuth,
} from 'firebase/auth';

// These values identify the Firebase project to the client and are public by design; the project
// is protected by its list of authorized domains, not by keeping them secret.
const env = import.meta.env;

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Firebase refuses to start without an API key, which would blank the whole app; an unconfigured
// build starts with a placeholder and the sign-in screen says sign-in is not configured.
const app = initializeApp(isFirebaseConfigured ? firebaseConfig : { ...firebaseConfig, apiKey: 'not-configured' });

// Firebase keeps only its own refresh token, never the password. "Remember me" picks where that
// token lives: local storage survives closing the app, session storage is gone when it closes.
// Both are listed so a session saved either way is picked up on start.
export const auth = initializeAuth(app, {
    persistence: [browserLocalPersistence, browserSessionPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
});
