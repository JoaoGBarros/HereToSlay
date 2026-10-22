import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { getCardArt } from '@/utils/CardArt';
import type { CardData, ModifierWindowData, PlayersMap, RollData } from '../../common/types';
import { signed, useWindowClock } from '../rolls/RollParts';
import '../rolls/stage.css';

export interface ModifierPreview {
    targetId: string;
    value: number;
}

interface ModifierPickerProps {
    window?: ModifierWindowData;
    rolls: RollData[];
    hand: CardData[];
    players: PlayersMap;
    me: string;
    /** "embedded" sits inside a 1440×900 Stage (duel); "dock" is fixed to the bottom of the board. */
    placement: 'embedded' | 'dock';
    onPlay: (cardId: number, value: number, targetId: string, guardianBonus: number) => void;
    onPass: () => void;
    /** Take back a pass while the window is still open. */
    onUnpass?: () => void;
    onPreview?: (preview: ModifierPreview | null) => void;
}

const RING = 2 * Math.PI * 27;

/** The Modifier window from the design: who is still reacting, your Modifier cards, value and target. */
function ModifierPicker({ window: w, rolls, hand, players, me, placement, onPlay, onPass, onUnpass, onPreview }: ModifierPickerProps) {
    const { t } = useI18n();
    const { left, fraction, seconds } = useWindowClock(w?.remainingMs ?? 0, w?.durationMs ?? 1);
    const modifiers = hand.filter((c) => c.type === 'MODIFIER');
    const [cardId, setCardId] = useState<number | null>(null);
    const [value, setValue] = useState<number | null>(null);
    const [target, setTarget] = useState('');
    const [guardian, setGuardian] = useState(0);
    const isGuardian = players[me]?.leader === 'GUARDIAN';
    const selected = modifiers.find((c) => c.cardId === cardId) ?? null;
    const options = useMemo(() => selected?.possibleValues ?? [], [selected]);
    const open = !!w && left > 0;
    const canReact = open && w.holders.includes(me) && !w.passed.includes(me);
    const canUnpass = open && !!onUnpass && w.holders.includes(me) && w.passed.includes(me);

    useEffect(() => {
        if (!selected) return;
        const v = options.includes(value ?? NaN) ? value! : options[0];
        if (v !== value) setValue(v);
        if (!target && w) {
            // Positive values usually help yourself, negative ones hurt the other roll.
            const mine = w.targets.find((pid) => pid === me);
            const other = w.targets.find((pid) => pid !== me);
            setTarget((v > 0 ? mine ?? other : other ?? mine) ?? w.targets[0] ?? '');
        }
    }, [selected, options, value, target, w, me]);

    useEffect(() => {
        onPreview?.(selected && value !== null && target ? { targetId: target, value: value + guardian } : null);
    }, [selected, value, target, guardian, onPreview]);

    const totalOf = (pid: string) => rolls.find((r) => r.rollerId === pid)?.total;

    function play() {
        if (!selected || value === null || !target) return;
        onPlay(selected.cardId, value, target, isGuardian ? guardian : 0);
        setCardId(null);
        setGuardian(0);
    }

    const btn = (on: boolean) => `modwin-opt ${on ? 'modwin-opt--on' : ''}`;

    return (
        <section className={`modwin modwin--${placement} hts-rise`} aria-label={t.modifier.aria}>
            <div className="modwin-left">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                        <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(243,234,214,.12)" strokeWidth="7" />
                        <circle cx="32" cy="32" r="27" fill="none" stroke="#e9b949" strokeWidth="7" strokeDasharray={RING} strokeDashoffset={RING * (1 - fraction)} strokeLinecap="round" transform="rotate(-90 32 32)" />
                        <text x="32" y="40" textAnchor="middle" fill="#f3d48a" fontFamily="Grenze,serif" fontWeight="800" fontSize="24">{open ? seconds : '–'}</text>
                    </svg>
                    <div style={{ lineHeight: 1.1 }}>
                        <div className="modwin-title">{t.engine.modifier.title}</div>
                        <div className="modwin-sub">{t.engine.modifier.seconds}</div>
                    </div>
                </div>
                <p className="modwin-intro">{t.engine.modifier.intro}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(w?.holders ?? []).filter((pid) => pid !== me).map((pid) => {
                        const passed = w?.passed.includes(pid);
                        return (
                            <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                <span style={{ fontWeight: 800 }}>{players[pid]?.username}</span>
                                <span style={{ fontWeight: 700, color: passed ? '#8e897e' : '#f3d48a' }}>{passed ? t.engine.modifier.passed : t.engine.modifier.thinking}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="modwin-mid">
                <span className="modwin-label">{t.engine.modifier.yours}</span>
                <div className="modwin-cards">
                    {modifiers.map((card) => {
                        const on = card.cardId === cardId;
                        const art = getCardArt(card);
                        return (
                            <button key={card.cardId} type="button" className={`modwin-card ${on ? 'modwin-card--on' : ''}`} aria-pressed={on} aria-label={card.cardName} disabled={!canReact}
                                onClick={() => { setCardId(on ? null : card.cardId); setTarget(''); }}>
                                {art ? <img src={art} alt="" /> : <span>{card.cardName}</span>}
                            </button>
                        );
                    })}
                    <div className="modwin-placeholder">{modifiers.length === 0 ? t.engine.modifier.noneHint : t.engine.modifier.dimmedHint}</div>
                </div>
            </div>

            <div className="modwin-right">
                {selected ? (
                    <>
                        <span className="modwin-label">{t.engine.modifier.value}</span>
                        <div className="modwin-grid">
                            {options.map((v) => <button key={v} type="button" className={btn(value === v)} onClick={() => setValue(v)}>{signed(v)}</button>)}
                        </div>
                        {isGuardian && (
                            <>
                                <span className="modwin-label">{t.engine.modifier.guardian}</span>
                                <div className="modwin-grid modwin-grid--3">
                                    {[-1, 0, 1].map((g) => <button key={g} type="button" className={btn(guardian === g)} onClick={() => setGuardian(g)}>{g === 0 ? '0' : signed(g)}</button>)}
                                </div>
                            </>
                        )}
                        <span className="modwin-label">{t.engine.modifier.target}</span>
                        <div className="modwin-grid">
                            {(w?.targets ?? []).map((pid) => (
                                <button key={pid} type="button" className={btn(target === pid)} onClick={() => setTarget(pid)}>
                                    {pid === me ? t.engine.modifier.mine : players[pid]?.username} ({totalOf(pid) ?? '–'})
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="modwin-hint">{canReact ? t.engine.modifier.pickHint : open ? t.engine.modifier.passedHint : t.engine.modifier.waitingHint}</p>
                )}
                <div className="modwin-actions">
                    {canUnpass ? (
                        <button type="button" className="modwin-pass" onClick={onUnpass}>{t.engine.modifier.unpass}</button>
                    ) : (
                        <button type="button" className="modwin-pass" disabled={!canReact} onClick={() => { setCardId(null); onPass(); }}>{t.engine.modifier.pass}</button>
                    )}
                    <button type="button" className="modwin-play" disabled={!canReact || !selected || value === null || !target} onClick={play}>{t.engine.modifier.play}</button>
                </div>
            </div>
        </section>
    );
}

export default ModifierPicker;
