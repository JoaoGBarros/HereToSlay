import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import WebSocketContext from '@/utils/WebSocketContext';
import { PLAYER_COLORS } from '@/utils/ClassInfo';
import { appendChat, ChatPanel, type ChatMessage } from '../../common/ChatPanel';
import { parseMessage, sendMessage } from '../../common/types';
import { LanguageSwitch, useI18n } from '@/i18n';
import { Avatar, SoundToggle, TimerRing } from '../../common/Widgets';
import tableBackground from '../../assets/ingame.png';
import './Lobby.css';

const COUNTDOWN_SECONDS = 5;
const DEFAULT_SEATS = 6;

interface Seat {
    id: string;
    username: string;
    ready: boolean;
}

/** Seat positions around the oval table, as % of the table area (index 0 = bottom). */
function seatPosition(index: number, total: number) {
    const angle = Math.PI / 2 + (index / total) * Math.PI * 2;
    return { left: 50 + Math.cos(angle) * 37, top: 50 + Math.sin(angle) * 40 };
}

function readCurrentPlayer(): { id: string; username: string } | null {
    try {
        const p = JSON.parse(localStorage.getItem('currentPlayer') || 'null');
        return p ? { id: String(p.id), username: p.username } : null;
    } catch {
        return null;
    }
}

function Lobby() {
    const socket = useContext(WebSocketContext);
    const navigate = useNavigate();
    const { id } = useParams();
    const me = useMemo(readCurrentPlayer, []);
    const { t } = useI18n();
    const [seats, setSeats] = useState<Seat[]>([]);
    const [lobbyName, setLobbyName] = useState('');
    const [maxPlayers, setMaxPlayers] = useState<number | null>(null);
    const [minPlayers, setMinPlayers] = useState<number | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [chat, setChat] = useState<ChatMessage[]>([]);

    useEffect(() => {
        if (!me) navigate('/');
    }, [me, navigate]);

    useEffect(() => {
        if (!socket || !id) return;
        const handleMessage = (event: MessageEvent) => {
            const data = parseMessage(event);
            if (data?.type !== 'lobby') return;
            switch (data.subtype) {
                case 'lobby_update': {
                    const p = data.payload;
                    const list: Seat[] = Array.isArray(p.players)
                        ? p.players.map((s: Seat) => ({ id: String(s.id), username: s.username, ready: !!s.ready }))
                        : (p.username || []).map((name: string) => ({ id: name, username: name, ready: false }));
                    setSeats(list);
                    setLobbyName(p.name || '');
                    if (p.maxPlayers) setMaxPlayers(p.maxPlayers);
                    if (p.minPlayers) setMinPlayers(p.minPlayers);
                    return;
                }
                case 'leave_response':
                    navigate('/games');
                    return;
                case 'countdown_update':
                    setCountdown(data.payload.timeLeft);
                    setMinPlayers(data.payload.minPlayers);
                    return;
                case 'countdown_finished':
                    navigate(`/match/${id}`);
                    return;
                case 'chat_history':
                    setChat(Array.isArray(data.payload) ? data.payload : []);
                    return;
                case 'chat_message':
                    setChat((prev) => appendChat(prev, data.payload));
                    return;
                default:
                    return;
            }
        };
        // Listen first so the join reply is never missed.
        socket.addEventListener('message', handleMessage);
        sendMessage(socket, { type: 'lobby', subtype: 'join', payload: { lobbyId: Number(id) } });
        return () => socket.removeEventListener('message', handleMessage);
    }, [id, socket, navigate]);

    const lobbyId = Number(id);
    const mySeat = seats.find((s) => s.id === me?.id);
    const isReady = !!mySeat?.ready;
    const readyCount = seats.filter((s) => s.ready).length;
    const totalSeats = maxPlayers || Math.max(DEFAULT_SEATS, seats.length);
    const isCounting = countdown !== null && countdown >= 0;
    const missing = minPlayers ? Math.max(0, minPlayers - seats.length) : 0;
    const colorFor = (playerId: string) => {
        const index = seats.findIndex((s) => s.id === playerId);
        return PLAYER_COLORS[(index >= 0 ? index : 0) % PLAYER_COLORS.length];
    };

    function toggleReady() {
        sendMessage(socket, { type: 'lobby', subtype: 'ready', payload: { lobbyId, ready: !isReady } });
    }

    function sendChat(text: string) {
        sendMessage(socket, { type: 'lobby', subtype: 'chat', payload: { lobbyId, text } });
    }

    let status: string;
    if (missing > 0) status = t.lobby.missing(missing);
    else if (readyCount < seats.length) status = t.lobby.readyProgress(readyCount, seats.length);
    else status = t.lobby.allReady;

    return (
        <div className="hts-screen lobby-screen">
            <img src={tableBackground} alt="" className="hts-screen-bg" style={{ opacity: 0.22 }} />

            <header className="lobby-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <button type="button" className="hts-btn hts-btn--ghost hts-btn--sm" onClick={() => sendMessage(socket, { type: 'lobby', subtype: 'leave', payload: { lobbyId } })}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                        {t.lobby.leave}
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                        <span className="hts-label">{t.lobby.table(id ?? '')}</span>
                        <span className="hts-display" style={{ fontSize: 30 }}>{lobbyName || t.lobby.loading}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="hts-chip hts-chip--muted">{t.lobby.playersChip(seats.length, totalSeats, minPlayers)}</span>
                    <LanguageSwitch />
                    <SoundToggle />
                </div>
            </header>

            <main className="lobby-main">
                <section className="lobby-table-area" aria-label={t.lobby.tableAria}>
                    <div className="lobby-table" />
                    <div className="lobby-table-center">
                        {isCounting ? (
                            <>
                                <div className="lobby-countdown hts-pulse-ring">
                                    <TimerRing fraction={(countdown ?? 0) / COUNTDOWN_SECONDS} size={132} label={String(countdown)} />
                                </div>
                                <span style={{ fontWeight: 800, fontSize: 18 }}>{t.lobby.starting}</span>
                                <span className="hts-muted" style={{ fontSize: 14 }}>{t.lobby.countdownNote}</span>
                            </>
                        ) : (
                            <>
                                <span className="hts-display" style={{ fontSize: 40, color: 'var(--hts-gold-text)' }}>
                                    {missing > 0 ? t.lobby.waitingPlayers : t.lobby.waitingReady}
                                </span>
                                <span className="hts-muted" style={{ fontWeight: 700, fontSize: 16 }} role="status">{status}</span>
                            </>
                        )}
                        <span className="hts-muted" style={{ fontSize: 14 }}>{t.lobby.next}</span>
                    </div>

                    {Array.from({ length: totalSeats }).map((_, i) => {
                        const seat = seats[i];
                        const pos = seatPosition(i, totalSeats);
                        const isMe = !!seat && seat.id === me?.id;
                        return (
                            <div
                                key={seat?.id ?? `empty-${i}`}
                                className={`lobby-seat ${seat ? 'lobby-seat--taken hts-fade' : ''} ${seat?.ready ? 'lobby-seat--ready' : ''} ${isMe ? 'lobby-seat--me' : ''}`}
                                style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                            >
                                {seat ? (
                                    <>
                                        <Avatar name={seat.username} color={PLAYER_COLORS[i % PLAYER_COLORS.length]} size={46} />
                                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                            <span className="lobby-seat-name">{seat.username}{isMe ? t.common.youSuffix : ''}</span>
                                            <span className={seat.ready ? 'lobby-seat-state lobby-seat-state--ready' : 'lobby-seat-state'}>
                                                {seat.ready ? t.lobby.isReady : t.lobby.preparing}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="lobby-seat-empty" aria-hidden="true">+</span>
                                        <span className="hts-muted" style={{ fontWeight: 700 }}>{t.lobby.freeSeat}</span>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    <div className="lobby-ready-bar">
                        <button
                            type="button"
                            className={isReady ? 'hts-btn hts-btn--ghost lobby-ready lobby-ready--on' : 'hts-btn lobby-ready'}
                            aria-pressed={isReady}
                            disabled={!mySeat}
                            onClick={toggleReady}
                        >
                            {isReady ? t.lobby.readyCancel : t.lobby.ready}
                        </button>
                    </div>
                </section>

                <aside className="lobby-side">
                    <ChatPanel
                        messages={chat}
                        me={me?.id ?? ''}
                        colorFor={colorFor}
                        onSend={sendChat}
                        subtitle={t.lobby.atTable(seats.length)}
                        phrases={t.chat.lobbyPhrases}
                    />
                </aside>
            </main>
        </div>
    );
}

export default Lobby;
