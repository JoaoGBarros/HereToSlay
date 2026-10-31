import { useState } from 'react';
import { isMuted, setMuted } from '@/utils/SoundManager/SoundManager';
import { getMotionPref, setMotionPref } from '@/utils/motion';
import { useI18n } from '@/i18n';

interface TimerRingProps {
    /** 0..1 of time remaining. */
    fraction: number;
    size?: number;
    label?: string;
    color?: string;
}

export function TimerRing({ fraction, size = 56, label, color = 'var(--hts-gold)' }: TimerRingProps) {
    const { t } = useI18n();
    const stroke = Math.max(4, size * 0.11);
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(1, fraction));
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ? `${t.common.timeLeft}: ${label}` : t.common.timeLeft}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(243,234,214,.15)" strokeWidth={stroke} />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - clamped)}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset .25s linear' }}
            />
            {label && (
                <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="var(--hts-gold-text)" fontFamily="Grenze, serif" fontWeight={800} fontSize={size * 0.38}>
                    {label}
                </text>
            )}
        </svg>
    );
}

export type RangeZone = 'fail' | 'mid' | 'win';

interface RollRangeBarProps {
    zoneOf: (n: number) => RangeZone;
    mark?: number | null;
    height?: number;
}

/** 2..12 strip showing which totals fail, do nothing, or succeed. */
export function RollRangeBar({ zoneOf, mark, height = 44 }: RollRangeBarProps) {
    const cells = [];
    for (let n = 2; n <= 12; n++) {
        const marked = mark != null && (mark === n || (n === 2 && mark < 2) || (n === 12 && mark > 12));
        cells.push(
            <span
                key={n}
                className={`hts-range-cell hts-range-cell--${zoneOf(n)} ${marked ? 'hts-range-cell--mark' : ''}`}
                style={{ height, fontSize: height * 0.5 }}
            >
                {marked ? mark : n}
            </span>,
        );
    }
    return <div className="hts-range" aria-hidden="true">{cells}</div>;
}

export function ApPips({ current, max, size = 22 }: { current: number; max: number; size?: number }) {
    const { t } = useI18n();
    return (
        <div style={{ display: 'flex', gap: 6 }} role="img" aria-label={t.common.apAria(current, max)}>
            {Array.from({ length: Math.max(max, 0) }).map((_, i) => (
                <span
                    key={i}
                    style={{
                        width: size,
                        height: size,
                        boxSizing: 'border-box',
                        borderRadius: '50%',
                        background: i < current ? 'var(--hts-gold)' : 'transparent',
                        border: i < current ? 'none' : '2px solid rgba(243,234,214,.25)',
                        boxShadow: i < current ? 'inset 0 -3px 0 #a2771f, 0 0 12px rgba(233,185,73,.55)' : 'none',
                    }}
                />
            ))}
        </div>
    );
}

export function SoundToggle() {
    const [muted, setMutedState] = useState(isMuted());
    const { t } = useI18n();
    return (
        <button
            type="button"
            className="hts-icon-btn"
            aria-label={muted ? t.common.unmute : t.common.mute}
            aria-pressed={muted}
            onClick={() => {
                setMuted(!muted);
                setMutedState(!muted);
            }}
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4z" />
                {muted ? <path d="m16 9 6 6M22 9l-6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
            </svg>
        </button>
    );
}

export function MotionToggle() {
    const [reduced, setReduced] = useState(getMotionPref() === 'reduced');
    const { t } = useI18n();
    return (
        <button
            type="button"
            className="hts-icon-btn"
            aria-label={reduced ? t.common.motionOn : t.common.motionOff}
            title={reduced ? t.common.motionReduced : t.common.motionFull}
            aria-pressed={!reduced}
            onClick={() => {
                setMotionPref(reduced ? 'full' : 'reduced');
                setReduced(!reduced);
            }}
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z" />
                <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
                {reduced && <path d="M3 3l18 18" />}
            </svg>
        </button>
    );
}

export function Avatar({ name, color, size = 44, image }: { name: string; color: string; size?: number; image?: string }) {
    if (image) {
        return (
            <img
                src={image}
                alt=""
                style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 22%', boxShadow: `0 0 0 2px ${color}`, flex: 'none' }}
            />
        );
    }
    return (
        <span
            aria-hidden="true"
            style={{
                flex: 'none',
                width: size,
                height: size,
                borderRadius: size * 0.3,
                display: 'grid',
                placeItems: 'center',
                background: color,
                color: '#0d1315',
                fontFamily: 'var(--hts-font-display)',
                fontWeight: 800,
                fontSize: size * 0.55,
            }}
        >
            {(name || '?').charAt(0).toUpperCase()}
        </span>
    );
}
