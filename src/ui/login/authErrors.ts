import { FirebaseError } from 'firebase/app';
import { AccountsApiError } from '@/api/accountsClient';
import type { Dict } from '@/i18n/pt';

type AuthErrors = Dict['login']['errors'];

const FIREBASE_CODES: Record<string, keyof AuthErrors> = {
    'auth/invalid-credential': 'invalidCredentials',
    'auth/wrong-password': 'invalidCredentials',
    'auth/user-not-found': 'invalidCredentials',
    'auth/email-already-in-use': 'emailInUse',
    'auth/weak-password': 'weakPassword',
    'auth/invalid-email': 'invalidEmail',
    'auth/missing-email': 'invalidEmail',
    'auth/too-many-requests': 'tooManyRequests',
    'auth/network-request-failed': 'network',
    'auth/popup-closed-by-user': 'popupClosed',
    'auth/cancelled-popup-request': 'popupClosed',
    'auth/invalid-api-key': 'notConfigured',
    'auth/configuration-not-found': 'notConfigured',
};

/** A message the player can act on, never the raw error text. */
export function authErrorMessage(error: unknown, errors: AuthErrors): string {
    if (error instanceof FirebaseError) {
        const key = FIREBASE_CODES[error.code];
        return key ? errors[key] : errors.generic;
    }
    if (error instanceof AccountsApiError) {
        if (error.status === 0) return errors.network;
        if (error.status === 409) return errors.nameTaken;
        if (error.status === 400) return errors.invalidName;
    }
    return errors.generic;
}
