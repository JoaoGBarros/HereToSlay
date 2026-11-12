import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n';
import { authErrorMessage } from './authErrors';

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

/** Shown once, after the first sign-in: picks the name other players see. */
export function ProfileForm() {
    const { createProfile, signOut } = useAuth();
    const { t } = useI18n();
    const [username, setUsername] = useState('');
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const name = username.trim();
    const isValid = USERNAME_PATTERN.test(name);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!isValid) {
            setError(t.login.errors.invalidName);
            return;
        }
        setIsBusy(true);
        setError(null);
        try {
            await createProfile(name);
        } catch (err: unknown) {
            setError(authErrorMessage(err, t.login.errors));
        } finally {
            setIsBusy(false);
        }
    }

    return (
        <form className="login-form hts-panel" onSubmit={handleSubmit}>
            <h2 className="login-form-title">{t.login.pickNameTitle}</h2>
            <p className="login-hint">{t.login.pickNameHint}</p>
            <label htmlFor="hero-name" className="hts-label">{t.login.nameLabel}</label>
            <input
                id="hero-name"
                className="hts-input"
                type="text"
                autoComplete="nickname"
                maxLength={20}
                placeholder={t.login.namePlaceholder}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="submit" className="hts-btn login-cta" disabled={isBusy || !name}>
                {isBusy ? t.login.working : t.login.createProfile}
            </button>
            <button type="button" className="login-link login-signout" onClick={() => void signOut()}>
                {t.login.signOut}
            </button>
        </form>
    );
}
