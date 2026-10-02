import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import WebSocketContext from '@/utils/WebSocketContext';
import type { LobbyStatus } from './enum/StatusEnum';
import { parseMessage, sendMessage } from '../common/types';
import { useI18n } from '@/i18n';
import type { Dict } from '@/i18n/pt';
import { SettingsButton } from '../common/SettingsButton';
import tableBackground from '../assets/ingame.png';
import './Games.css';

interface LobbySummary {
    id: number;
    name: string;
    playerAmount: number;
    maxPlayers: number;
    status: LobbyStatus;
}

type Filter = 'all' | 'open' | 'live';

/** Why the lobby would not seat the player: still in a running match, or the table filled up. */
export interface SeatRefusal {
    reason: 'in_match' | 'full';
    matchId?: number;
}

function readRefusal(payload: { reason?: string; matchId?: number } | undefined): SeatRefusal {
    return payload?.reason === 'in_match' ? { reason: 'in_match', matchId: payload.matchId } : { reason: 'full' };
}

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

const FILTERS: Filter[] = ['all', 'open', 'live'];

function isLive(status: LobbyStatus) {
    return status === 'IN_PROGRESS' || status === 'COMPLETED';
}

function statusChip(t: Dict, lobby: LobbySummary) {
    if (lobby.status === 'IN_PROGRESS') return { label: t.tavern.status.live, className: 'hts-chip--sky' };
    if (lobby.status === 'COMPLETED') return { label: t.tavern.status.done, className: 'hts-chip--muted' };
    if (lobby.status === 'STARTING') return { label: t.tavern.status.starting, className: 'hts-chip--gold' };
    return { label: t.tavern.status.waiting, className: 'hts-chip--jade' };
}

function SeatDots({ filled, total, size = 14 }: { filled: number; total: number; size?: number }) {
    const { t } = useI18n();
    return (
        <div className="tavern-seats" aria-label={t.tavern.seatsAria(filled, total)} role="img">
            {Array.from({ length: MAX_PLAYERS }).map((_, i) => {
                const state = i < filled ? 'filled' : i < total ? 'open' : 'closed';
                return <span key={i} className={`tavern-seat tavern-seat--${state}`} style={{ width: size, height: size }} />;
            })}
        </div>
    );
}

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
    const { t } = useI18n();
    return (
        <div className="tavern-field">
            <span className="hts-label">{label}</span>
            <div className="tavern-stepper">
                <button type="button" aria-label={t.tavern.decrease(label)} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
                <span className="hts-display" aria-live="polite">{value}</span>
                <button type="button" aria-label={t.tavern.increase(label)} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
            </div>
        </div>
    );
}

function Games() {
    const socket = useContext(WebSocketContext);
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useI18n();
    const [lobbies, setLobbies] = useState<LobbySummary[]>([]);
    const [refusal, setRefusal] = useState<SeatRefusal | null>((location.state as { refusal?: SeatRefusal } | null)?.refusal ?? null);
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');
    const [lobbyName, setLobbyName] = useState('');
    const [minPlayers, setMinPlayers] = useState(MIN_PLAYERS);
    const [maxPlayers, setMaxPlayers] = useState(4);
    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('currentPlayer') || 'null');
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        if (!user) navigate('/');
    }, [user, navigate]);

    useEffect(() => {
        const ws = socket;
        if (!ws) return;
        const handleMessage = (event: MessageEvent) => {
            const data = parseMessage(event);
            if (data?.type !== 'lobby') return;
            if (data.subtype === 'list_response' || data.subtype === 'list_update') {
                setLobbies(data.payload || []);
            } else if (data.subtype === 'create_success' && data.payload?.lobbyId != null) {
                navigate(`/lobby/${data.payload.lobbyId}`);
            } else if (data.subtype === 'create_fail') {
                setRefusal(readRefusal(data.payload));
            }
        };
        ws.addEventListener('message', handleMessage);
        sendMessage(socket, { type: 'lobby', subtype: 'list' });
        return () => ws.removeEventListener('message', handleMessage);
    }, [socket, navigate]);

    const visible = lobbies.filter((lobby) => {
        if (filter === 'open' && isLive(lobby.status)) return false;
        if (filter === 'live' && !isLive(lobby.status)) return false;
        return lobby.name.toLowerCase().includes(search.trim().toLowerCase());
    });

    const canCreate = lobbyName.trim().length > 0 && minPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS && minPlayers <= maxPlayers;

    function handleCreateLobby(e: React.FormEvent) {
        e.preventDefault();
        if (!canCreate) return;
        sendMessage(socket, {
            type: 'lobby',
            subtype: 'create',
            payload: { name: lobbyName.trim(), minPlayers, maxPlayers },
        });
        setLobbyName('');
    }

    function handleLogout() {
        localStorage.removeItem('currentPlayer');
        navigate('/');
    }

    return (
        <div className="hts-screen tavern-screen">
            <img src={tableBackground} alt="" className="hts-screen-bg" style={{ opacity: 0.16 }} />

            <header className="tavern-header">
                <div className="tavern-brand">
                    <span className="hts-display" style={{ fontSize: 28 }}>HERE TO <span style={{ color: 'var(--hts-gold)' }}>SLAY</span></span>
                    <span className="hts-chip hts-chip--gold">{t.tavern.badge}</span>
                </div>
                <div className="tavern-user">
                    <SettingsButton />
                    <div className="tavern-user-chip">
                        <span className="tavern-user-initial" aria-hidden="true">{(user?.username || '?').charAt(0).toUpperCase()}</span>
                        <span style={{ fontWeight: 800 }}>{user?.username || t.tavern.guest}</span>
                    </div>
                    <button type="button" className="hts-btn hts-btn--ghost hts-btn--sm" onClick={handleLogout}>{t.tavern.logout}</button>
                </div>
            </header>

            <main className="tavern-main">
                <section className="tavern-list" aria-labelledby="mesas-h">
                    <div>
                        <h1 id="mesas-h" className="hts-display" style={{ fontSize: 52 }}>{t.tavern.title}</h1>
                        <p className="hts-muted" style={{ margin: '6px 0 0', fontSize: 16 }}>{t.tavern.subtitle}</p>
                    </div>

                    {refusal && (
                        <div className="tavern-refusal" role="alert">
                            <span>{refusal.reason === 'in_match' ? t.tavern.refused.inMatch(refusal.matchId ?? '') : t.tavern.refused.full}</span>
                            {refusal.reason === 'in_match' && refusal.matchId != null && (
                                <button type="button" className="hts-btn hts-btn--sm" onClick={() => navigate(`/match/${refusal.matchId}`)}>{t.tavern.refused.back}</button>
                            )}
                            <button type="button" className="hts-icon-btn" aria-label={t.tavern.refused.dismiss} onClick={() => setRefusal(null)}>×</button>
                        </div>
                    )}

                    <div className="tavern-toolbar">
                        <div role="tablist" aria-label={t.tavern.filtersAria} className="tavern-tabs">
                            {FILTERS.map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    role="tab"
                                    aria-selected={filter === f}
                                    className={filter === f ? 'tavern-tab tavern-tab--on' : 'tavern-tab'}
                                    onClick={() => setFilter(f)}
                                >
                                    {t.tavern.filters[f]}
                                </button>
                            ))}
                        </div>
                        <label htmlFor="busca" className="sr-only">{t.tavern.searchLabel}</label>
                        <input id="busca" type="search" className="hts-input tavern-search" placeholder={t.tavern.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>

                    <ul className="tavern-rows hts-scroll">
                        {visible.length === 0 && (
                            <li className="tavern-empty">
                                {lobbies.length === 0 ? t.tavern.empty : t.tavern.emptyFilter}
                            </li>
                        )}
                        {visible.map((lobby) => {
                            const chip = statusChip(t, lobby);
                            const live = isLive(lobby.status);
                            const full = lobby.playerAmount >= lobby.maxPlayers;
                            return (
                                <li key={lobby.id} className="tavern-row">
                                    <span className="tavern-row-num hts-display" title={String(lobby.id)} style={{ fontSize: String(lobby.id).length > 4 ? 16 : 26 }}>{String(lobby.id).padStart(2, '0')}</span>
                                    <div className="tavern-row-info">
                                        <span className="tavern-row-name">{lobby.name}</span>
                                        <span className="hts-muted" style={{ fontSize: 14 }}>{t.tavern.players(lobby.playerAmount, lobby.maxPlayers)}</span>
                                    </div>
                                    <SeatDots filled={lobby.playerAmount} total={lobby.maxPlayers} />
                                    <span className={`hts-chip ${chip.className}`}>{chip.label}</span>
                                    <button
                                        type="button"
                                        className={live ? 'hts-btn hts-btn--ghost hts-btn--sm' : 'hts-btn hts-btn--sm'}
                                        style={{ width: 120 }}
                                        disabled={!live && full}
                                        onClick={() => navigate(`/lobby/${lobby.id}`)}
                                    >
                                        {live ? t.tavern.view : full ? t.tavern.full : t.tavern.sit}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <aside className="tavern-create hts-panel" aria-labelledby="nova-h">
                    <form onSubmit={handleCreateLobby} className="tavern-create-form">
                        <h2 id="nova-h" className="hts-display" style={{ fontSize: 34 }}>{t.tavern.createTitle}</h2>
                        <div className="tavern-field">
                            <label htmlFor="nome-mesa" className="hts-label">{t.tavern.nameLabel}</label>
                            <input id="nome-mesa" className="hts-input" type="text" maxLength={40} placeholder={t.tavern.namePlaceholder} required value={lobbyName} onChange={(e) => setLobbyName(e.target.value)} />
                        </div>
                        <div className="tavern-steppers">
                            <Stepper label={t.tavern.min} value={minPlayers} min={MIN_PLAYERS} max={maxPlayers} onChange={setMinPlayers} />
                            <Stepper label={t.tavern.max} value={maxPlayers} min={minPlayers} max={MAX_PLAYERS} onChange={setMaxPlayers} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <SeatDots filled={minPlayers} total={maxPlayers} size={22} />
                            <span className="hts-muted" style={{ fontSize: 13 }}>{t.tavern.seats}</span>
                        </div>
                        {minPlayers === 2 && (
                            <p className="tavern-note">{t.tavern.twoPlayerNote}</p>
                        )}
                        <button type="submit" className="hts-btn" disabled={!canCreate} style={{ height: 56 }}>{t.tavern.create}</button>
                    </form>
                </aside>
            </main>
        </div>
    );
}

export default Games;
