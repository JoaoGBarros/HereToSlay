import { classInfo } from '@/utils/ClassInfo';
import type { PlayersMap } from '../../common/types';
import { useI18n } from '@/i18n';

interface TopBarProps {
    matchId?: string;
    round: number;
    drawPileCount: number;
    discardCount: number;
    players: PlayersMap;
    order: string[];
    turn: string;
    me: string;
    historyOpen: boolean;
    onToggleHistory: () => void;
    onOpenRules: () => void;
    onOpenSettings: () => void;
}

function TopBar({ matchId, round, drawPileCount, discardCount, players, order, turn, me, historyOpen, onToggleHistory, onOpenRules, onOpenSettings }: TopBarProps) {
    const { t } = useI18n();
    return (
        <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <span className="hts-display topbar-table" title={t.board.table(matchId)}>{t.board.table(matchId)}</span>
                <span className="topbar-round">{t.engine.board.round(round)}</span>
                <span className="hts-muted" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
                    {t.engine.board.deckCount(drawPileCount)} · {t.engine.board.discardCount(discardCount)}
                </span>
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
                <button type="button" className="hts-icon-btn topbar-history" aria-pressed={historyOpen} onClick={onToggleHistory}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="9" /></svg>
                    {t.board.history}
                </button>
                <button type="button" className="hts-icon-btn" aria-label={t.board.rules} title={t.board.rules} onClick={onOpenRules}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /></svg>
                </button>
                <button type="button" className="hts-icon-btn" aria-label={t.engine.board.settings} title={t.engine.board.settings} onClick={onOpenSettings}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
                    </svg>
                </button>
            </div>
        </header>
    );
}

export default TopBar;
