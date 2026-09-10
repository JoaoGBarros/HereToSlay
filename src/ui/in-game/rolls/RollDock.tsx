import { useState } from 'react';
import { classInfo } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import { GameCard } from '../../common/GameCard';
import { DicePair } from '../../common/PipDie';
import type { ModifierWindowData, PlayersMap, RollData } from '../../common/types';
import { bonusSum, rawOf, signed, useWindowClock } from './RollParts';
import './stage.css';

interface RollDockProps {
    roll: RollData;
    modifierWindow?: ModifierWindowData;
    players: PlayersMap;
    me: string;
    canModify: boolean;
    trayOpen: boolean;
    onRoll: () => void;
    onOpenModifiers: () => void;
    onPass: () => void;
}

const RING = 2 * Math.PI * 16;

/** The 2..12 strip: cells that succeed in green, the rolled number marked. */
function RangeStrip({ target, bonus, mark }: { target: number; bonus: number; mark: number | null }) {
    const cells = [];
    for (let n = 2; n <= 12; n++) {
        const win = n + bonus >= target;
        cells.push(<span key={n} className={`dock2-cell ${win ? 'dock2-cell--win' : ''} ${mark === n ? 'dock2-cell--mark' : ''}`}>{n}</span>);
    }
    return <div className="dock2-strip" aria-hidden="true">{cells}</div>;
}

/**
 * Hero effect roll in the "roll dock" from the design: it sits above the hand so the table stays
 * visible. The felt shows each stage: before, rolling, raw result, Modifiers, resolution.
 */
function RollDock({ roll, modifierWindow, players, me, canModify, trayOpen, onRoll, onOpenModifiers, onPass }: RollDockProps) {
    const { t } = useI18n();
    const [clicked, setClicked] = useState(false);
    const card = roll.card;
    const target = card?.diceValue ?? 0;
    const roller = players[roll.rollerId];
    const isRoller = roll.rollerId === me;
    const raw = rawOf(roll);
    const total = roll.total ?? null;
    const resolved = roll.outcome != null;
    const success = roll.outcome === 'success';
    const rolling = !roll.dice && (clicked || !isRoller);
    const clock = useWindowClock(modifierWindow?.remainingMs ?? 0, modifierWindow?.durationMs ?? 1);
    const tint = classInfo(roller?.leader)?.tint ?? 'var(--hts-gold)';
    const others = (modifierWindow?.holders ?? []).filter((pid) => pid !== me);

    let felt;
    if (resolved && total != null) {
        felt = (
            <div className={`dock2-result ${success ? 'dock2-result--win' : 'dock2-result--fail'}`}>
                <span className="dock2-result-title">{success ? t.engine.dock.success(total) : t.engine.dock.fail(total)}</span>
                <span className="dock2-result-sub">{t.engine.dock.needed(target)}</span>
            </div>
        );
    } else if (!roll.dice && isRoller && !clicked) {
        felt = (
            <div className="dock2-felt">
                <span className="dock2-need">{t.engine.dock.needs(target)}</span>
                <button type="button" className="dock2-roll" onClick={() => { setClicked(true); onRoll(); }}>{t.engine.roll.rollNow}</button>
            </div>
        );
    } else {
        felt = (
            <div className="dock2-felt dock2-felt--row">
                <DicePair dice={roll.dice ?? null} rolling={rolling} size={56} />
                {raw != null && total != null && (
                    <div className="dock2-live">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {modifierWindow && (
                                <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(243,234,214,.18)" strokeWidth="5" />
                                    <circle cx="20" cy="20" r="16" fill="none" stroke="#e9b949" strokeWidth="5" strokeDasharray={RING} strokeDashoffset={RING * (1 - clock.fraction)} strokeLinecap="round" transform="rotate(-90 20 20)" />
                                </svg>
                            )}
                            <span className="dock2-total">
                                {total !== raw && <s>{raw}</s>} {total}
                            </span>
                        </div>
                        {modifierWindow && (
                            <span className="dock2-status">
                                {others.length > 0
                                    ? others.map((pid) => `${players[pid]?.username} ${modifierWindow.passed.includes(pid) ? t.engine.modifier.passed : t.engine.modifier.thinking}`).join(' · ')
                                    : t.engine.roll.waitingMods}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <section className={`dock2 hts-rise ${resolved ? (success ? 'dock2--win' : 'dock2--fail') : ''}`} aria-label={t.roll.aria} aria-live="polite">
            {card && <GameCard card={card} width={96} className="dock2-card" style={{ boxShadow: `0 0 0 2px ${tint}` }} />}
            <div className="dock2-info">
                <span className="dock2-who">{t.engine.heroRoll.rolls(isRoller ? t.common.you : roller?.username ?? '')}</span>
                <span className="dock2-what">{t.engine.heroRoll.needs(card?.cardName ?? '', target)}</span>
                <RangeStrip target={target} bonus={bonusSum(roll)} mark={raw} />
                <div className="dock2-chips">
                    {roll.bonuses.map((b, i) => <span key={`b${i}`} className="duel3-chip duel3-chip--bonus">{t.engine.duel.bonusChip(signed(b.value), b.label)}</span>)}
                    {roll.modifiers.map((m, i) => (
                        <span key={`m${i}`} className={`duel3-chip hts-pop ${m.value > 0 ? 'duel3-chip--plus' : 'duel3-chip--minus'}`}>
                            {t.engine.duel.modChip(signed(m.value), m.playerId === me ? t.common.you : players[m.playerId]?.username ?? '')}
                        </span>
                    ))}
                </div>
            </div>
            {felt}
            {canModify && !resolved && (
                <div className="dock2-actions">
                    <button type="button" className="dock2-mod" aria-pressed={trayOpen} onClick={onOpenModifiers}>{t.engine.heroRoll.playModifier}</button>
                    <button type="button" className="dock2-pass" onClick={onPass}>{t.engine.modifier.pass}</button>
                </div>
            )}
        </section>
    );
}

export default RollDock;
