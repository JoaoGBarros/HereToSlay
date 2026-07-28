import { useCallback, useEffect, useRef, useState } from 'react';
import { playSound } from '@/utils/SoundManager/SoundManager';
import { useI18n } from '@/i18n';

const PIPS: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
};

const ROLL_DURATION_MS = 800;
const TUMBLE_FACES = [3, 5];

interface PipDieProps {
    value: number | null;
    size?: number;
    rolling?: boolean;
    landed?: boolean;
}

/** A parchment die with real pips. `value === null` renders a blank face. */
export function PipDie({ value, size = 60, rolling = false, landed = false }: PipDieProps) {
    const shown = PIPS[value ?? 0] || [];
    const { t } = useI18n();
    const pad = Math.round(size * 0.14);
    return (
        <div
            className={`hts-die ${rolling ? 'hts-tumble' : ''} ${landed ? 'hts-land' : ''}`}
            style={{ width: size, height: size, padding: pad }}
            role="img"
            aria-label={t.common.die(value ?? undefined)}
        >
            {Array.from({ length: 9 }).map((_, i) => (
                <span
                    key={i}
                    className={`hts-die-pip ${shown.includes(i) ? 'hts-die-pip--on' : ''}`}
                    style={{ margin: Math.max(1, Math.round(size * 0.035)) }}
                />
            ))}
        </div>
    );
}

interface DicePairProps {
    dice: [number, number] | null;
    rolling: boolean;
    size?: number;
}

export function DicePair({ dice, rolling, size = 60 }: DicePairProps) {
    if (rolling) {
        return (
            <div style={{ display: 'flex', gap: size * 0.22 }}>
                <PipDie value={TUMBLE_FACES[0]} size={size} rolling />
                <PipDie value={TUMBLE_FACES[1]} size={size} rolling />
            </div>
        );
    }
    return (
        <div style={{ display: 'flex', gap: size * 0.22 }}>
            <PipDie value={dice ? dice[0] : null} size={size} landed={!!dice} />
            <PipDie value={dice ? dice[1] : null} size={size} landed={!!dice} />
        </div>
    );
}

function randomFace(): number {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return (buffer[0] % 6) + 1;
}

/**
 * Rolls two dice on this client with a short tumble animation, then reports the sum.
 * The engine still receives the roll the same way it did with the old 3D dice.
 */
export function useLocalRoll(onResult: (sum: number, dice: [number, number]) => void) {
    const [dice, setDice] = useState<[number, number] | null>(null);
    const [rolling, setRolling] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const callback = useRef(onResult);

    useEffect(() => {
        callback.current = onResult;
    }, [onResult]);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    const roll = useCallback(() => {
        if (rolling) return;
        playSound('diceRoll');
        setRolling(true);
        setDice(null);
        timer.current = setTimeout(() => {
            const result: [number, number] = [randomFace(), randomFace()];
            setDice(result);
            setRolling(false);
            callback.current(result[0] + result[1], result);
        }, ROLL_DURATION_MS);
    }, [rolling]);

    const reset = useCallback(() => {
        setDice(null);
        setRolling(false);
    }, []);

    return { dice, rolling, roll, reset };
}
