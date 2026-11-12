import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebSocketContext from '@/utils/WebSocketContext';
import { useAuth } from '@/auth/AuthContext';
import { CLASS_IDS, CLASS_INFO } from '@/utils/ClassInfo';
import { parseMessage, sendMessage } from '../common/types';
import { useI18n } from '@/i18n';
import { SettingsButton } from '../common/SettingsButton';
import { SignInForm } from './SignInForm';
import { ProfileForm } from './ProfileForm';
import loginBackground from '../assets/login-background.png';
import './Login.css';

const WHEREABOUTS_TIMEOUT_MS = 3000;

/**
 * The entry screen. Signing in (Firebase) and picking a name happen here; once the account is
 * ready the game socket connects and signs in, and the player is sent back to wherever they still
 * are (a running match, a seated table) or to the tavern.
 */
function Login() {
    const socket = useContext(WebSocketContext);
    const { status, retry, signOut } = useAuth();
    const navigate = useNavigate();
    const { t } = useI18n();

    useEffect(() => {
        const ws = socket;
        if (!ws) return;
        let fallback: number | undefined;
        const handleMessage = (event: MessageEvent) => {
            const data = parseMessage(event);
            if (data?.type === 'auth' && (data.subtype === 'login_success' || data.subtype === 'resume_success')) {
                sendMessage(ws, { type: 'lobby', subtype: 'whereabouts' });
                fallback = window.setTimeout(() => navigate('/games'), WHEREABOUTS_TIMEOUT_MS);
            } else if (data?.type === 'lobby' && data.subtype === 'whereabouts') {
                window.clearTimeout(fallback);
                const where = data.payload as { matchId?: number; lobbyId?: number } | undefined;
                if (where?.matchId != null) navigate(`/match/${where.matchId}`);
                else if (where?.lobbyId != null) navigate(`/lobby/${where.lobbyId}`);
                else navigate('/games');
            }
        };
        ws.addEventListener('message', handleMessage);
        return () => {
            window.clearTimeout(fallback);
            ws.removeEventListener('message', handleMessage);
        };
    }, [socket, navigate]);

    return (
        <div className="hts-screen login-screen">
            <img src={loginBackground} alt="" className="hts-screen-bg login-bg" />
            <div className="login-scrim" aria-hidden="true" />

            <div className="login-sound"><SettingsButton /></div>

            <main className="login-main hts-rise">
                <div>
                    <div className="login-kicker">{t.login.kicker}</div>
                    <h1 className="hts-display login-logo">SLAY</h1>
                    <p className="login-tagline">{t.login.tagline}</p>
                </div>

                {status === 'signedOut' && <SignInForm />}
                {status === 'needsProfile' && <ProfileForm />}
                {(status === 'loading' || status === 'ready') && (
                    <div className="login-form hts-panel" role="status">
                        <p className="login-hint">{status === 'ready' ? t.login.entering : t.login.loading}</p>
                    </div>
                )}
                {status === 'error' && (
                    <div className="login-form hts-panel">
                        <p className="login-error" role="alert">{t.login.apiError}</p>
                        <button type="button" className="hts-btn" onClick={retry}>{t.login.retry}</button>
                        <button type="button" className="login-link login-signout" onClick={() => void signOut()}>{t.login.signOut}</button>
                    </div>
                )}
            </main>

            <div className="login-fan" aria-hidden="true">
                {CLASS_IDS.map((id, i) => (
                    <img
                        key={id}
                        src={CLASS_INFO[id].leaderArt}
                        alt=""
                        className="login-fan-card"
                        style={{ left: i * 114, bottom: [40, 70, 88, 88, 70, 40][i], transform: `rotate(${(i - 2.5) * 6.4}deg)` }}
                    />
                ))}
            </div>

            <footer className="login-footer">{t.login.footer}</footer>
        </div>
    );
}

export default Login;
