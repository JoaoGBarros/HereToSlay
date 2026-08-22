import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/i18n';
import { GameCard } from '../../common/GameCard';
import { sendMessage, type CardData, type PlayersMap, type Socket } from '../../common/types';
import { TimerRing } from '../../common/Widgets';
import './css/ModifierPicker.css';

export interface ModifierWindowState {
    context: string;
    legalTargets: string[];
    durationMs: number;
}

function ModifierPicker({ window: modWindow, hand, playersData, me, socket, id, onPlay }: {
    window: ModifierWindowState;
    hand: CardData[];
    playersData: PlayersMap;
    me: string;
    socket: Socket;
    id: string | undefined;
    onPlay: () => void;
}) {
    const { t } = useI18n();
    const modifierCards = hand.filter((card) => card.type === 'MODIFIER');
    const [msLeft, setMsLeft] = useState(modWindow.durationMs);
    const [cardId, setCardId] = useState<number | null>(modifierCards[0]?.cardId ?? null);
    const [value, setValue] = useState<number | null>(null);
    const [target, setTarget] = useState<string | null>(modWindow.legalTargets.length === 1 ? modWindow.legalTargets[0] : null);

    useEffect(() => {
        const started = Date.now();
        setMsLeft(modWindow.durationMs);
        const interval = setInterval(() => {
            setMsLeft(Math.max(0, modWindow.durationMs - (Date.now() - started)));
        }, 200);
        return () => clearInterval(interval);
    }, [modWindow.durationMs, modWindow.context]);

    const selected = modifierCards.find((c) => c.cardId === cardId) || null;
    const options = useMemo(() => selected?.possibleValues || [], [selected]);

    useEffect(() => {
        if (selected && (value === null || !options.includes(value))) setValue(options[0] ?? null);
    }, [selected, options, value]);

    if (modifierCards.length === 0) return null;

    const canPlay = selected && value !== null && target !== null && msLeft > 0;

    function play() {
        if (!selected || value === null || !target) return;
        sendMessage(socket, {
            type: 'match',
            subtype: 'action',
            action: 'play_modifier',
            id,
            payload: { card_id: selected.cardId, chosen_value: value, target_player_id: target },
        });
        onPlay();
    }

    return (
        <section className="modtray hts-rise" role="dialog" aria-label={t.modifier.aria}>
            <div className="modtray-intro">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <TimerRing fraction={msLeft / modWindow.durationMs} size={58} label={String(Math.ceil(msLeft / 1000))} />
                    <div style={{ lineHeight: 1.1 }}>
                        <div className="hts-display" style={{ fontSize: 26 }}>{t.modifier.title}</div>
                        <div className="hts-muted" style={{ fontSize: 13 }}>{t.modifier.contexts[modWindow.context] || t.modifier.generic}</div>
                    </div>
                </div>
                <p className="hts-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
                    {t.modifier.intro}
                </p>
            </div>

            <div className="modtray-cards" role="radiogroup" aria-label={t.modifier.cardsAria}>
                {modifierCards.map((card) => (
                    <GameCard
                        key={card.cardId}
                        card={card}
                        width={120}
                        selectable
                        selected={card.cardId === cardId}
                        onClick={() => setCardId(card.cardId)}
                    />
                ))}
            </div>

            <div className="modtray-choices">
                <span className="hts-label">{t.modifier.value}</span>
                <div className="modtray-options">
                    {options.map((v) => (
                        <button key={v} type="button" aria-pressed={value === v} className={`modtray-opt ${value === v ? 'modtray-opt--on' : ''} ${v > 0 ? 'modtray-opt--plus' : 'modtray-opt--minus'}`} onClick={() => setValue(v)}>
                            {v > 0 ? `+${v}` : `−${Math.abs(v)}`}
                        </button>
                    ))}
                </div>
                <span className="hts-label">{t.modifier.onRollOf}</span>
                <div className="modtray-options">
                    {modWindow.legalTargets.map((pid) => (
                        <button key={pid} type="button" aria-pressed={target === pid} className={`modtray-opt ${target === pid ? 'modtray-opt--on' : ''}`} onClick={() => setTarget(pid)}>
                            {pid === me ? t.common.you : playersData[pid]?.username || pid}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                    <button type="button" className="hts-btn hts-btn--ghost" onClick={onPlay}>{t.modifier.pass}</button>
                    <button type="button" className="hts-btn" style={{ flex: 1 }} disabled={!canPlay} onClick={play}>{t.modifier.play}</button>
                </div>
            </div>
        </section>
    );
}

export default ModifierPicker;
