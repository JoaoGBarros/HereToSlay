import { useCallback, useEffect, useRef, useState } from 'react';
import { playSound } from '@/utils/SoundManager/SoundManager';
import { useI18n } from '@/i18n';
import { DicePair } from '../../common/PipDie';
import type { ModifierWindowData, PlayersMap, RollData } from '../../common/types';
import { TimerRing } from '../../common/Widgets';

const TICK_MS = 200;

export function signed(value: number) {
    return value > 0 ? `+${value}` : `−${Math.abs(value)}`;
}

export function bonusSum(roll: RollData): number {
    return roll.bonuses.reduce((sum, b) => sum + b.value, 0);
}

export function rawOf(roll: RollData): number | null {
    return roll.dice ? roll.dice[0] + roll.dice[1] : null;
}

/**
 * The dice sound for one roll, played once: right on the roller's click (the returned function),
 * or when the dice arrive for everyone else. A scene that opens on dice already thrown stays quiet.
 */
export function useRollSound(dice: RollData['dice']) {
    const played = useRef(dice != null);
    useEffect(() => {
        if (!dice || played.current) return;
        played.current = true;
        playSound('diceRoll');
    }, [dice]);
    return useCallback(() => {
        if (played.current) return;
        played.current = true;
        playSound('diceRoll');
    }, []);
}

/** Remaining time of a server window, ticking down locally between state updates. */
export function useWindowClock(remainingMs: number, durationMs: number) {
    const [left, setLeft] = useState(remainingMs);
    useEffect(() => {
        const started = Date.now();
        setLeft(remainingMs);
        const id = setInterval(() => setLeft(Math.max(0, remainingMs - (Date.now() - started))), TICK_MS);
        return () => clearInterval(id);
    }, [remainingMs]);
    return { left, fraction: durationMs > 0 ? left / durationMs : 0, seconds: Math.ceil(left / 1000) };
}

/**
 * Every number that goes into one roll, each on its own chip: passive bonuses (leader, monsters,
 * items, turn effects) in blue, Modifiers in green/red with who played them. Nothing carries over.
 */
export function RollChips({ roll, players, align = 'flex-start' }: { roll: RollData; players: PlayersMap; align?: 'flex-start' | 'flex-end' }) {
    const { t } = useI18n();
    if (roll.bonuses.length === 0 && roll.modifiers.length === 0) return null;
    return (
        <div className="roll-chips" style={{ alignItems: align }}>
            {roll.bonuses.map((b, i) => (
                <span key={`b-${i}`} className="roll-chip roll-chip--bonus">
                    <b>{signed(b.value)}</b> {b.label}
                </span>
            ))}
            {roll.modifiers.map((m, i) => (
                <span key={`m-${i}`} className={`roll-chip hts-pop ${m.value > 0 ? 'roll-chip--plus' : 'roll-chip--minus'}`}>
                    <b>{signed(m.value)}</b> {t.modifier.fromPlayer('', players[m.playerId]?.username ?? t.common.someone).trim()}
                </span>
            ))}
        </div>
    );
}

/** Dice, then "raw → total" once anything changed the result. */
export function RollNumbers({ roll, rolling, size = 72, totalSize = 84, color }: { roll: RollData; rolling: boolean; size?: number; totalSize?: number; color?: string }) {
    const raw = rawOf(roll);
    const total = roll.total ?? null;
    return (
        <div className="roll-numbers">
            <DicePair dice={roll.dice ?? null} rolling={rolling && !roll.dice} size={size} />
            {raw != null && total != null && (
                <span className="roll-total">
                    {total !== raw && <s className="roll-raw">{raw}</s>}
                    <span key={total} className="hts-display hts-pop" style={{ fontSize: totalSize, color }}>{total}</span>
                </span>
            )}
        </div>
    );
}

/** Who can still react in the Modifier window. */
export function ModifierStatus({ window: w, players, me }: { window: ModifierWindowData; players: PlayersMap; me: string }) {
    const { t } = useI18n();
    const { fraction, seconds } = useWindowClock(w.remainingMs, w.durationMs);
    return (
        <div className="mod-status">
            <TimerRing fraction={fraction} size={44} label={String(seconds)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>{t.engine.roll.waitingMods}</span>
                <span className="hts-muted" style={{ fontSize: 13 }}>
                    {w.holders.map((pid) => `${pid === me ? t.common.you : players[pid]?.username ?? ''} ${w.passed.includes(pid) ? t.engine.modifier.passed : t.engine.modifier.thinking}`).join(' · ')}
                </span>
            </div>
        </div>
    );
}
