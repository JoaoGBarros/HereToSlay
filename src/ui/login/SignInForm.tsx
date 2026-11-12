import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { isFirebaseConfigured } from '@/auth/firebase';
import { isDesktopApp } from '@/auth/platform';
import { useI18n } from '@/i18n';
import { authErrorMessage } from './authErrors';

type Mode = 'signIn' | 'signUp';

const REMEMBER_KEY = 'hts.rememberMe';

function readRemember(): boolean {
    try {
        return localStorage.getItem(REMEMBER_KEY) === 'true';
    } catch {
        return false;
    }
}

/**
 * Email and password sign-in or sign-up. Google sign-in is offered on the web only: its popup
 * needs an authorized web origin, which the desktop app (loaded from disk) does not have.
 */
export function SignInForm() {
    const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
    const { t } = useI18n();
    const [mode, setMode] = useState<Mode>('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(readRemember);
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    async function run(action: () => Promise<void>) {
        setIsBusy(true);
        setError(null);
        setNotice(null);
        try {
            await action();
        } catch (e: unknown) {
            setError(authErrorMessage(e, t.login.errors));
        } finally {
            setIsBusy(false);
        }
    }

    function handleRememberChange(value: boolean) {
        setRemember(value);
        try {
            localStorage.setItem(REMEMBER_KEY, String(value));
        } catch {
            // Storage blocked; the choice still applies to this sign-in.
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const address = email.trim();
        void run(() => (mode === 'signIn' ? signIn(address, password, remember) : signUp(address, password, remember)));
    }

    function handleForgotPassword() {
        void run(async () => {
            await resetPassword(email.trim());
            setNotice(t.login.resetSent);
        });
    }

    const isSignIn = mode === 'signIn';
    const submitLabel = isBusy ? t.login.working : isSignIn ? t.login.signIn : t.login.signUp;

    if (!isFirebaseConfigured) {
        return <div className="login-form hts-panel"><p className="login-error" role="alert">{t.login.errors.notConfigured}</p></div>;
    }

    return (
        <form className="login-form hts-panel" onSubmit={handleSubmit} noValidate>
            <label htmlFor="login-email" className="hts-label">{t.login.email}</label>
            <input
                id="login-email"
                className="hts-input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="login-password" className="hts-label">{t.login.password}</label>
            <input
                id="login-password"
                className="hts-input"
                type="password"
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <div className="login-row">
                <label className="login-remember">
                    <input type="checkbox" checked={remember} onChange={(e) => handleRememberChange(e.target.checked)} />
                    {t.login.rememberMe}
                </label>
                {isSignIn && (
                    <button type="button" className="login-link" onClick={handleForgotPassword} disabled={isBusy || !email.trim()}>
                        {t.login.forgotPassword}
                    </button>
                )}
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}
            {notice && <p className="login-notice" role="status">{notice}</p>}

            <button type="submit" className="hts-btn login-cta" disabled={isBusy || !email.trim() || password.length < 6}>
                {submitLabel}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>

            {!isDesktopApp() && (
                <>
                    <div className="login-divider" aria-hidden="true"><span>{t.login.orDivider}</span></div>
                    <button type="button" className="hts-btn hts-btn--ghost" disabled={isBusy} onClick={() => void run(() => signInWithGoogle(remember))}>
                        {t.login.google}
                    </button>
                </>
            )}

            <p className="login-switch">
                {isSignIn ? t.login.noAccount : t.login.haveAccount}{' '}
                <button type="button" className="login-link" onClick={() => { setMode(isSignIn ? 'signUp' : 'signIn'); setError(null); setNotice(null); }}>
                    {isSignIn ? t.login.signUp : t.login.signIn}
                </button>
            </p>
        </form>
    );
}
