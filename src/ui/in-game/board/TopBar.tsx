import { classInfo } from '@/utils/ClassInfo';
import type { PlayersMap } from '../../common/types';
import { LanguageSwitch, useI18n } from '@/i18n';
import { MotionToggle, SoundToggle } from '../../common/Widgets';
import '../../common/chat.css';

interface TopBarProps {
    matchId?: string;
    players: PlayersMap;
    order: string[];
    turn: string;
    me: string;
    historyOpen: boolean;
    chatOpen: boolean;
    unread: number;
    onToggleHistory: () => void;
    onToggleChat: () => void;
    onOpenRules: () => void;
}

function TopBar({ matchId, players, order, turn, me, historyOpen, chatOpen, unread, onToggleHistory, onToggleChat, onOpenRules }: TopBarProps) {
    const { t } = useI18n();
    return (
        <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <span className="hts-display" style={{ fontSize: 22 }}>{t.board.table(matchId)}</span>
            </div>
            <ol className="topbar-order" aria-label={t.board.turnOrder}>
                {order.map((pid, i) => {
                    const p = players[pid];
                    if (!p) return null;
                    const info = classInfo(p.leader);
                    const active = pid === turn;
                    return (
                        <li key={pid} className={`topbar-pill ${active ? 'topbar-pill--active' : ''}`} aria-current={active ? 'true' : undefined}>
                            {info ? <img src={info.leaderArt} alt="" /> : <span className="topbar-pill-dot" />}
                            <span>{p.username}{pid === me ? t.common.youSuffix : ''}</span>
                            {i < order.length - 1 && <span className="topbar-arrow" aria-hidden="true">›</span>}
                        </li>
                    );
                })}
            </ol>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                    type="button"
                    className="hts-icon-btn topbar-history"
                    aria-pressed={chatOpen}
                    aria-label={unread > 0 ? t.chat.unread(unread) : t.board.chat}
                    onClick={onToggleChat}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
                    {t.board.chat}
                    {unread > 0 && <span className="chat-badge">{unread > 9 ? '9+' : unread}</span>}
                </button>
                <button type="button" className="hts-icon-btn topbar-history" aria-pressed={historyOpen} onClick={onToggleHistory}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="9" /></svg>
                    {t.board.history}
                </button>
                <button type="button" className="hts-icon-btn" aria-label={t.board.rules} onClick={onOpenRules}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /></svg>
                </button>
                <LanguageSwitch />
                <MotionToggle />
                <SoundToggle />
            </div>
        </header>
    );
}

export default TopBar;
