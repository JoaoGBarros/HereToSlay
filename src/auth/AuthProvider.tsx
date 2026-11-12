import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    browserLocalPersistence,
    browserSessionPersistence,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    onAuthStateChanged,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    type User,
} from 'firebase/auth';
import { AccountsApiError, createProfile as createProfileRequest, recordLogin } from '@/api/accountsClient';
import { auth } from './firebase';
import { currentPlatform } from './platform';
import { AuthContext, type AuthContextValue, type AuthState } from './AuthContext';

const SIGNED_OUT: AuthState = { status: 'signedOut', user: null, profile: null };
const USERNAME_CLAIM = 'username';

/** Saved session ("remember me") survives closing the app; otherwise it ends with it. */
function persistenceFor(remember: boolean) {
    return remember ? browserLocalPersistence : browserSessionPersistence;
}

/**
 * The game server reads the username from the token's custom claim. Right after the profile is
 * created (or repaired) the cached token does not have it yet, so a new one is fetched.
 */
async function ensureUsernameClaim(user: User, username: string): Promise<void> {
    const { claims } = await user.getIdTokenResult();
    if (claims[USERNAME_CLAIM] !== username) await user.getIdToken(true);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({ status: 'loading', user: null, profile: null });

    // Ignores answers that arrive after the player signed out or switched accounts.
    const setIfCurrent = useCallback((user: User, next: AuthState) => {
        if (auth.currentUser?.uid === user.uid) setState(next);
    }, []);

    const loadProfile = useCallback(async (user: User) => {
        setState({ status: 'loading', user, profile: null });
        try {
            const profile = await recordLogin(() => user.getIdToken(), currentPlatform());
            await ensureUsernameClaim(user, profile.username);
            setIfCurrent(user, { status: 'ready', user, profile });
        } catch (error: unknown) {
            const noProfile = error instanceof AccountsApiError && error.status === 404;
            setIfCurrent(user, { status: noProfile ? 'needsProfile' : 'error', user, profile: null });
        }
    }, [setIfCurrent]);

    useEffect(() => onAuthStateChanged(auth, (user) => {
        if (!user) {
            localStorage.removeItem('currentPlayer');
            setState(SIGNED_OUT);
            return;
        }
        void loadProfile(user);
    }), [loadProfile]);

    const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
        await setPersistence(auth, persistenceFor(remember));
        await signInWithEmailAndPassword(auth, email, password);
    }, []);

    const signUp = useCallback(async (email: string, password: string, remember: boolean) => {
        await setPersistence(auth, persistenceFor(remember));
        await createUserWithEmailAndPassword(auth, email, password);
    }, []);

    const signInWithGoogle = useCallback(async (remember: boolean) => {
        await setPersistence(auth, persistenceFor(remember));
        await signInWithPopup(auth, new GoogleAuthProvider());
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    }, []);

    const createProfile = useCallback(async (username: string) => {
        const user = auth.currentUser;
        if (!user) throw new Error('Not signed in');
        const profile = await createProfileRequest(() => user.getIdToken(), username, currentPlatform());
        await ensureUsernameClaim(user, profile.username);
        setIfCurrent(user, { status: 'ready', user, profile });
    }, [setIfCurrent]);

    const retry = useCallback(() => {
        if (auth.currentUser) void loadProfile(auth.currentUser);
    }, [loadProfile]);

    const signOut = useCallback(async () => {
        localStorage.removeItem('currentPlayer');
        await firebaseSignOut(auth);
    }, []);

    const getIdToken = useCallback(async () => auth.currentUser?.getIdToken() ?? null, []);

    const value = useMemo<AuthContextValue>(() => ({
        ...state, signIn, signUp, signInWithGoogle, resetPassword, createProfile, retry, signOut, getIdToken,
    }), [state, signIn, signUp, signInWithGoogle, resetPassword, createProfile, retry, signOut, getIdToken]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
