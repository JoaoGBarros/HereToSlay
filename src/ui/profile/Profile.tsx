import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMatchHistory, getMyProfile, type MatchSummary, type PlayerProfile } from '@/api/accountsClient';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n';
import { SettingsButton } from '../common/SettingsButton';
import { SiteFooter } from '../common/SiteFooter';
import { StatsPanel } from './StatsPanel';
import { MatchHistory } from './MatchHistory';
import { formatDate, formatDateTime, platformLabel } from './format';
import tableBackground from '../assets/ingame.png';
import '../games/Games.css';
import './Profile.css';

const PAGE_SIZE = 10;

type LoadState = 'loading' | 'ready' | 'error';

/** The signed-in player's profile, lifetime stats and match history. Reached from the tavern. */
function Profile() {
    const { getIdToken, profile: cachedProfile } = useAuth();
    const { t, lang } = useI18n();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<PlayerProfile | null>(cachedProfile);
    const [matches, setMatches] = useState<MatchSummary[]>([]);
    const [nextPage, setNextPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [state, setState] = useState<LoadState>('loading');
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const token = useCallback(async () => {
        const idToken = await getIdToken();
        if (!idToken) throw new Error('Not signed in');
        return idToken;
    }, [getIdToken]);

    const load = useCallback(async () => {
        setState('loading');
        try {
            // Stats change after every match, so the page always asks for fresh numbers.
            const fresh = await getMyProfile(token);
            const history = await getMatchHistory(token, fresh.username, 0, PAGE_SIZE);
            setProfile(fresh);
            setMatches(history.items);
            setNextPage(1);
            setTotalPages(history.totalPages);
            setState('ready');
        } catch {
            setState('error');
        }
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    async function handleLoadMore() {
        if (!profile) return;
        setIsLoadingMore(true);
        try {
            const history = await getMatchHistory(token, profile.username, nextPage, PAGE_SIZE);
            setMatches((current) => [...current, ...history.items]);
            setNextPage((page) => page + 1);
            setTotalPages(history.totalPages);
        } catch {
            // The button stays; the player can try again.
        } finally {
            setIsLoadingMore(false);
        }
    }

    return (
        <div className="hts-screen tavern-screen">
            <img src={tableBackground} alt="" className="hts-screen-bg" style={{ opacity: 0.16 }} />

            <header className="tavern-header">
                <button type="button" className="hts-btn hts-btn--ghost hts-btn--sm" onClick={() => navigate('/games')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
                    {t.profile.back}
                </button>
                <div className="tavern-user"><SettingsButton /></div>
            </header>

            <main className="profile-main">
                {profile && (
                    <section className="profile-hero" aria-labelledby="profile-name">
                        <span className="profile-initial" aria-hidden="true">{profile.username.charAt(0).toUpperCase()}</span>
                        <div className="profile-hero-text">
                            <span className="hts-label">{t.profile.title}</span>
                            <h1 id="profile-name" className="hts-display profile-name">{profile.username}</h1>
                            <p className="hts-muted profile-meta">
                                {t.profile.memberSince(formatDate(profile.createdAt, lang))} · {t.profile.createdOn(platformLabel(profile.createdPlatform))}
                            </p>
                            <p className="hts-muted profile-meta">
                                {t.profile.lastSeen(formatDateTime(profile.lastLoginAt, lang), platformLabel(profile.lastLoginPlatform))}
                            </p>
                        </div>
                    </section>
                )}

                {state === 'loading' && <p className="hts-muted profile-status" role="status">{t.profile.loading}</p>}
                {state === 'error' && (
                    <div className="profile-status" role="alert">
                        <p className="hts-muted">{t.profile.loadError}</p>
                        <button type="button" className="hts-btn hts-btn--sm" onClick={() => void load()}>{t.profile.retry}</button>
                    </div>
                )}
                {state === 'ready' && profile && (
                    <div className="profile-grid">
                        <StatsPanel stats={profile.stats} />
                        <MatchHistory
                            matches={matches}
                            hasMore={nextPage < totalPages}
                            isLoadingMore={isLoadingMore}
                            onLoadMore={() => void handleLoadMore()}
                        />
                    </div>
                )}
            </main>

            <SiteFooter />
        </div>
    );
}

export default Profile;
