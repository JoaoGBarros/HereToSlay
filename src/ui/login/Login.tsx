import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WebSocketContext from '@/utils/WebSocketContext';
import { CLASS_IDS, CLASS_INFO } from '@/utils/ClassInfo';
import { parseMessage, sendMessage } from '../common/types';
import { useI18n } from '@/i18n';
import { SettingsButton } from '../common/SettingsButton';
import loginBackground from '../assets/login-background.png';
import './Login.css';

function Login() {
    const socket = useContext(WebSocketContext);
    const [username, setUsername] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const { t } = useI18n();

    useEffect(() => {
        const ws = socket;
        if (!ws) return;
        const handleMessage = (event: MessageEvent) => {
            const data = parseMessage(event);
            if (data?.type === 'auth' && data.subtype === 'login_success') {
                localStorage.setItem('currentPlayer', JSON.stringify(data.payload));
                navigate('/games');
            }
        };
        ws.addEventListener('message', handleMessage);
        return () => ws.removeEventListener('message', handleMessage);
    }, [socket, navigate]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const name = username.trim();
        if (!name) return;
        setIsSubmitting(true);
        sendMessage(socket, { type: 'auth', subtype: 'login', payload: { username: name } });
        setTimeout(() => setIsSubmitting(false), 4000);
    }

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

                <form className="login-form hts-panel" onSubmit={handleSubmit}>
                    <label htmlFor="hero-name" className="hts-label">{t.login.nameLabel}</label>
                    <input
                        id="hero-name"
                        className="hts-input"
                        type="text"
                        autoComplete="nickname"
                        maxLength={24}
                        placeholder={t.login.namePlaceholder}
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <button type="submit" className="hts-btn login-cta" disabled={!username.trim() || isSubmitting}>
                        {isSubmitting ? t.login.entering : t.login.enter}
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                </form>
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
