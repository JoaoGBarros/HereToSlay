import { classInfo } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import { GameCard } from '../../common/GameCard';
import type { CardData, PlayersMap } from '../../common/types';

type Mode = 'SELECTING_CARDS' | 'SELECTING_HAND_CARDS' | 'SELECTING_PLAYER';

function Reticle() {
    return (
        <span className="hts-reticle" aria-hidden="true">
            <svg viewBox="0 0 96 96"><circle cx="48" cy="48" r="40" fill="none" stroke="#e8693f" strokeWidth="5" strokeDasharray="20 11" /><path d="M48 0v18M48 78v18M0 48h18M78 48h18" stroke="#e8693f" strokeWidth="5" /></svg>
        </span>
    );
}

interface TargetSheetProps {
    mode: Mode;
    players: PlayersMap;
    me: string;
    source: CardData | null;
    targets: Record<string, number[]>;
    maxTargets: number;
    selectedPlayerId: string | null;
    onToggleCard: (playerId: string, cardId: number, isSelected: boolean) => void;
    onTogglePlayer: (playerId: string, isSelected: boolean) => void;
    onConfirm: () => void;
}

function TargetSheet({ mode, players, me, source, targets, maxTargets, selectedPlayerId, onToggleCard, onTogglePlayer, onConfirm }: TargetSheetProps) {
    const { t } = useI18n();
    const others = Object.keys(players).filter((pid) => pid !== me);
    const selectedIds = new Set(Object.values(targets).flat().map(Number));
    const count = mode === 'SELECTING_PLAYER' ? (selectedPlayerId ? 1 : 0) : selectedIds.size;
    const max = mode === 'SELECTING_PLAYER' ? 1 : maxTargets;
    const full = max > 0 && count >= max;
    const copy = t.target.modes[mode];

    return (
        <div className="target-sheet hts-fade" role="dialog" aria-modal="true" aria-labelledby="target-h">
            <header className="target-head">
                {source && <GameCard card={source} width={92} style={{ boxShadow: '0 0 0 3px var(--hts-sky), 0 16px 30px rgba(0,0,0,.6)' }} />}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span className="hts-label" style={{ color: 'var(--hts-sky-text)' }}>{source?.cardName ? t.target.effectOf(source.cardName) : t.target.cardEffect}</span>
                    <h1 id="target-h" className="hts-display" style={{ fontSize: 42 }}>{copy.title}</h1>
                    <p className="hts-muted" style={{ margin: 0, fontSize: 15 }}>{copy.help}</p>
                </div>
            </header>

            <div className="target-body hts-scroll">
                {mode === 'SELECTING_PLAYER' ? (
                    <div className="target-players">
                        {others.map((pid) => {
                            const p = players[pid];
                            const info = classInfo(p.leader);
                            const isSelected = selectedPlayerId === pid;
                            return (
                                <button key={pid} type="button" aria-pressed={isSelected} className={`target-player ${isSelected ? 'target-player--on' : ''}`} onClick={() => onTogglePlayer(pid, isSelected)}>
                                    {info && <img src={info.leaderArt} alt="" />}
                                    <span className="hts-display" style={{ fontSize: 30 }}>{p.username}</span>
                                    <span className="hts-muted" style={{ fontWeight: 700 }}>{t.target.handParty(p.hand?.length ?? 0, p.party?.length ?? 0)}</span>
                                    {isSelected && <span className="target-player-tag">{t.target.chosenTag}</span>}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="target-groups">
                        {others.map((pid) => {
                            const p = players[pid];
                            const info = classInfo(p.leader);
                            const cards = mode === 'SELECTING_CARDS'
                                ? (p.party || []).filter((c) => c.type !== 'MONSTER')
                                : [...(p.hand || [])].sort((a, b) => a.cardId - b.cardId);
                            return (
                                <div key={pid} className="target-group">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {info && <img src={info.leaderArt} alt="" className="plaque-avatar" style={{ width: 34, height: 34 }} />}
                                        <span style={{ fontWeight: 800, fontSize: 17 }}>{p.username}</span>
                                        <span className="hts-muted" style={{ fontSize: 13 }}>{mode === 'SELECTING_CARDS' ? t.target.inParty(cards.length) : t.target.inHand(cards.length)}</span>
                                    </div>
                                    <div className="target-cards">
                                        {cards.length === 0 && <span className="hts-muted" style={{ fontSize: 14 }}>{t.target.nothing}</span>}
                                        {cards.map((card, i) => {
                                            const isSelected = selectedIds.has(card.cardId);
                                            const blocked = full && !isSelected;
                                            return (
                                                <GameCard
                                                    key={card.cardId}
                                                    card={card}
                                                    faceDown={mode === 'SELECTING_HAND_CARDS'}
                                                    width={120}
                                                    selectable={!blocked}
                                                    selected={isSelected}
                                                    dimmed={blocked}
                                                    ariaLabel={mode === 'SELECTING_HAND_CARDS' ? t.target.hiddenCard(i + 1, p.username) : t.target.cardOf(card.cardName ?? t.common.card, p.username)}
                                                    onClick={() => { if (!blocked) onToggleCard(pid, card.cardId, isSelected); }}
                                                >
                                                    {isSelected && <Reticle />}
                                                </GameCard>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <footer className="target-foot">
                <span className={`hts-chip ${count > 0 ? 'hts-chip--jade' : 'hts-chip--muted'}`}>{t.target.chosen(count, max || '…')}</span>
                <button type="button" className="hts-btn hts-btn--danger" disabled={count === 0} onClick={onConfirm}>{t.target.confirm}</button>
            </footer>
        </div>
    );
}

export default TargetSheet;
