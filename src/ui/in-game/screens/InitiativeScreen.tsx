import { useState } from 'react';
import { playSound } from '@/utils/SoundManager/SoundManager';
import { PLAYER_COLORS } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import { DicePair } from '../../common/PipDie';
import type { PlayersMap } from '../../common/types';
import { Avatar } from '../../common/Widgets';
import './screens.css';

interface InitiativeScreenProps {
    players: PlayersMap;
    me: string;
    /** Rolls from the round that just tied, kept so players can see why they roll again. */
    tieRolls: Record<string, number | null> | null;
    onRoll: () => void;
}

function InitiativeScreen({ players, me, tieRolls, onRoll }: InitiativeScreenProps) {
    const { t } = useI18n();
    const ids = Object.keys(players);
    const myRoll = players[me]?.orderRoll ?? null;
    // The engine throws the dice; we tumble until the result arrives.
    const [requested, setRequested] = useState(false);
    const rolling = requested && myRoll == null;
    const dice = players[me]?.orderDice ?? null;
    const roll = () => {
        playSound('diceRoll');
        setRequested(true);
        onRoll();
    };

    const ranked = ids
        .filter((pid) => players[pid].orderRoll != null)
        .sort((a, b) => (players[b].orderRoll ?? 0) - (players[a].orderRoll ?? 0));
    const allRolled = ranked.length === ids.length && ids.length > 0;

    return (
        <section className="prep-screen" aria-labelledby="init-h">
            <header className="prep-header">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span className="hts-label">{t.initiative.kicker}</span>
                    <h1 id="init-h" className="hts-display" style={{ fontSize: 54 }}>{t.initiative.title}</h1>
                    <p className="prep-lead">{t.initiative.lead}</p>
                </div>
                <span className="hts-chip hts-chip--sky">{t.initiative.noModifiers}</span>
            </header>

            {tieRolls && myRoll == null && (
                <div className="prep-banner hts-pop" role="status">{t.initiative.tie}</div>
            )}

            <div className="init-trays" style={{ gridTemplateColumns: `repeat(${Math.min(ids.length, 6)}, minmax(0, 1fr))` }}>
                {ids.map((pid, index) => {
                    const player = players[pid];
                    const isMe = pid === me;
                    const value = player.orderRoll;
                    const previous = tieRolls?.[pid];
                    const waitingMine = isMe && value == null;
                    return (
                        <article key={pid} className={`init-tray ${waitingMine && !rolling ? 'init-tray--mine' : ''}`}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Avatar name={player.username} color={PLAYER_COLORS[index % PLAYER_COLORS.length]} />
                                <div style={{ minWidth: 0, lineHeight: 1.15 }}>
                                    <div className="init-name">{player.username}{isMe ? t.common.youSuffix : ''}</div>
                                    <div className="init-state" data-tone={value != null ? 'done' : waitingMine ? 'mine' : 'wait'}>
                                        {value != null ? t.initiative.rolled : waitingMine ? t.initiative.yourRoll : t.initiative.rolling}
                                    </div>
                                </div>
                            </div>
                            <div className="init-felt">
                                {isMe && (rolling || (dice && value != null)) ? (
                                    <DicePair dice={value != null ? dice : null} rolling={rolling} size={60} />
                                ) : waitingMine ? (
                                    <button type="button" className="hts-btn" onClick={roll}>{t.initiative.roll}</button>
                                ) : value == null ? (
                                    <DicePair dice={null} rolling size={52} />
                                ) : (
                                    <span className="hts-display hts-pop init-total-felt">{value}</span>
                                )}
                            </div>
                            <div className="init-footer">
                                {isMe ? (
                                    <span className={`hts-display ${value != null ? 'hts-pop' : ''}`} style={{ fontSize: 60, color: value != null ? 'var(--hts-text)' : '#3a474c' }}>
                                        {value ?? '–'}
                                    </span>
                                ) : <span />}
                                {previous != null && value == null && <span className="hts-muted" style={{ fontWeight: 700 }}>{t.initiative.before(previous)}</span>}
                            </div>
                        </article>
                    );
                })}
            </div>

            <footer className="prep-ladder hts-panel" aria-label={t.initiative.orderAria}>
                <div style={{ width: 160, flex: 'none', lineHeight: 1.2 }}>
                    <div className="hts-label">{t.initiative.orderTitle}</div>
                    <div className="hts-display" style={{ fontSize: 24 }}>{allRolled ? t.initiative.orderDefined : t.initiative.orderForming}</div>
                </div>
                <ol className="prep-ladder-list">
                    {ids.map((_, i) => {
                        const pid = ranked[i];
                        return (
                            <li key={i} className={`prep-ladder-slot ${pid && i === 0 && allRolled ? 'prep-ladder-slot--first' : ''}`}>
                                <span className="hts-display" style={{ fontSize: 22, color: 'var(--hts-dim)' }}>{i + 1}º</span>
                                <span style={{ fontWeight: 800 }}>{pid ? players[pid].username : '—'}</span>
                                <span className="prep-ladder-tag">{pid ? (i === 0 && allRolled ? t.initiative.startsPlaying : players[pid].orderRoll) : t.initiative.waiting}</span>
                            </li>
                        );
                    })}
                </ol>
            </footer>
        </section>
    );
}

export default InitiativeScreen;
