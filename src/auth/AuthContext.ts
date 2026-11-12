import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { PlayerProfile } from '@/api/accountsClient';

/**
 * - loading: restoring a saved session or loading the profile
 * - signedOut: no Firebase session
 * - needsProfile: signed in with Firebase, but no username picked yet
 * - ready: signed in with a profile; the game socket may connect
 * - error: signed in, but the accounts API could not be reached
 */
export type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready' | 'error';

export interface AuthState {
    status: AuthStatus;
    user: User | null;
    profile: PlayerProfile | null;
}

export interface AuthActions {
    signIn: (email: string, password: string, remember: boolean) => Promise<void>;
    signUp: (email: string, password: string, remember: boolean) => Promise<void>;
    signInWithGoogle: (remember: boolean) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    createProfile: (username: string) => Promise<void>;
    retry: () => void;
    signOut: () => Promise<void>;
    /** A fresh Firebase ID token for the game socket, or null when signed out. */
    getIdToken: () => Promise<string | null>;
}

export type AuthContextValue = AuthState & AuthActions;

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const value = useContext(AuthContext);
    if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
    return value;
}
